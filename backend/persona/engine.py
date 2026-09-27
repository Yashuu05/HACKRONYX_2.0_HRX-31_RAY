"""
Backend Persona Engine for SPECIFY (AI Cashflow Guardian).
Handles computation of derived financial persona metrics, forward income calendar scheduling,
database persistence across all 6 tables, and constants synchronization.
"""

import os
import sys
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date, timedelta
import calendar
from psycopg2.extras import RealDictCursor

# Ensure project root in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection


def format_inr(val: float) -> str:
    """Format float into Indian Rupee representation with 2 decimal places."""
    return f"{float(val):,.2f}"


def normalize_income_to_monthly(amount: float, frequency: str) -> float:
    """Normalizes income streams of varying frequencies to an expected monthly amount."""
    amt = max(0.0, float(amount or 0.0))
    freq = (frequency or "monthly").lower().strip()
    if freq == "weekly":
        return round(amt * 4.333, 2)
    elif freq == "biweekly":
        return round(amt * 2.166, 2)
    elif freq == "quarterly":
        return round(amt / 3.0, 2)
    elif freq in ("one_time", "irregular"):
        return amt
    else:  # monthly default
        return amt


def calculate_derived_persona_metrics(
    fixed_expenses: List[Dict[str, Any]],
    variable_expenses: List[Dict[str, Any]],
    income_sources: List[Dict[str, Any]],
    dependents: List[Dict[str, Any]],
    has_dependents: bool,
    is_primary_breadwinner: str,
    emergency_fund_preference: str,
    user_buffer_override: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes all derived metrics from raw persona inputs:
    - total_fixed_expense
    - total_variable_expense
    - total_expected_income
    - net_monthly_surplus
    - suggested_safety_buffer
    - risk_profile ('conservative', 'balanced', 'flexible')
    - spending_archetype ('saver', 'balanced', 'free_spender')
    - income_earliest_date, income_latest_date
    """
    # 1. Total Fixed Expenses
    total_fixed = 0.0
    for item in fixed_expenses:
        if item.get("is_active", True):
            total_fixed += max(0.0, float(item.get("amount") or 0.0))

    # Add fixed family support transfers from dependents
    total_dep_support = 0.0
    for dep in dependents:
        amt = max(0.0, float(dep.get("monthly_support_amount") or 0.0))
        total_dep_support += amt
        if dep.get("is_fixed_transfer", True):
            total_fixed += amt

    total_fixed = round(total_fixed, 2)

    # 2. Total Variable Expenses
    total_variable = 0.0
    for item in variable_expenses:
        if item.get("is_active", True):
            total_variable += max(0.0, float(item.get("expected_monthly_amount") or 0.0))
    total_variable = round(total_variable, 2)

    # 3. Total Expected Income (monthly normalized)
    total_income = 0.0
    credit_days: List[int] = []
    for inc in income_sources:
        if inc.get("is_active", True):
            amt = float(inc.get("expected_amount") or 0.0)
            freq = inc.get("frequency") or "monthly"
            total_income += normalize_income_to_monthly(amt, freq)
            c_day = inc.get("expected_credit_day")
            if c_day is not None and 1 <= int(c_day) <= 31:
                credit_days.append(int(c_day))

    total_income = round(total_income, 2)

    # 4. Net Monthly Surplus
    net_surplus = round(total_income - (total_fixed + total_variable), 2)

    # 5. Suggested Safety Buffer Calculation
    # Base: 20% of fixed commitments or minimum Rs. 2,000
    base_buffer = max(total_fixed * 0.20, 2000.0)
    
    # Dependent Cushion Multiplier
    breadwinner_mode = (is_primary_breadwinner or "no").lower().strip()
    if has_dependents and breadwinner_mode == "yes":
        buffer_multiplier = 1.50  # 50% extra cushion
    elif has_dependents:
        buffer_multiplier = 1.25  # 25% extra cushion
    else:
        buffer_multiplier = 1.0

    # Emergency Fund Preference factor
    pref = (emergency_fund_preference or "none").lower().strip()
    if pref == "1_month":
        base_buffer = max(base_buffer, total_fixed)
    elif pref == "2_months":
        base_buffer = max(base_buffer, total_fixed * 1.5)
    elif pref == "3_months":
        base_buffer = max(base_buffer, total_fixed * 2.0)

    suggested_buffer = round(base_buffer * buffer_multiplier, 2)

    # 6. Risk Profile Derivation ('conservative', 'balanced', 'flexible')
    surplus_ratio = (net_surplus / total_income) if total_income > 0 else 0.0
    dep_count = len(dependents) if has_dependents else 0

    if surplus_ratio < 0.15 or dep_count >= 2 or breadwinner_mode == "yes":
        risk_profile = "conservative"
    elif surplus_ratio > 0.40 and dep_count == 0:
        risk_profile = "flexible"
    else:
        risk_profile = "balanced"

    # 7. Spending Archetype ('saver', 'balanced', 'free_spender')
    variable_ratio = (total_variable / total_income) if total_income > 0 else 1.0
    if variable_ratio < 0.30 and surplus_ratio > 0.35:
        spending_archetype = "saver"
    elif variable_ratio > 0.60 or net_surplus <= 0:
        spending_archetype = "free_spender"
    else:
        spending_archetype = "balanced"

    earliest_date = min(credit_days) if credit_days else None
    latest_date = max(credit_days) if credit_days else None

    return {
        "total_fixed_expense": total_fixed,
        "total_variable_expense": total_variable,
        "total_expected_income": total_income,
        "net_monthly_surplus": net_surplus,
        "suggested_safety_buffer": suggested_buffer,
        "user_safety_buffer_override": user_buffer_override,
        "risk_profile": risk_profile,
        "spending_archetype": spending_archetype,
        "income_earliest_date": earliest_date,
        "income_latest_date": latest_date,
    }


def generate_forward_income_schedule(
    user_id: str,
    income_sources: List[Dict[str, Any]],
    cur
) -> int:
    """
    Generates forward 30-day calendar entries in 'persona_income_schedule' based on
    active scheduled income sources and their expected credit days.
    """
    # Clear existing pending schedule entries for fresh projection
    cur.execute(
        """
        DELETE FROM persona_income_schedule
        WHERE user_id = %s AND status = 'pending';
        """,
        (user_id,)
    )

    today = date.today()
    created_count = 0

    for source in income_sources:
        if not source.get("is_active", True):
            continue

        nature = source.get("stream_nature", "scheduled").lower()
        if nature != "scheduled":
            continue

        c_day = source.get("expected_credit_day")
        if not c_day or not (1 <= int(c_day) <= 31):
            continue

        c_day = int(c_day)
        source_id = source.get("income_source_id")
        amount = float(source.get("expected_amount") or 0.0)
        reliability = source.get("reliability", "always_on_time").lower()
        confidence = "high" if reliability == "always_on_time" else ("medium" if reliability == "occasionally_late" else "low")

        # Generate target date for this month and next month (within 30 days)
        candidate_dates = []

        # Target date in current month
        max_days_current = calendar.monthrange(today.year, today.month)[1]
        clamped_day_current = min(c_day, max_days_current)
        date_this_month = date(today.year, today.month, clamped_day_current)
        if date_this_month >= today:
            candidate_dates.append(date_this_month)

        # Target date in next month
        next_month_year = today.year + (1 if today.month == 12 else 0)
        next_month = 1 if today.month == 12 else today.month + 1
        max_days_next = calendar.monthrange(next_month_year, next_month)[1]
        clamped_day_next = min(c_day, max_days_next)
        date_next_month = date(next_month_year, next_month, clamped_day_next)
        if (date_next_month - today).days <= 35:
            candidate_dates.append(date_next_month)

        for scheduled_date in candidate_dates:
            cur.execute(
                """
                INSERT INTO persona_income_schedule (
                    user_id, income_source_id, expected_date, expected_amount,
                    date_confidence, status, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, 'pending', NOW(), NOW());
                """,
                (user_id, source_id, scheduled_date.isoformat(), amount, confidence)
            )
            created_count += 1

    return created_count


def sync_constants_table(user_id: str, safety_buffer: float, monthly_budget: float, cur):
    """
    Syncs the active safety buffer and budget with the legacy 'constants' table
    so that all existing dashboard widgets stay seamlessly synchronized.
    """
    weekly_budget = round(monthly_budget / 4.333, 2)
    int_month = max(0, int(round(monthly_budget)))
    int_week = max(0, int(round(weekly_budget)))
    int_buffer = max(0, int(round(safety_buffer)))

    cur.execute("SELECT constant_id FROM constants WHERE user_id = %s ORDER BY created_at DESC LIMIT 1;", (user_id,))
    row = cur.fetchone()
    if row:
        cur.execute(
            """
            UPDATE constants
            SET budget_month = %s, budget_week = %s, safety_buffer = %s, created_at = NOW()
            WHERE user_id = %s;
            """,
            (int_month, int_week, int_buffer, user_id)
        )
    else:
        cur.execute(
            """
            INSERT INTO constants (constant_id, user_id, budget_month, budget_week, safety_buffer, created_at)
            VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW());
            """,
            (user_id, int_month, int_week, int_buffer)
        )


def save_full_persona(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves or updates a full user persona and all its child tables atomically:
    1. user_persona (Master)
    2. persona_fixed_expenses
    3. persona_variable_expenses
    4. persona_income_sources
    5. persona_dependents
    6. persona_income_schedule (Generated)
    7. constants (Synchronized)
    """
    if not user_id:
        user_id = "usr-001"

    fixed_expenses = payload.get("fixed_expenses") or []
    variable_expenses = payload.get("variable_expenses") or []
    income_sources = payload.get("income_sources") or []
    dependents = payload.get("dependents") or []
    has_dependents = bool(payload.get("has_dependents", len(dependents) > 0))
    is_primary_breadwinner = str(payload.get("is_primary_breadwinner") or "no").lower()
    if is_primary_breadwinner not in ("yes", "no", "shared"):
        is_primary_breadwinner = "no"
    emergency_fund_preference = str(payload.get("emergency_fund_preference") or "none").lower()
    if emergency_fund_preference not in ("none", "1_month", "2_months", "3_months"):
        emergency_fund_preference = "none"
    user_buffer_override = payload.get("user_safety_buffer_override")
    if user_buffer_override is not None:
        user_buffer_override = float(user_buffer_override)

    # 1. Compute Derived Metrics
    derived = calculate_derived_persona_metrics(
        fixed_expenses=fixed_expenses,
        variable_expenses=variable_expenses,
        income_sources=income_sources,
        dependents=dependents,
        has_dependents=has_dependents,
        is_primary_breadwinner=is_primary_breadwinner,
        emergency_fund_preference=emergency_fund_preference,
        user_buffer_override=user_buffer_override
    )

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Ensure user exists in 'users' table to satisfy Foreign Key
        cur.execute(
            """
            INSERT INTO users (user_id, name)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO NOTHING;
            """,
            (user_id, "User " + user_id)
        )

        # Check existing version
        cur.execute("SELECT persona_version FROM user_persona WHERE user_id = %s;", (user_id,))
        existing_p = cur.fetchone()
        next_version = (existing_p["persona_version"] + 1) if existing_p else 1

        # 2. Upsert Master Record (user_persona)
        effective_buffer = user_buffer_override if user_buffer_override is not None else derived["suggested_safety_buffer"]

        cur.execute(
            """
            INSERT INTO user_persona (
                user_id, persona_version, total_fixed_expense, total_variable_expense,
                total_expected_income, net_monthly_surplus, suggested_safety_buffer,
                user_safety_buffer_override, has_dependents, number_of_dependents,
                is_primary_breadwinner, emergency_fund_preference, risk_profile,
                spending_archetype, income_earliest_date, income_latest_date,
                setup_completed, setup_step_reached, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, 5, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                persona_version = EXCLUDED.persona_version,
                total_fixed_expense = EXCLUDED.total_fixed_expense,
                total_variable_expense = EXCLUDED.total_variable_expense,
                total_expected_income = EXCLUDED.total_expected_income,
                net_monthly_surplus = EXCLUDED.net_monthly_surplus,
                suggested_safety_buffer = EXCLUDED.suggested_safety_buffer,
                user_safety_buffer_override = EXCLUDED.user_safety_buffer_override,
                has_dependents = EXCLUDED.has_dependents,
                number_of_dependents = EXCLUDED.number_of_dependents,
                is_primary_breadwinner = EXCLUDED.is_primary_breadwinner,
                emergency_fund_preference = EXCLUDED.emergency_fund_preference,
                risk_profile = EXCLUDED.risk_profile,
                spending_archetype = EXCLUDED.spending_archetype,
                income_earliest_date = EXCLUDED.income_earliest_date,
                income_latest_date = EXCLUDED.income_latest_date,
                setup_completed = TRUE,
                setup_step_reached = 5,
                updated_at = NOW()
            RETURNING persona_id::text;
            """,
            (
                user_id, next_version, derived["total_fixed_expense"], derived["total_variable_expense"],
                derived["total_expected_income"], derived["net_monthly_surplus"], derived["suggested_safety_buffer"],
                user_buffer_override, has_dependents, len(dependents) if has_dependents else 0,
                is_primary_breadwinner, emergency_fund_preference, derived["risk_profile"],
                derived["spending_archetype"], derived["income_earliest_date"], derived["income_latest_date"]
            )
        )
        persona_row = cur.fetchone()
        persona_id = persona_row["persona_id"]

        # 3. Replace Fixed Expenses
        cur.execute("DELETE FROM persona_fixed_expenses WHERE user_id = %s;", (user_id,))
        for fe in fixed_expenses:
            amt = max(0.0, float(fe.get("amount") or 0.0))
            if amt <= 0 and not fe.get("label"):
                continue
            cat = str(fe.get("category") or "other").lower().strip()
            if cat not in ('rent', 'emi', 'utility', 'subscription', 'insurance', 'academic', 'family_support', 'other'):
                cat = "other"
            c_due = fe.get("due_day_of_month")
            due_day = int(c_due) if c_due and 1 <= int(c_due) <= 31 else None
            pm = str(fe.get("payment_mode") or "auto_debit").lower().strip()
            if pm not in ('auto_debit', 'upi', 'net_banking', 'cash', 'cheque'):
                pm = "auto_debit"

            cur.execute(
                """
                INSERT INTO persona_fixed_expenses (
                    user_id, label, category, amount, due_day_of_month,
                    due_day_buffer, payment_mode, is_active, notes, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW());
                """,
                (
                    user_id, fe.get("label") or "Fixed Outflow", cat, amt, due_day,
                    int(fe.get("due_day_buffer") or 0), pm, fe.get("is_active", True), fe.get("notes")
                )
            )

        # 4. Replace Variable Expenses
        cur.execute("DELETE FROM persona_variable_expenses WHERE user_id = %s;", (user_id,))
        for ve in variable_expenses:
            amt = max(0.0, float(ve.get("expected_monthly_amount") or 0.0))
            if amt <= 0 and not ve.get("label"):
                continue
            cat = str(ve.get("category") or "other").lower().strip()
            if cat not in ('food', 'transport', 'leisure', 'shopping', 'medical', 'travel', 'self_dev', 'other'):
                cat = "other"

            cur.execute(
                """
                INSERT INTO persona_variable_expenses (
                    user_id, label, category, expected_monthly_amount,
                    min_amount, max_amount, is_active, notes, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW());
                """,
                (
                    user_id, ve.get("label") or "Variable Lifestyle", cat, amt,
                    float(ve.get("min_amount")) if ve.get("min_amount") is not None else None,
                    float(ve.get("max_amount")) if ve.get("max_amount") is not None else None,
                    ve.get("is_active", True), ve.get("notes")
                )
            )

        # 5. Replace Income Sources
        cur.execute("DELETE FROM persona_income_sources WHERE user_id = %s;", (user_id,))
        saved_income_sources = []
        for inc in income_sources:
            amt = max(0.0, float(inc.get("expected_amount") or 0.0))
            if amt <= 0 and not inc.get("source_name"):
                continue
            itype = str(inc.get("income_type") or "salary").lower().strip()
            if itype not in ('salary', 'stipend', 'freelance', 'family_transfer', 'pension', 'part_time', 'commission', 'business', 'gift', 'savings_withdrawal', 'other'):
                itype = "other"
            snature = str(inc.get("stream_nature") or "scheduled").lower().strip()
            if snature not in ('scheduled', 'variable'):
                snature = "scheduled"
            freq = str(inc.get("frequency") or "monthly").lower().strip()
            if freq not in ('monthly', 'weekly', 'biweekly', 'quarterly', 'one_time', 'irregular'):
                freq = "monthly"
            c_day = inc.get("expected_credit_day")
            credit_day = int(c_day) if c_day and 1 <= int(c_day) <= 31 else None
            rel = str(inc.get("reliability") or "always_on_time").lower().strip()
            if rel not in ('always_on_time', 'occasionally_late', 'irregular'):
                rel = "always_on_time"
            pmode = str(inc.get("payment_mode") or "bank_transfer").lower().strip()
            if pmode not in ('bank_transfer', 'upi', 'cash', 'cheque'):
                pmode = "bank_transfer"

            cur.execute(
                """
                INSERT INTO persona_income_sources (
                    user_id, source_name, income_type, stream_nature, expected_amount,
                    frequency, expected_credit_day, credit_day_buffer, payment_mode,
                    reliability, employer_or_source, is_active, notes, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING income_source_id::text, expected_credit_day, expected_amount, stream_nature, reliability, is_active;
                """,
                (
                    user_id, inc.get("source_name") or "Primary Income", itype, snature, amt,
                    freq, credit_day, int(inc.get("credit_day_buffer") or 2), pmode,
                    rel, inc.get("employer_or_source"), inc.get("is_active", True), inc.get("notes")
                )
            )
            saved_inc = cur.fetchone()
            if saved_inc:
                saved_income_sources.append(dict(saved_inc))

        # 6. Replace Dependents
        cur.execute("DELETE FROM persona_dependents WHERE user_id = %s;", (user_id,))
        for dep in dependents:
            rel = str(dep.get("relationship") or "other").lower().strip()
            if rel not in ('spouse', 'child', 'parent', 'sibling', 'other'):
                rel = "other"
            age = dep.get("age_group")
            if age and age.lower().strip() in ('child', 'adult', 'senior'):
                age = age.lower().strip()
            else:
                age = None
            support_amt = max(0.0, float(dep.get("monthly_support_amount") or 0.0))

            cur.execute(
                """
                INSERT INTO persona_dependents (
                    user_id, relationship, age_group, monthly_support_amount,
                    is_fixed_transfer, notes, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW());
                """,
                (user_id, rel, age, support_amt, dep.get("is_fixed_transfer", True), dep.get("notes"))
            )

        # 7. Generate Forward Income Schedule for next 30 days
        schedule_count = generate_forward_income_schedule(
            user_id=user_id,
            income_sources=saved_income_sources,
            cur=cur
        )

        # 8. Synchronize Constants table (safety_buffer, budget_month, budget_week)
        total_monthly_budget = round(derived["total_fixed_expense"] + derived["total_variable_expense"], 2)
        sync_constants_table(
            user_id=user_id,
            safety_buffer=effective_buffer,
            monthly_budget=total_monthly_budget,
            cur=cur
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Financial Persona successfully configured and saved!",
            "persona_id": persona_id,
            "user_id": user_id,
            "persona_version": next_version,
            "derived_metrics": derived,
            "schedule_entries_generated": schedule_count
        }

    except Exception as e:
        conn.rollback()
        print(f"[Persona Engine Error] save_full_persona failed: {e}")
        raise e
    finally:
        cur.close()
        conn.close()


def get_full_persona(user_id: str) -> Dict[str, Any]:
    """Retrieves full persona record with all itemized child tables from PostgreSQL."""
    if not user_id:
        user_id = "usr-001"

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Master Persona
        cur.execute("SELECT * FROM user_persona WHERE user_id = %s;", (user_id,))
        master = cur.fetchone()

        if not master:
            return {
                "status": "not_configured",
                "setup_completed": False,
                "user_id": user_id,
                "persona": None,
                "fixed_expenses": [],
                "variable_expenses": [],
                "income_sources": [],
                "dependents": [],
                "income_schedule": []
            }

        # 2. Fixed Expenses
        cur.execute(
            """
            SELECT fixed_expense_id::text, label, category, amount, due_day_of_month,
                   due_day_buffer, payment_mode, is_active, notes
            FROM persona_fixed_expenses
            WHERE user_id = %s
            ORDER BY amount DESC;
            """,
            (user_id,)
        )
        fixed_expenses = [dict(r) for r in cur.fetchall()]

        # 3. Variable Expenses
        cur.execute(
            """
            SELECT variable_expense_id::text, label, category, expected_monthly_amount,
                   min_amount, max_amount, is_active, notes
            FROM persona_variable_expenses
            WHERE user_id = %s
            ORDER BY expected_monthly_amount DESC;
            """,
            (user_id,)
        )
        variable_expenses = [dict(r) for r in cur.fetchall()]

        # 4. Income Sources
        cur.execute(
            """
            SELECT income_source_id::text, source_name, income_type, stream_nature,
                   expected_amount, min_amount, max_amount, frequency, expected_credit_day,
                   credit_day_buffer, payment_mode, reliability, employer_or_source, is_active, notes
            FROM persona_income_sources
            WHERE user_id = %s
            ORDER BY expected_amount DESC;
            """,
            (user_id,)
        )
        income_sources = [dict(r) for r in cur.fetchall()]

        # 5. Dependents
        cur.execute(
            """
            SELECT dependent_id::text, relationship, age_group, monthly_support_amount,
                   is_fixed_transfer, notes
            FROM persona_dependents
            WHERE user_id = %s
            ORDER BY monthly_support_amount DESC;
            """,
            (user_id,)
        )
        dependents = [dict(r) for r in cur.fetchall()]

        # 6. Income Schedule (Upcoming 30 days)
        cur.execute(
            """
            SELECT schedule_id::text, expected_date::text, expected_amount, date_confidence, status
            FROM persona_income_schedule
            WHERE user_id = %s AND expected_date >= CURRENT_DATE
            ORDER BY expected_date ASC;
            """,
            (user_id,)
        )
        schedule = [dict(r) for r in cur.fetchall()]

        master_dict = dict(master)
        # Convert numeric and uuid fields
        master_dict["persona_id"] = str(master_dict["persona_id"])
        master_dict["total_fixed_expense"] = float(master_dict["total_fixed_expense"])
        master_dict["total_variable_expense"] = float(master_dict["total_variable_expense"])
        master_dict["total_expected_income"] = float(master_dict["total_expected_income"])
        master_dict["net_monthly_surplus"] = float(master_dict["net_monthly_surplus"] or 0)
        master_dict["suggested_safety_buffer"] = float(master_dict["suggested_safety_buffer"])
        if master_dict.get("user_safety_buffer_override") is not None:
            master_dict["user_safety_buffer_override"] = float(master_dict["user_safety_buffer_override"])

        return {
            "status": "success",
            "setup_completed": bool(master_dict.get("setup_completed")),
            "user_id": user_id,
            "persona": master_dict,
            "fixed_expenses": fixed_expenses,
            "variable_expenses": variable_expenses,
            "income_sources": income_sources,
            "dependents": dependents,
            "income_schedule": schedule
        }

    finally:
        cur.close()
        conn.close()


def get_user_income_schedule(user_id: str) -> List[Dict[str, Any]]:
    """Returns the forward income calendar events for forecasting."""
    if not user_id:
        user_id = "usr-001"

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(
            """
            SELECT 
                s.schedule_id::text,
                s.expected_date::text,
                s.expected_amount,
                s.date_confidence,
                s.status,
                i.source_name,
                i.income_type
            FROM persona_income_schedule s
            LEFT JOIN persona_income_sources i ON s.income_source_id = i.income_source_id
            WHERE s.user_id = %s AND s.expected_date >= CURRENT_DATE
            ORDER BY s.expected_date ASC;
            """,
            (user_id,)
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        cur.close()
        conn.close()


def update_top_level_persona(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Updates top-level fields such as manual buffer override or breadwinner status."""
    if not user_id:
        user_id = "usr-001"

    allowed_fields = [
        "user_safety_buffer_override",
        "emergency_fund_preference",
        "is_primary_breadwinner"
    ]
    set_clauses = []
    params = []

    for k, v in updates.items():
        if k in allowed_fields:
            set_clauses.append(f"{k} = %s")
            params.append(v)

    if not set_clauses:
        return get_full_persona(user_id)

    set_clauses.append("updated_at = NOW()")
    params.append(user_id)

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(
            f"UPDATE user_persona SET {', '.join(set_clauses)} WHERE user_id = %s RETURNING persona_id::text;",
            tuple(params)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return recompute_persona(user_id)


def recompute_persona(user_id: str) -> Dict[str, Any]:
    """Recomputes all derived metrics and forward schedule from current database items."""
    full = get_full_persona(user_id)
    if full.get("status") != "success" or not full.get("persona"):
        return full

    payload = {
        "fixed_expenses": full.get("fixed_expenses", []),
        "variable_expenses": full.get("variable_expenses", []),
        "income_sources": full.get("income_sources", []),
        "dependents": full.get("dependents", []),
        "has_dependents": full["persona"].get("has_dependents", False),
        "is_primary_breadwinner": full["persona"].get("is_primary_breadwinner", "no"),
        "emergency_fund_preference": full["persona"].get("emergency_fund_preference", "none"),
        "user_safety_buffer_override": full["persona"].get("user_safety_buffer_override")
    }

    return save_full_persona(user_id=user_id, payload=payload)
