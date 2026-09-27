"""
What-If Pre-Purchase Counterfactual Simulator Engine
Project: SPECIFY (AI Cashflow Guardian)

Calculates the deterministic mathematical consequence of a hypothetical discretionary
purchase against real Neon PostgreSQL database telemetry:
1. Dual-Timeline Counterfactual Trajectory (Baseline vs. Simulated)
2. Safe-to-Swipe Decision Score (0–100)
3. Smart Compromise & Time-Shift Calculator (Delay Days, Safe Price Ceiling, Burn Cut)
"""

import os
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from psycopg2.extras import RealDictCursor

# Ensure workspace root in path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection


def format_inr(val: float) -> str:
    """Format float into Indian Rupee representation with 2 decimal places."""
    return f"{float(val):,.2f}"


def fetch_user_constants(user_id: str) -> Dict[str, float]:
    """Fetch user-configured constants from PostgreSQL 'constants' table with safe defaults."""
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
                "budget_month": float(row.get("budget_month") or 10000.0),
                "budget_week": float(row.get("budget_week") or 5000.0),
                "safety_buffer": float(row.get("safety_buffer") or 3000.0),
            }
        return {
            "budget_month": 10000.0,
            "budget_week": 5000.0,
            "safety_buffer": 3000.0,
        }
    finally:
        cur.close()
        conn.close()


def generate_groq_smart_recommendation(
    amount: float,
    category: str,
    verdict: str,
    score: float,
    current_balance: float,
    simulated_balance: float,
    safety_buffer: float,
    safe_price_ceiling: float,
    days_to_breach: Optional[int],
    delay_days: Optional[int]
) -> str:
    """
    Generates a concise 2-sentence conversational recommendation using Groq (openai/gpt-oss-120b).
    Strictly grounded in provided calculations with instant deterministic fallback.
    """
    # Deterministic base recommendation
    if verdict == "SAFE_TO_SWIPE":
        deterministic_rec = (
            f"You can safely afford this ₹{format_inr(amount)} {category} purchase today. "
            f"Your projected balance of ₹{format_inr(simulated_balance)} leaves your ₹{format_inr(safety_buffer)} emergency buffer intact."
        )
    elif verdict == "PROCEED_WITH_CAUTION":
        deterministic_rec = (
            f"This ₹{format_inr(amount)} purchase consumes your remaining Safe-to-Spend buffer. "
            f"If you proceed, freeze non-essential dining and shopping for the next 4 days."
        )
    else:
        if delay_days:
            deterministic_rec = (
                f"High shortfall risk detected: This purchase causes a deficit in {days_to_breach} day(s). "
                f"Delay this purchase by {delay_days} day(s) until your scheduled income clears to keep your buffer protected."
            )
        else:
            deterministic_rec = (
                f"High shortfall risk: This purchase causes an emergency buffer breach in {days_to_breach or 1} day(s). "
                f"Consider a safe alternative capped at ₹{format_inr(safe_price_ceiling)}."
            )

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return deterministic_rec

    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatGroq(
            model="openai/gpt-oss-120b",
            groq_api_key=groq_key,
            temperature=0.2,
            max_retries=1,
            request_timeout=4
        )

        prompt = f"""
        User wants to buy an item of ₹{amount} (Category: {category}).
        Financial Facts:
        - Current Liquid Balance: ₹{current_balance}
        - Post-Purchase Balance: ₹{simulated_balance}
        - Configured Safety Buffer: ₹{safety_buffer}
        - Safe-to-Swipe Score: {score}/100 ({verdict})
        - Safe Price Ceiling: ₹{safe_price_ceiling}
        - Days to Buffer Breach: {days_to_breach if days_to_breach is not None else 'None (Safe)'}
        - Recommended Delay: {delay_days if delay_days else 'None needed'}

        Task: Provide exactly 2 short sentences of coaching advice. Do not use generic filler. Mention exact numbers.
        """

        messages = [
            SystemMessage(content="You are SPECIFY Financial Copilot. Provide exactly 2 short, empathetic, mathematically grounded sentences."),
            HumanMessage(content=prompt)
        ]

        response = llm.invoke(messages)
        res_text = response.content.strip()
        if res_text and len(res_text) > 20:
            return res_text
        return deterministic_rec

    except Exception as e:
        print(f"[What-If Simulator Groq Notice] Using deterministic recommendation: {e}")
        return deterministic_rec


def run_what_if_simulation(
    user_id: str,
    amount: float,
    category: str = "Shopping",
    description: Optional[str] = "Prospective Purchase",
    horizon_days: int = 14
) -> Dict[str, Any]:
    """
    Executes real-time counterfactual simulation against Neon PostgreSQL telemetry.
    Returns dual-timeline trajectories, Safe-to-Swipe score, and smart compromises.
    """
    if not user_id:
        user_id = "usr-001"

    amount = max(0.0, float(amount or 0.0))
    horizon_days = max(7, min(30, int(horizon_days or 14)))

    constants = fetch_user_constants(user_id)
    budget_week = constants["budget_week"]
    budget_month = constants["budget_month"]
    safety_buffer = constants["safety_buffer"]

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Fetch current real net balance from transactions
        cur.execute(
            """
            SELECT 
                COALESCE(SUM(CASE WHEN activity_type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN activity_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
                COUNT(*) AS total_count
            FROM transactions
            WHERE user_id = %s;
            """,
            (user_id,)
        )
        balance_row = cur.fetchone() or {}
        total_income = float(balance_row.get("total_income") or 0.0)
        total_expense = float(balance_row.get("total_expense") or 0.0)
        total_count = int(balance_row.get("total_count") or 0)

        if total_count == 0 and total_income == 0 and total_expense == 0:
            return {
                "status": "no_data",
                "message": "no data available",
                "user_id": user_id,
                "current_balance": 0.0,
                "simulated_balance": 0.0,
                "safety_buffer": safety_buffer,
                "safe_to_swipe_score": 0.0,
                "verdict": "NO_DATA",
                "verdict_title": "No Data Available",
                "verdict_message": "No transaction records found in the database. Please add initial transactions to simulate purchases.",
                "dual_trajectory": [],
                "smart_compromise": {
                    "delay_days": None,
                    "safe_price_ceiling": 0.0,
                    "daily_burn_cut": 0.0,
                    "recommendation": "no data available"
                }
            }

        net_balance = round(total_income - total_expense, 2)

        # 2. Fetch committed bills in next 7-14 days (protected status or rent/mess)
        today_iso = date.today().isoformat()
        horizon_end_iso = (date.today() + timedelta(days=horizon_days)).isoformat()

        cur.execute(
            """
            SELECT description, category, amount, transaction_date::text AS tx_date, activity_type
            FROM transactions
            WHERE user_id = %s
              AND transaction_date >= %s
              AND transaction_date <= %s
            ORDER BY transaction_date ASC;
            """,
            (user_id, today_iso, horizon_end_iso)
        )
        scheduled_events = cur.fetchall() or []

        # Committed bills in the next 7 days
        seven_days_end_iso = (date.today() + timedelta(days=7)).isoformat()
        cur.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS bills_7d
            FROM transactions
            WHERE user_id = %s
              AND activity_type = 'expense'
              AND (status = 'Protected' OR LOWER(category) LIKE '%%rent%%' OR LOWER(category) LIKE '%%mess%%' OR LOWER(category) LIKE '%%hostel%%' OR LOWER(category) LIKE '%%tuition%%')
              AND transaction_date >= %s
              AND transaction_date <= %s;
            """,
            (user_id, today_iso, seven_days_end_iso)
        )
        bills_row = cur.fetchone() or {}
        bills_7d = float(bills_row.get("bills_7d") or 0.0)

        # 3. Discretionary Daily Burn Rate (30-day baseline)
        thirty_days_ago_iso = (date.today() - timedelta(days=30)).isoformat()
        cur.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS disc_spend
            FROM transactions
            WHERE user_id = %s 
              AND activity_type = 'expense'
              AND category NOT IN ('Rent', 'Mess & Hostel', 'Hostel Fee', 'Tuition')
              AND transaction_date >= %s;
            """,
            (user_id, thirty_days_ago_iso)
        )
        disc_row = cur.fetchone() or {}
        disc_total = float(disc_row.get("disc_spend") or 0.0)
        daily_burn = round(disc_total / 30.0, 2)
        if daily_burn <= 0:
            daily_burn = round(budget_week / 7.0, 2)

    finally:
        cur.close()
        conn.close()

    # 4. Generate Dual-Timeline Trajectory (Baseline vs. Simulated)
    dual_trajectory: List[Dict[str, Any]] = []
    
    current_base = net_balance
    current_sim = round(net_balance - amount, 2)

    # Group scheduled events by day offset
    events_by_date: Dict[str, Dict[str, float]] = {}
    for ev in scheduled_events:
        d_str = ev["tx_date"]
        if d_str not in events_by_date:
            events_by_date[d_str] = {"inflow": 0.0, "outflow": 0.0}
        amt = float(ev["amount"])
        if ev["activity_type"] == "income":
            events_by_date[d_str]["inflow"] += amt
        else:
            events_by_date[d_str]["outflow"] += amt

    sim_days_to_breach: Optional[int] = None
    sim_max_deficit: float = 0.0
    sim_breach_date: Optional[str] = None
    earliest_income_delay: Optional[int] = None

    for day_idx in range(1, horizon_days + 1):
        target_date = date.today() + timedelta(days=day_idx)
        date_str = target_date.isoformat()
        day_label = target_date.strftime("%b %d")

        ev = events_by_date.get(date_str, {"inflow": 0.0, "outflow": 0.0})
        inflow = ev["inflow"]
        outflow = ev["outflow"]

        # Check if scheduled inflow makes purchase safe if delayed to this day
        if inflow > 0 and earliest_income_delay is None:
            if (current_base + inflow - amount) >= safety_buffer:
                earliest_income_delay = day_idx

        # Baseline Step
        if outflow > 0:
            current_base = round(current_base + inflow - outflow, 2)
        else:
            current_base = round(current_base + inflow - daily_burn, 2)

        # Simulated Step
        if outflow > 0:
            current_sim = round(current_sim + inflow - outflow, 2)
        else:
            current_sim = round(current_sim + inflow - daily_burn, 2)

        # Track simulated breach
        if current_sim < safety_buffer:
            if sim_days_to_breach is None:
                sim_days_to_breach = day_idx
                sim_breach_date = date_str
            deficit = round(safety_buffer - current_sim, 2)
            if deficit > sim_max_deficit:
                sim_max_deficit = deficit

        dual_trajectory.append({
            "day": day_idx,
            "date": date_str,
            "label": day_label,
            "baseline_balance": current_base,
            "simulated_balance": current_sim,
            "safety_buffer": safety_buffer,
            "is_breached": current_sim < safety_buffer,
            "deficit": max(0.0, round(safety_buffer - current_sim, 2))
        })

    # Immediate breach on Day 0
    sim_start_balance = round(net_balance - amount, 2)
    if sim_start_balance < safety_buffer and sim_days_to_breach is None:
        sim_days_to_breach = 0
        sim_breach_date = today_iso
        sim_max_deficit = round(safety_buffer - sim_start_balance, 2)

    # 5. Compute Safe-to-Swipe Score
    safe_surplus_sim = round(sim_start_balance - safety_buffer - bills_7d, 2)
    safe_price_ceiling = max(0.0, round(net_balance - safety_buffer - bills_7d, 2))

    # Delta Risk Penalty
    risk_penalty = 0.0
    if sim_days_to_breach is not None:
        depth_penalty = min(50.0, (sim_max_deficit / (safety_buffer + 1.0)) * 40.0)
        urgency_penalty = max(0.0, (15 - sim_days_to_breach) * 2.5)
        risk_penalty = depth_penalty + urgency_penalty

    surplus_component = (safe_surplus_sim / (safety_buffer + 1.0)) * 50.0
    raw_score = 50.0 + surplus_component - risk_penalty
    safe_to_swipe_score = round(max(0.0, min(100.0, raw_score)), 1)

    # If starting balance is already below buffer, cap score strictly
    if net_balance < safety_buffer:
        safe_to_swipe_score = min(safe_to_swipe_score, 15.0)

    # 6. Assign Verdict & Messages
    if safe_to_swipe_score >= 85.0:
        verdict = "SAFE_TO_SWIPE"
        verdict_title = "Safe to Swipe"
        verdict_message = (
            f"Zero shortfall risk. Your emergency buffer remains protected with "
            f"₹{format_inr(max(0.0, safe_surplus_sim))} safe surplus remaining."
        )
    elif safe_to_swipe_score >= 50.0:
        verdict = "PROCEED_WITH_CAUTION"
        verdict_title = "Proceed with Caution"
        verdict_message = (
            f"Safe-to-Spend drops to ₹0.00. You have enough to cover this, but discretionary "
            f"spending must freeze for the next few days to protect your buffer."
        )
    else:
        verdict = "CRITICAL_SHORTFALL_RISK"
        verdict_title = "High Shortfall Risk"
        if sim_days_to_breach == 0:
            verdict_message = (
                f"Critical buffer breach: This purchase immediately pushes your balance "
                f"₹{format_inr(sim_max_deficit)} below your emergency safety buffer (₹{format_inr(safety_buffer)})."
            )
        else:
            verdict_message = (
                f"Deficit predicted: In {sim_days_to_breach} day(s), your balance will drop "
                f"₹{format_inr(sim_max_deficit)} below your safety buffer on {sim_breach_date}."
            )

    # 7. Compute Smart Compromises (Time-Shift, Price Ceiling, Daily Burn Cut)
    daily_burn_cut = 0.0
    if sim_days_to_breach and sim_days_to_breach > 0:
        daily_burn_cut = round(sim_max_deficit / float(sim_days_to_breach), 2)

    ai_recommendation = generate_groq_smart_recommendation(
        amount=amount,
        category=category,
        verdict=verdict,
        score=safe_to_swipe_score,
        current_balance=net_balance,
        simulated_balance=sim_start_balance,
        safety_buffer=safety_buffer,
        safe_price_ceiling=safe_price_ceiling,
        days_to_breach=sim_days_to_breach,
        delay_days=earliest_income_delay
    )

    return {
        "status": "success",
        "user_id": user_id,
        "amount": amount,
        "category": category,
        "description": description or "Prospective Purchase",
        "safe_to_swipe_score": safe_to_swipe_score,
        "verdict": verdict,
        "verdict_title": verdict_title,
        "verdict_message": verdict_message,
        "current_balance": net_balance,
        "simulated_balance": sim_start_balance,
        "safety_buffer": safety_buffer,
        "safe_price_ceiling": safe_price_ceiling,
        "safe_surplus": safe_surplus_sim,
        "days_to_breach": sim_days_to_breach,
        "max_deficit": sim_max_deficit,
        "daily_burn_baseline": daily_burn,
        "smart_compromise": {
            "delay_days": earliest_income_delay,
            "safe_price_ceiling": safe_price_ceiling,
            "daily_burn_cut": daily_burn_cut,
            "recommendation": ai_recommendation
        },
        "dual_trajectory": dual_trajectory
    }
