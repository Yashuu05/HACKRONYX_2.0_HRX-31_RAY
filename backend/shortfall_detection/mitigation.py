from typing import Dict, Any, List


def generate_mitigation_strategies(
    analysis_data: Dict[str, Any],
    reasoning_data: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Rule-Based Prevention & Mitigation Strategy Generator.
    
    Provides concrete, mathematical action plans to mitigate detected shortfall risks:
    1. Safe-to-Spend Daily Ceiling Clamp.
    2. Discretionary Expense Deferral.
    3. Buffer Reserve Utilization & Recovery Plan.
    """
    is_shortfall = analysis_data.get("is_shortfall_predicted", False)
    if not is_shortfall:
        return []

    current_balance = analysis_data.get("current_balance", 0.0)
    safety_buffer = analysis_data.get("safety_buffer", 3000.0)
    deficit = analysis_data.get("max_shortfall_deficit", 0.0)
    days_to_shortfall = analysis_data.get("days_until_shortfall", 7) or 7
    daily_burn = analysis_data.get("daily_burn_rate", 700.0)

    strategies: List[Dict[str, Any]] = []

    # 1. Strategy A: Safe-to-Spend Clamp Strategy
    # Calculate clamped daily budget ceiling over the shortfall horizon
    safe_surplus = max(0.0, current_balance - safety_buffer)
    clamped_daily_limit = round(safe_surplus / max(1, days_to_shortfall), 2)
    daily_reduction = round(max(0.0, daily_burn - clamped_daily_limit), 2)

    strategies.append({
        "id": "strategy_clamp_budget",
        "title": "Enforce Daily Safe-to-Spend Cap",
        "category": "Immediate Prevention",
        "impact_label": f"Saves ~₹{daily_reduction * days_to_shortfall:,.2f} over {days_to_shortfall} days",
        "description": f"Cap daily non-essential spend to ₹{clamped_daily_limit:,.2f}/day (a reduction of ₹{daily_reduction:,.2f}/day) until shortfall window passes.",
        "action_type": "apply_clamp",
        "recommended_daily_limit": clamped_daily_limit
    })

    # 2. Strategy B: Discretionary Expense Postponement
    strategies.append({
        "id": "strategy_defer_expenses",
        "title": "Postpone Discretionary Shopping & Travel",
        "category": "Expense Management",
        "impact_label": f"Frees up ₹{deficit:,.2f} liquidity deficit",
        "description": f"Defer non-essential purchases (clothing, electronics, subscriptions) until after your next scheduled stipend or income credit.",
        "action_type": "review_discretionary",
        "recommended_daily_limit": None
    })

    # 3. Strategy C: Buffer Drawdown with Scheduled Payback
    if current_balance > 0:
        buffer_draw = round(min(deficit, safety_buffer * 0.5), 2)
        strategies.append({
            "id": "strategy_buffer_draw",
            "title": "Controlled Emergency Buffer Draw",
            "category": "Buffer Management",
            "impact_label": f"Provides ₹{buffer_draw:,.2f} emergency relief",
            "description": f"Temporarily utilize ₹{buffer_draw:,.2f} from your safety reserve for mandatory payments, with automatic replenishment over the next 14 days.",
            "action_type": "use_buffer",
            "recommended_daily_limit": None
        })

    return strategies
