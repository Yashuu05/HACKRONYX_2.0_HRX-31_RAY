"""
Alert Engine for SPECIFY — Condition-Based Alerts & Neon DB Alerts Table Integration.

Audits real-time transactions and user constants to evaluate, record, and retrieve alerts:
1. NET_BALANCE_BELOW_WEEKLY_BUDGET (mid)
2. NET_BALANCE_BELOW_MONTHLY_BUDGET (low)
3. SAFETY_BUFFER_BREACH_IMMINENT (critical)
4. WEEKLY_BUDGET_OVERRUN (high)
5. HIGH_DISCRETIONARY_BURN_RATE (mid)
6. LARGE_ANOMALOUS_EXPENSE (high)
7. SAFE_TO_SPEND_EXHAUSTED (high)
"""

import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from psycopg2.extras import RealDictCursor

# Ensure project root in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection


def format_inr(val: float) -> str:
    """Format float into Indian Rupee representation with 2 decimal places."""
    return f"{float(val):,.2f}"


def get_user_constants(user_id: str) -> Dict[str, float]:
    """Fetch user constants from PostgreSQL 'constants' table with safe defaults."""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(
            """
            SELECT budget_month, budget_week, safety_buffer
            FROM constants
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 1;
            """,
            (user_id,)
        )
        row = cur.fetchone()
        if row:
            return {
                "budget_month": float(row.get("budget_month") or 10000),
                "budget_week": float(row.get("budget_week") or 5000),
                "safety_buffer": float(row.get("safety_buffer") or 3000),
            }
        return {
            "budget_month": 10000.0,
            "budget_week": 5000.0,
            "safety_buffer": 3000.0,
        }
    finally:
        cur.close()
        conn.close()


def evaluate_and_record_alerts(user_id: str, trigger_tx: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Evaluates condition-based alerts for user_id against current database metrics.
    Inserts newly triggered alerts into the 'alerts' table, avoiding duplicate unread spam.
    Returns list of newly inserted or currently active unread alerts.
    """
    if not user_id:
        user_id = "usr-001"

    constants = get_user_constants(user_id)
    budget_week = constants["budget_week"]
    budget_month = constants["budget_month"]
    safety_buffer = constants["safety_buffer"]

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Compute total income, total spendings, and net balance from transactions table
        cur.execute(
            """
            SELECT 
                COALESCE(SUM(CASE WHEN activity_type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN activity_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
            FROM transactions
            WHERE user_id = %s;
            """,
            (user_id,)
        )
        summary_row = cur.fetchone() or {}
        total_income = float(summary_row.get("total_income") or 0.0)
        total_expense = float(summary_row.get("total_expense") or 0.0)
        net_balance = round(total_income - total_expense, 2)

        # 2. Compute 7-day trailing spend (rolling weekly spend)
        seven_days_ago = (date.today() - timedelta(days=7)).isoformat()
        cur.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS week_spend
            FROM transactions
            WHERE user_id = %s 
              AND activity_type = 'expense'
              AND transaction_date >= %s;
            """,
            (user_id, seven_days_ago)
        )
        week_row = cur.fetchone() or {}
        week_spend = float(week_row.get("week_spend") or 0.0)

        # 3. Discretionary daily burn velocity (excluding protected commitments like rent/mess)
        cur.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS disc_spend
            FROM transactions
            WHERE user_id = %s 
              AND activity_type = 'expense'
              AND category NOT IN ('Mess & Hostel', 'Rent', 'Hostel Fee', 'Tuition')
              AND transaction_date >= %s;
            """,
            (user_id, (date.today() - timedelta(days=30)).isoformat())
        )
        disc_row = cur.fetchone() or {}
        disc_total = float(disc_row.get("disc_spend") or 0.0)
        daily_burn = round(disc_total / 30.0, 2)
        daily_burn_baseline = round(budget_week / 7.0, 2)

        # 4. Safe-to-Spend (lowest point - protected bills - safety buffer)
        protected_commitments = 1200.0  # rent + mess reserve
        safe_to_spend = max(0.0, net_balance - protected_commitments - safety_buffer)

        # Candidate Alerts to Evaluate
        candidate_alerts: List[Dict[str, Any]] = []

        # Condition 1: SAFETY_BUFFER_BREACH_IMMINENT (Critical)
        if net_balance < safety_buffer:
            deficit = round(safety_buffer - net_balance, 2)
            candidate_alerts.append({
                "alert_level": "critical",
                "alert_type": "SAFETY_BUFFER_BREACH_IMMINENT",
                "message": (
                    f"CRITICAL: Bank balance (₹{format_inr(net_balance)}) has breached your configured "
                    f"Safety Buffer (₹{format_inr(safety_buffer)}). Deficit is ₹{format_inr(deficit)}. "
                    "Emergency spend freeze advised."
                )
            })

        # Condition 2: NET_BALANCE_BELOW_WEEKLY_BUDGET (Mid)
        if net_balance < budget_week and net_balance >= safety_buffer:
            candidate_alerts.append({
                "alert_level": "mid",
                "alert_type": "NET_BALANCE_BELOW_WEEKLY_BUDGET",
                "message": (
                    f"Net balance (₹{format_inr(net_balance)}) is currently below your weekly budget "
                    f"allowance of ₹{format_inr(budget_week)}. Throttle non-essential spending."
                )
            })

        # Condition 3: NET_BALANCE_BELOW_MONTHLY_BUDGET (Low)
        if net_balance < budget_month and net_balance >= budget_week:
            candidate_alerts.append({
                "alert_level": "low",
                "alert_type": "NET_BALANCE_BELOW_MONTHLY_BUDGET",
                "message": (
                    f"Current reserves (₹{format_inr(net_balance)}) are below your monthly target "
                    f"of ₹{format_inr(budget_month)}. Monitor upcoming commitments."
                )
            })

        # Condition 4: WEEKLY_BUDGET_OVERRUN (High)
        if week_spend > budget_week:
            overrun = round(week_spend - budget_week, 2)
            candidate_alerts.append({
                "alert_level": "high",
                "alert_type": "WEEKLY_BUDGET_OVERRUN",
                "message": (
                    f"Weekly budget exceeded! You spent ₹{format_inr(week_spend)} in the last 7 days "
                    f"against your ₹{format_inr(budget_week)} allocation (+₹{format_inr(overrun)})."
                )
            })

        # Condition 5: LARGE_ANOMALOUS_EXPENSE (High)
        # Evaluates trigger transaction or latest transaction if large
        check_tx = trigger_tx
        if not check_tx:
            cur.execute(
                """
                SELECT amount, description, activity_type
                FROM transactions
                WHERE user_id = %s AND activity_type = 'expense'
                ORDER BY transaction_date DESC, created_at DESC
                LIMIT 1;
                """,
                (user_id,)
            )
            latest_row = cur.fetchone()
            if latest_row:
                check_tx = dict(latest_row)

        if check_tx and str(check_tx.get("activity_type", "")).lower() == "expense":
            tx_amt = float(check_tx.get("amount") or 0.0)
            tx_desc = str(check_tx.get("description") or "Recent Debit")
            # If transaction is >= 40% of safety buffer OR >= 35% of net balance
            if tx_amt >= (0.4 * safety_buffer) or (net_balance > 0 and tx_amt >= (0.35 * net_balance)):
                pct_buffer = round((tx_amt / (safety_buffer + 1.0)) * 100)
                candidate_alerts.append({
                    "alert_level": "high",
                    "alert_type": "LARGE_ANOMALOUS_EXPENSE",
                    "message": (
                        f"Large expense alert: Transaction of ₹{format_inr(tx_amt)} ('{tx_desc}') "
                        f"absorbed {pct_buffer}% of your configured emergency safety buffer."
                    )
                })

        # Condition 6: SAFE_TO_SPEND_EXHAUSTED (High)
        if safe_to_spend <= 0.0 and net_balance > 0:
            candidate_alerts.append({
                "alert_level": "high",
                "alert_type": "SAFE_TO_SPEND_EXHAUSTED",
                "message": (
                    f"Safe-to-Spend is ₹0.00 today. All remaining cash (₹{format_inr(net_balance)}) "
                    f"is fully locked for protected bills (₹{format_inr(protected_commitments)}) and safety buffer."
                )
            })

        # Condition 7: HIGH_DISCRETIONARY_BURN_RATE (Mid)
        if daily_burn > (daily_burn_baseline * 1.5) and daily_burn_baseline > 0:
            candidate_alerts.append({
                "alert_level": "mid",
                "alert_type": "HIGH_DISCRETIONARY_BURN_RATE",
                "message": (
                    f"Spending velocity surge: Your recent discretionary burn is ₹{format_inr(daily_burn)}/day, "
                    f"which is 50% above your sustainable rate of ₹{format_inr(daily_burn_baseline)}/day."
                )
            })

        # 5. Insert candidate alerts with deduplication (cooldown logic)
        inserted_alerts: List[Dict[str, Any]] = []

        for candidate in candidate_alerts:
            # Deduplication Check: don't insert duplicate if an unread alert of the same type exists
            cur.execute(
                """
                SELECT alert_id::text
                FROM alerts
                WHERE user_id = %s 
                  AND alert_type = %s 
                  AND is_read = FALSE;
                """,
                (user_id, candidate["alert_type"])
            )
            existing = cur.fetchone()

            if not existing:
                cur.execute(
                    """
                    INSERT INTO alerts (user_id, alert_level, alert_type, message, is_read, created_at)
                    VALUES (%s, %s, %s, %s, FALSE, NOW())
                    RETURNING alert_id::text, user_id, alert_level, alert_type, message, is_read, created_at;
                    """,
                    (user_id, candidate["alert_level"], candidate["alert_type"], candidate["message"])
                )
                new_row = cur.fetchone()
                if new_row:
                    inserted_alerts.append(dict(new_row))
            else:
                # Optionally refresh the message of the existing unread alert with latest live numbers
                cur.execute(
                    """
                    UPDATE alerts
                    SET message = %s, created_at = NOW()
                    WHERE alert_id = %s
                    RETURNING alert_id::text, user_id, alert_level, alert_type, message, is_read, created_at;
                    """,
                    (candidate["message"], existing["alert_id"])
                )
                updated_row = cur.fetchone()
                if updated_row:
                    inserted_alerts.append(dict(updated_row))

        conn.commit()
        return inserted_alerts

    except Exception as e:
        print(f"[Alert Engine Error] evaluate_and_record_alerts failed: {e}")
        conn.rollback()
        return []
    finally:
        cur.close()
        conn.close()


def get_user_alerts(user_id: str, unread_only: bool = False, limit: int = 50) -> Dict[str, Any]:
    """Retrieve stored alerts from Neon PostgreSQL for user_id with unread count."""
    if not user_id:
        user_id = "usr-001"

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Get unread count
        cur.execute(
            """
            SELECT COUNT(*) AS unread_count
            FROM alerts
            WHERE user_id = %s AND is_read = FALSE;
            """,
            (user_id,)
        )
        count_row = cur.fetchone() or {}
        unread_count = int(count_row.get("unread_count") or 0)

        # Query alerts list
        query = """
            SELECT 
                alert_id::text,
                user_id,
                alert_level,
                alert_type,
                message,
                is_read,
                created_at::text as created_at
            FROM alerts
            WHERE user_id = %s
        """
        params = [user_id]
        if unread_only:
            query += " AND is_read = FALSE"
        query += " ORDER BY created_at DESC LIMIT %s;"
        params.append(limit)

        cur.execute(query, tuple(params))
        rows = cur.fetchall() or []

        return {
            "status": "success",
            "user_id": user_id,
            "unread_count": unread_count,
            "total_count": len(rows),
            "alerts": [dict(r) for r in rows]
        }
    finally:
        cur.close()
        conn.close()


def mark_alert_read(alert_id: str) -> bool:
    """Mark a specific alert as read."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            UPDATE alerts
            SET is_read = TRUE
            WHERE alert_id = %s;
            """,
            (alert_id,)
        )
        updated = cur.rowcount > 0
        conn.commit()
        return updated
    finally:
        cur.close()
        conn.close()


def mark_all_alerts_read(user_id: str) -> int:
    """Mark all unread alerts for a user as read."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            UPDATE alerts
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE;
            """,
            (user_id,)
        )
        count = cur.rowcount
        conn.commit()
        return count
    finally:
        cur.close()
        conn.close()


def delete_alert(alert_id: str) -> bool:
    """Delete a specific alert record."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM alerts WHERE alert_id = %s;", (alert_id,))
        deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        cur.close()
        conn.close()
