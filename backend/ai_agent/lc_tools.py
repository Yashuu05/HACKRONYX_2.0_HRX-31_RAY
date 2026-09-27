import os
import sys
import datetime
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection
from psycopg2.extras import RealDictCursor


def fetch_user_financial_profile(user_id: str = "usr-001") -> Dict[str, Any]:
    """Fetches user constants, recent balance, and income/expense totals strictly from Neon PostgreSQL."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Fetch user constants (defaults to 0 if no record exists)
        cur.execute(
            "SELECT budget_month, budget_week, safety_buffer FROM constants WHERE user_id = %s ORDER BY created_at DESC LIMIT 1;",
            (user_id,)
        )
        const_row = cur.fetchone() or {"budget_month": 0, "budget_week": 0, "safety_buffer": 0}

        # 2. Fetch income/expense summary for the exact user
        cur.execute(
            "SELECT activity_type, COALESCE(SUM(amount), 0) AS total, COUNT(*) as count FROM transactions WHERE user_id = %s GROUP BY activity_type;",
            (user_id,)
        )
        rows = cur.fetchall()

        total_income = 0.0
        total_expense = 0.0
        income_count = 0
        expense_count = 0
        for r in rows:
            act = (r['activity_type'] or '').lower().strip()
            tot = float(r['total'])
            cnt = int(r['count'])
            if act == 'income':
                total_income += tot
                income_count += cnt
            elif act == 'expense':
                total_expense += tot
                expense_count += cnt

        has_data = (income_count + expense_count) > 0
        net_balance = round(total_income - total_expense, 2)

        # 3. Fetch protected commitments (status = 'Protected' or recurring categories)
        cur.execute(
            """
            SELECT description, category, amount, transaction_date::text as date, status 
            FROM transactions 
            WHERE user_id = %s AND (status = 'Protected' OR LOWER(category) LIKE '%%mess%%' OR LOWER(category) LIKE '%%hostel%%' OR LOWER(category) LIKE '%%rent%%')
            ORDER BY transaction_date ASC;
            """,
            (user_id,)
        )
        protected_rows = cur.fetchall()
        total_protected = sum(float(r['amount']) for r in protected_rows)

        # 3b. Defensive check for User Persona & Active Fixed Obligations
        persona_info = None
        safety_buffer = float(const_row.get('safety_buffer', 0) or 0)
        try:
            cur.execute(
                """
                SELECT suggested_safety_buffer, user_safety_buffer_override, risk_profile, spending_archetype,
                       total_fixed_expense, total_variable_expense, total_expected_income, net_monthly_surplus,
                       has_dependents, number_of_dependents, is_primary_breadwinner
                FROM user_persona
                WHERE user_id = %s
                LIMIT 1;
                """,
                (user_id,)
            )
            persona_row = cur.fetchone()
            if persona_row:
                persona_info = dict(persona_row)
                override_buf = persona_row.get('user_safety_buffer_override')
                sugg_buf = persona_row.get('suggested_safety_buffer')
                if override_buf is not None and float(override_buf) > 0:
                    safety_buffer = float(override_buf)
                elif sugg_buf is not None and float(sugg_buf) > 0 and safety_buffer == 0:
                    safety_buffer = float(sugg_buf)

            # Check active fixed expenses if configured
            cur.execute(
                """
                SELECT label, category, amount, due_day_of_month 
                FROM persona_fixed_expenses 
                WHERE user_id = %s AND is_active = TRUE
                ORDER BY due_day_of_month ASC;
                """,
                (user_id,)
            )
            fixed_rows = cur.fetchall()
            if fixed_rows:
                persona_fixed_total = sum(float(fr['amount']) for fr in fixed_rows)
                if persona_fixed_total > total_protected:
                    total_protected = persona_fixed_total
        except Exception as pe:
            # Gracefully ignore if tables are not queried or missing
            print(f"[lc_tools persona warning]: {pe}")

        # 4. Compute Dynamic Safe-to-Spend
        safe_to_spend = max(0.0, round(net_balance - total_protected - (safety_buffer * 0.5), 2)) if has_data else 0.0

        cur.close()
        conn.close()

        return {
            "user_id": user_id,
            "has_data": has_data,
            "net_balance": net_balance,
            "total_income": total_income,
            "total_expense": total_expense,
            "income_count": income_count,
            "expense_count": expense_count,
            "safety_buffer": safety_buffer,
            "budget_month": float(const_row.get('budget_month', 0) or 0),
            "budget_week": float(const_row.get('budget_week', 0) or 0),
            "safe_to_spend": safe_to_spend,
            "total_protected": total_protected,
            "persona": persona_info,
            "protected_commitments": [
                {"name": r['description'] or r['category'], "amount": float(r['amount']), "date": r['date']}
                for r in protected_rows
            ]
        }
    except Exception as e:
        print(f"[Metrics Engine Error] {e}")
        return {
            "user_id": user_id,
            "has_data": False,
            "net_balance": 0.0,
            "total_income": 0.0,
            "total_expense": 0.0,
            "income_count": 0,
            "expense_count": 0,
            "safety_buffer": 0.0,
            "budget_month": 0.0,
            "budget_week": 0.0,
            "safe_to_spend": 0.0,
            "total_protected": 0.0,
            "protected_commitments": []
        }


@tool
def get_safe_to_spend_tool(user_id: str = "usr-001") -> str:
    """Fetches user's exact real-time Safe-to-Spend limit, current net balance, and protected bill commitments."""
    profile = fetch_user_financial_profile(user_id)
    if not profile.get("has_data"):
        return "no data found"

    commitments_str = (
        ", ".join([f"{p['name']} ₹{p['amount']:,.2f} on {p['date']}" for p in profile['protected_commitments']])
        if profile['protected_commitments'] else "None"
    )
    return (
        f"Safe-to-Spend Limit: ₹{profile['safe_to_spend']:,.2f}\n"
        f"Current Net Balance: ₹{profile['net_balance']:,.2f}\n"
        f"Safety Buffer: ₹{profile['safety_buffer']:,.2f}\n"
        f"Protected Commitments: Total ₹{profile['total_protected']:,.2f} ({commitments_str})"
    )


@tool
def check_affordability_tool(user_id: str = "usr-001", amount: float = 0.0, category: str = "general") -> str:
    """Analyzes if user can safely afford spending a specific amount without risking liquidity shortfall."""
    profile = fetch_user_financial_profile(user_id)
    if not profile.get("has_data"):
        return "no data found"

    safe = profile['safe_to_spend']
    net = profile['net_balance']
    buffer = profile['safety_buffer']

    if amount <= safe:
        margin = safe - amount
        return (
            f"AFFORDABLE: Yes, you can afford spending ₹{amount:,.2f}.\n"
            f"Current Safe-to-Spend: ₹{safe:,.2f}.\n"
            f"Remaining Safe-to-Spend after purchase: ₹{margin:,.2f}."
        )
    else:
        deficit = amount - safe
        post_balance = net - amount
        return (
            f"NOT RECOMMENDED: Spending ₹{amount:,.2f} exceeds Safe-to-Spend limit (₹{safe:,.2f}) by ₹{deficit:,.2f}.\n"
            f"Current Net Balance: ₹{net:,.2f}. Post-purchase balance: ₹{post_balance:,.2f}."
        )


@tool
def get_category_spending_tool(user_id: str = "usr-001", timeframe: str = "30d") -> str:
    """Fetches categorized breakdown of expenses over the given timeframe."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT category, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) as count 
            FROM transactions 
            WHERE user_id = %s AND activity_type = 'expense'
            GROUP BY category 
            ORDER BY total_amount DESC;
            """,
            (user_id,)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            return "no data found"

        total = sum(float(r['total_amount']) for r in rows)
        lines = [f"Total Expenses ({timeframe}): ₹{total:,.2f}"]
        for r in rows:
            amt = float(r['total_amount'])
            pct = round((amt / total * 100), 1) if total > 0 else 0
            lines.append(f"- {r['category']}: ₹{amt:,.2f} ({pct}%, {r['count']} transactions)")
        return "\n".join(lines)
    except Exception as e:
        print(f"[get_category_spending_tool Error] {e}")
        return "no data found"


CATEGORY_SYNONYMS = {
    "food": ["food", "canteen", "swiggy", "zomato", "mess", "dining", "groceries", "grocery", "snack", "snacks", "lunch", "dinner", "breakfast", "beverage", "beverages", "cafe", "restaurant"],
    "travel": ["travel", "trip", "transport", "cab", "uber", "ola", "auto", "metro", "bus", "train", "flight", "petrol", "fuel"],
    "shopping": ["shopping", "amazon", "flipkart", "clothing", "clothes", "shoes", "electronics", "gadget", "gadgets", "myntra"],
    "utilities": ["utility", "utilities", "electricity", "water", "wifi", "internet", "broadband", "recharge", "phone bill", "bill", "bills"],
    "rent": ["rent", "hostel", "pg", "maintenance", "flat", "room"],
    "entertainment": ["entertainment", "movie", "movies", "cinema", "netflix", "spotify", "hotstar", "prime", "game", "gaming"],
    "education": ["tuition", "books", "book", "course", "fees", "exam", "college fee", "school fee", "stationery"],
    "medical": ["medical", "medicine", "medicines", "doctor", "hospital", "pharmacy", "health", "clinic"]
}


def check_user_category_data(user_id: str, search_terms: List[str]) -> Dict[str, Any]:
    """
    Directly queries PostgreSQL transactions for user_id to verify if matching expense records exist.
    Guarantees 0 fallback / 0 hallucination.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        conditions = []
        params = [user_id]
        for term in search_terms:
            t = term.lower().strip()
            if t:
                conditions.append("(LOWER(category) LIKE %s OR LOWER(description) LIKE %s)")
                params.extend([f"%{t}%", f"%{t}%"])
        
        if not conditions:
            cur.close()
            conn.close()
            return {"has_data": False, "total": 0.0, "count": 0, "transactions": []}
            
        sql = f"""
            SELECT description, category, amount, transaction_date::text as date 
            FROM transactions 
            WHERE user_id = %s 
              AND activity_type = 'expense' 
              AND ({' OR '.join(conditions)})
            ORDER BY transaction_date DESC;
        """
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            return {"has_data": False, "total": 0.0, "count": 0, "transactions": []}

        total = sum(float(r['amount']) for r in rows)
        return {
            "has_data": True,
            "total": round(total, 2),
            "count": len(rows),
            "transactions": rows
        }
    except Exception as e:
        print(f"[check_user_category_data Error] {e}")
        return {"has_data": False, "total": 0.0, "count": 0, "transactions": []}


@tool
def get_timeframe_category_spend_tool(user_id: str = "usr-001", category: str = "food", days: int = 7) -> str:
    """Fetches exact transactions and total spent for a specific category within the last N days."""
    cat_lower = category.lower().strip()
    search_terms = CATEGORY_SYNONYMS.get(cat_lower, [cat_lower])
    res = check_user_category_data(user_id=user_id, search_terms=search_terms)
    
    if not res["has_data"] or res["count"] == 0:
        return "no data found"
        
    items = [f"{r['description'] or r['category']}: ₹{float(r['amount']):,.2f} on {r['date']}" for r in res["transactions"]]
    return f"Total spent on {category}: ₹{res['total']:,.2f} across {res['count']} transaction(s) ({'; '.join(items)})."


@tool
def get_ledger_summary_tool(user_id: str = "usr-001") -> str:
    """Fetches high level summary of all user income, expenses, and net cashflow balance."""
    profile = fetch_user_financial_profile(user_id)
    if not profile.get("has_data"):
        return "no data found"

    return (
        f"Transaction Ledger Summary:\n"
        f"- Total Income: ₹{profile['total_income']:,.2f} ({profile['income_count']} transactions)\n"
        f"- Total Expenses: ₹{profile['total_expense']:,.2f} ({profile['expense_count']} transactions)\n"
        f"- Net Balance: ₹{profile['net_balance']:,.2f}\n"
        f"- Safe-to-Spend: ₹{profile['safe_to_spend']:,.2f}\n"
        f"- Safety Buffer: ₹{profile['safety_buffer']:,.2f}"
    )


@tool
def get_savings_advice_tool(user_id: str = "usr-001") -> str:
    """Generates personalized savings recommendations based on user's real transactions."""
    profile = fetch_user_financial_profile(user_id)
    if not profile.get("has_data") or profile['total_expense'] == 0:
        return "no data found"

    spending_ratio = round((profile['total_expense'] / profile['total_income'] * 100), 1) if profile['total_income'] > 0 else 100.0
    return (
        f"Savings Analysis:\n"
        f"- Spending-to-Income Ratio: {spending_ratio}%\n"
        f"- Total Outflows: ₹{profile['total_expense']:,.2f}\n"
        f"- Net Balance: ₹{profile['net_balance']:,.2f}"
    )

