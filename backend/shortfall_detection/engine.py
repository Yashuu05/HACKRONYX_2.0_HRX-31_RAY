import datetime
from typing import Dict, Any, List, Optional
from psycopg2.extras import RealDictCursor
from db.database import get_db_connection


def calculate_shortfall_trajectory(
    user_id: str = "usr-001",
    horizon_days: int = 14
) -> Dict[str, Any]:
    """
    Mathematical Shortfall Trajectory Engine.
    
    Formulas & Logic:
    1. Fetches User Constants (Safety Buffer S_buffer, Weekly Budget W_budget, Monthly Budget M_budget).
    2. Computes Current Net Balance B_t = Total Income - Total Spendings.
    3. Calculates 14-day rolling trajectory:
       B(tau) = B(tau-1) + Scheduled_Income(tau) - Scheduled_Expenses(tau) - (W_budget / 7)
    4. Triggers Shortfall warning if B(tau) < S_buffer.
    5. Computes Shortfall Depth Delta = S_buffer - B(tau) and Risk Index R_shortfall (0 - 100).
    """
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Fetch User Constants from Neon PostgreSQL 'constants' table
        cur.execute(
            """
            SELECT budget_month, budget_week, safety_buffer 
            FROM constants 
            WHERE user_id = %s 
            ORDER BY created_at DESC LIMIT 1;
            """,
            (user_id,)
        )
        const_row = cur.fetchone()
        
        safety_buffer = float(const_row['safety_buffer']) if const_row and const_row.get('safety_buffer') is not None else 3000.0
        budget_week = float(const_row['budget_week']) if const_row and const_row.get('budget_week') is not None else 5000.0
        budget_month = float(const_row['budget_month']) if const_row and const_row.get('budget_month') is not None else 10000.0

        daily_burn_baseline = round(budget_week / 7.0, 2)

        # 2. Compute Net Balance from 'transactions' table (total_income - total_spendings)
        cur.execute(
            """
            SELECT activity_type, COALESCE(SUM(amount), 0) AS total, COUNT(*) as cnt
            FROM transactions
            WHERE user_id = %s
            GROUP BY activity_type;
            """,
            (user_id,)
        )
        summary_rows = cur.fetchall()

        total_income = 0.0
        total_expense = 0.0
        total_tx_count = 0
        for r in summary_rows:
            act = (r['activity_type'] or '').lower().strip()
            tot = float(r['total'] or 0.0)
            cnt = int(r.get('cnt') or 0)
            total_tx_count += cnt
            if act == 'income':
                total_income += tot
            elif act == 'expense':
                total_expense += tot

        current_balance = round(total_income - total_expense, 2)

        has_enough_data = total_tx_count > 0

        # If zero transactions in DB, user has no data to forecast
        if not has_enough_data:
            return {
                "user_id": user_id,
                "horizon_days": horizon_days,
                "has_enough_data": False,
                "current_balance": 0.0,
                "safety_buffer": safety_buffer,
                "weekly_budget": budget_week,
                "monthly_budget": budget_month,
                "daily_burn_rate": 0.0,
                "is_shortfall_predicted": False,
                "risk_score": 0.0,
                "risk_level": "SAFE",
                "days_until_shortfall": None,
                "shortfall_date": None,
                "max_shortfall_deficit": 0.0,
                "trajectory": []
            }

        # 3. Fetch future scheduled / protected transactions within horizon
        today = datetime.date.today()
        end_date = today + datetime.timedelta(days=horizon_days)

        cur.execute(
            """
            SELECT 
                activity_type, 
                category, 
                amount, 
                description, 
                transaction_date::text as transaction_date, 
                status
            FROM transactions
            WHERE user_id = %s 
              AND transaction_date > %s 
              AND transaction_date <= %s
            ORDER BY transaction_date ASC;
            """,
            (user_id, today.isoformat(), end_date.isoformat())
        )
        future_txs = cur.fetchall()

        # Map future transactions by date
        future_tx_by_date: Dict[str, List[dict]] = {}
        for tx in future_txs:
            d_str = tx['transaction_date']
            if d_str not in future_tx_by_date:
                future_tx_by_date[d_str] = []
            future_tx_by_date[d_str].append({
                'activity_type': tx['activity_type'],
                'category': tx['category'],
                'amount': float(tx['amount']),
                'description': tx['description'],
                'status': tx['status']
            })

        # 4. Project Day-by-Day Trajectory for T days
        trajectory = []
        running_bal = current_balance
        
        first_shortfall_day: Optional[int] = None
        first_shortfall_date: Optional[str] = None
        max_shortfall_depth = 0.0

        for day_idx in range(1, horizon_days + 1):
            target_date = today + datetime.timedelta(days=day_idx)
            target_date_str = target_date.isoformat()

            day_income = 0.0
            day_expense = 0.0

            # Process scheduled transactions for this day
            if target_date_str in future_tx_by_date:
                for tx in future_tx_by_date[target_date_str]:
                    amt = tx['amount']
                    if tx['activity_type'] == 'income':
                        day_income += amt
                    else:
                        day_expense += amt

            # Add daily discretionary baseline burn
            day_expense += daily_burn_baseline

            # Net day change
            net_day_change = day_income - day_expense
            running_bal = round(running_bal + net_day_change, 2)

            # Check shortfall trigger condition: B(tau) < Safety Buffer
            is_shortfall = running_bal < safety_buffer
            shortfall_deficit = round(safety_buffer - running_bal, 2) if is_shortfall else 0.0

            if is_shortfall:
                if first_shortfall_day is None:
                    first_shortfall_day = day_idx
                    first_shortfall_date = target_date_str
                if shortfall_deficit > max_shortfall_depth:
                    max_shortfall_depth = shortfall_deficit

            trajectory.append({
                'day': day_idx,
                'date': target_date_str,
                'projected_balance': running_bal,
                'scheduled_income': day_income,
                'scheduled_expense': round(day_expense, 2),
                'safety_buffer': safety_buffer,
                'is_shortfall': is_shortfall,
                'shortfall_deficit': shortfall_deficit
            })

        # 5. Risk Score Computation R_shortfall in range [0, 100]
        is_shortfall_predicted = first_shortfall_day is not None

        if not is_shortfall_predicted:
            risk_score = 0.0
            risk_level = "SAFE"
        else:
            # Depth severity score (max 50 points)
            depth_score = (max_shortfall_depth / (safety_buffer + 1.0)) * 50.0
            # Proximity urgency score (max 50 points)
            urgency_score = max(0.0, (15 - first_shortfall_day)) * 3.5
            
            raw_score = depth_score + urgency_score
            risk_score = round(min(100.0, max(15.0, raw_score)), 1)

            if risk_score >= 60.0:
                risk_level = "CRITICAL"
            else:
                risk_level = "MODERATE"

        return {
            "user_id": user_id,
            "horizon_days": horizon_days,
            "current_balance": current_balance,
            "safety_buffer": safety_buffer,
            "weekly_budget": budget_week,
            "monthly_budget": budget_month,
            "daily_burn_rate": daily_burn_baseline,
            "is_shortfall_predicted": is_shortfall_predicted,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "days_until_shortfall": first_shortfall_day,
            "shortfall_date": first_shortfall_date,
            "max_shortfall_deficit": max_shortfall_depth,
            "trajectory": trajectory
        }

    finally:
        cur.close()
        conn.close()
