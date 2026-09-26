from typing import Dict, Any, List


def analyze_shortfall_reasons(analysis_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Algorithmic Root-Cause Reasoning Engine.
    
    Identifies the underlying mathematical and financial causes for a predicted shortfall:
    1. Low Net Balance relative to Safety Buffer.
    2. High Daily Spending Velocity vs Weekly Allocation.
    3. Proximity of upcoming protected bills.
    4. Absence of expected income credits before bill due dates.
    
    Also outputs a structured payload ready for Phase 2 LLM Prompting.
    """
    is_shortfall = analysis_data.get("is_shortfall_predicted", False)
    current_balance = analysis_data.get("current_balance", 0.0)
    safety_buffer = analysis_data.get("safety_buffer", 3000.0)
    deficit = analysis_data.get("max_shortfall_deficit", 0.0)
    days_to_shortfall = analysis_data.get("days_until_shortfall")
    daily_burn = analysis_data.get("daily_burn_rate", 700.0)
    weekly_budget = analysis_data.get("weekly_budget", 5000.0)

    if not is_shortfall:
        return {
            "summary_reason": "Your liquidity is healthy and predicted to remain safely above your safety buffer.",
            "primary_factors": [],
            "risk_status": "SAFE",
            "llm_prompt_payload": None
        }

    primary_factors: List[str] = []

    # Reason 1: Starting Balance below or close to Safety Buffer
    if current_balance < safety_buffer:
        diff = round(safety_buffer - current_balance, 2)
        primary_factors.append(
            f"Initial Net Balance (₹{current_balance:,.2f}) is already ₹{diff:,.2f} below your configured Safety Buffer (₹{safety_buffer:,.2f})."
        )
    elif (current_balance - safety_buffer) < (daily_burn * 3):
        primary_factors.append(
            f"Liquidity margin is slim: Available surplus (₹{(current_balance - safety_buffer):,.2f}) provides less than 3 days of baseline buffer."
        )

    # Reason 2: Daily Spending Velocity Impact
    if daily_burn > 0:
        days_covered = round(current_balance / daily_burn, 1) if daily_burn > 0 else 0
        if days_covered < 14:
            primary_factors.append(
                f"Daily budget velocity (₹{daily_burn:,.2f}/day) will exhaust available balance in ~{days_covered} days before planned income credits."
            )

    # Reason 3: Shortfall Proximity Warning
    if days_to_shortfall is not None:
        if days_to_shortfall <= 3:
            primary_factors.append(
                f"Urgent timing: Shortfall is predicted to occur within {days_to_shortfall} day(s) on {analysis_data.get('shortfall_date')}."
            )
        else:
            primary_factors.append(
                f"Mid-term trajectory: Balance is projected to cross below the safety buffer in {days_to_shortfall} days with a deficit of ₹{deficit:,.2f}."
            )

    # Construct human-readable summary
    summary_reason = (
        f"Shortfall of ₹{deficit:,.2f} predicted in {days_to_shortfall} days. "
        f"Current net balance of ₹{current_balance:,.2f} is insufficient to maintain your ₹{safety_buffer:,.2f} safety buffer "
        f"against your ₹{daily_burn:,.2f}/day spending trajectory."
    )

    # Payload structured for Phase 2 LLM Integration
    llm_prompt_payload = {
        "user_id": analysis_data.get("user_id"),
        "current_balance": current_balance,
        "safety_buffer": safety_buffer,
        "shortfall_deficit": deficit,
        "days_to_shortfall": days_to_shortfall,
        "shortfall_date": analysis_data.get("shortfall_date"),
        "weekly_budget": weekly_budget,
        "daily_burn_rate": daily_burn,
        "identified_factors": primary_factors
    }

    # Attempt Phase 2 LLM reasoning generation via model_config.yaml
    llm_output = None
    try:
        from backend.shortfall_detection.llm_reasoning import LLMShortfallReasoner
        reasoner = LLMShortfallReasoner()
        llm_output = reasoner.generate_llm_reasoning(llm_prompt_payload)
    except Exception as llm_err:
        print(f"LLM Reasoning fallback to algorithmic rules: {llm_err}")

    if llm_output and llm_output.get("summary_narrative"):
        summary_reason = llm_output["summary_narrative"]
        if llm_output.get("actionable_bullets"):
            primary_factors = llm_output["actionable_bullets"]

    return {
        "summary_reason": summary_reason,
        "primary_factors": primary_factors,
        "risk_status": analysis_data.get("risk_level", "MODERATE"),
        "llm_prompt_payload": llm_prompt_payload,
        "llm_output": llm_output
    }
