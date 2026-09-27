import os
import sys
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.utils import utilities
from backend.ai_agent.lc_tools import (
    fetch_user_financial_profile,
    get_safe_to_spend_tool,
    check_affordability_tool,
    get_category_spending_tool,
    get_timeframe_category_spend_tool,
    get_ledger_summary_tool,
    get_savings_advice_tool,
    check_user_category_data,
    CATEGORY_SYNONYMS
)
from backend.ai_agent.lc_memory import format_feedback_in_context_block
import re


def load_llm_models_hierarchy() -> List[tuple[str, str, Any]]:
    """
    Returns ordered list of (provider, model_name, model_instance) for resilient failover execution.
    Primary model and provider: gemini-3.8-flash and google
    Fallback model and provider: openai/gpt-oss-120b and groq
    """
    candidates = []

    # 1. Primary: openai/gpt-oss-120b (Groq)
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            from langchain_groq import ChatGroq
            # Primary model requested by user: openai/gpt-oss-120b via Groq
            model_groq = ChatGroq(
                model="openai/gpt-oss-120b",
                groq_api_key=groq_key,
                temperature=0.2,
                max_retries=2
            )
            candidates.append(("groq", "openai/gpt-oss-120b (Groq)", model_groq))
        except Exception as e:
            print(f"[LangChain ChatGroq Warning] Failed to init Groq openai/gpt-oss-120b: {e}")

    # 2. Backup / Fallback: gemini-3.8-flash (Google)
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            # max_retries=0 ensures that if Google quota is exhausted (HTTP 429), it fails immediately
            model_gemini = ChatGoogleGenerativeAI(
                model="gemini-3.8-flash",
                google_api_key=gemini_key,
                temperature=0.2,
                max_retries=0,
                request_timeout=10
            )
            candidates.append(("google", "gemini-3.8-flash (Google)", model_gemini))
        except Exception as e:
            print(f"[LangChain ChatGoogleGenerativeAI Warning] Failed to init gemini-3.8-flash: {e}")

    return candidates


def load_llm_model():
    """
    Initializes primary LLM using ChatGoogleGenerativeAI (gemini-3.8-flash) or ChatGroq (openai/gpt-oss-120b).
    Maintained for backward compatibility.
    """
    hierarchy = load_llm_models_hierarchy()
    if hierarchy:
        provider, name, model = hierarchy[0]
        return model, name

    return None, "Deterministic Fallback Engine (Neon DB Grounded)"


def evaluate_query_data_availability(query: str, user_id: str) -> tuple[bool, str]:
    """
    Evaluates whether real data is available in the database for the given user and query.
    Returns:
        (has_data: bool, direct_response: str)
    If has_data is False, direct_response is "no data found" and AI MUST NOT be invoked.
    """
    q_lower = query.lower().strip()
    
    # Check for pure greetings that do not ask for financial data
    clean_q = "".join(c for c in q_lower if c.isalnum() or c.isspace()).strip()
    pure_greetings = {'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'who are you', 'what are you', 'help'}
    if clean_q in pure_greetings:
        return True, ""

    # Fetch user profile strictly from DB for this user_id
    profile = fetch_user_financial_profile(user_id)
    total_txns = profile["income_count"] + profile["expense_count"]

    # 1. Check for specific category query
    target_category = None
    search_terms = []

    for cat_name, syns in CATEGORY_SYNONYMS.items():
        if any(s in q_lower for s in syns):
            target_category = cat_name
            search_terms = syns
            break

    if not target_category:
        m = re.search(r'(?:spend|spent|spending|cost|expenses?|money\s+spent)(?:\s+(?:anything|money|much))?\s+(?:on|for)\s+([a-zA-Z0-9\s&]+?)(?:\?|\.|\bin\b|\bduring\b|\blast\b|\bthis\b|$)', q_lower)
        if m:
            extracted = m.group(1).strip()
            if extracted and extracted not in ['me', 'it', 'this', 'that', 'something']:
                target_category = extracted
                search_terms = [extracted]

    if target_category:
        cat_check = check_user_category_data(user_id=user_id, search_terms=search_terms)
        if not cat_check["has_data"] or cat_check["count"] == 0:
            return False, "no data found"
        return True, ""

    # 2. Category breakdown queries
    if any(k in q_lower for k in ['where', 'category', 'categories', 'most of my income', 'breakdown', 'spend breakdown']):
        if profile["expense_count"] == 0:
            return False, "no data found"
        return True, ""

    # 3. Overall overview, summary, statement, balance, safe to spend
    if any(k in q_lower for k in ['overview', 'transactions', 'summary', 'statement', 'balance', 'safe-to-spend', 'safe to spend', 'safely spend', 'how much money']):
        if not profile.get("has_data") or total_txns == 0:
            return False, "no data found"
        return True, ""

    # 4. Affordability queries
    if any(k in q_lower for k in ['afford', 'trip', 'buy', 'gift', 'purchase', 'can i']):
        if not profile.get("has_data") or total_txns == 0:
            return False, "no data found"
        return True, ""

    # 5. Savings advice
    if any(k in q_lower for k in ['save', 'saving', 'reduce', 'cut', 'tips', 'budget']):
        if profile["expense_count"] == 0:
            return False, "no data found"
        return True, ""

    # 6. Any other general financial question when the user has 0 records in DB
    financial_keywords = ['spend', 'spent', 'expense', 'income', 'balance', 'budget', 'money', 'cost', 'save', 'transaction', 'bill']
    if any(k in q_lower for k in financial_keywords):
        if not profile.get("has_data") or total_txns == 0:
            return False, "no data found"

    return True, ""


def determine_tool_context(query: str, user_id: str) -> str:
    """Executes relevant LangChain pre-calculated metric tools based on user question intent."""
    q_lower = query.lower()

    profile = fetch_user_financial_profile(user_id)
    if not profile.get("has_data") or (profile["income_count"] + profile["expense_count"]) == 0:
        return "no data found"

    contexts = []
    # Always include baseline financial profile strictly from database
    contexts.append(
        f"[Ground Truth Baseline]: Net Balance: ₹{profile['net_balance']:,.2f} | "
        f"Safe-to-Spend: ₹{profile['safe_to_spend']:,.2f} | "
        f"Safety Buffer: ₹{profile['safety_buffer']:,.2f} | "
        f"Upcoming Protected Debits: ₹{profile['total_protected']:,.2f}"
    )

    # 1. Affordability / Trip / Purchase query
    if any(k in q_lower for k in ['afford', 'trip', 'buy', 'gift', 'spend safely', 'purchase', 'can i']):
        nums = re.findall(r'\d+', q_lower.replace(',', ''))
        amt = float(nums[0]) if nums else 2000.0
        afford_res = check_affordability_tool.invoke({"user_id": user_id, "amount": amt, "category": "general"})
        safe_res = get_safe_to_spend_tool.invoke({"user_id": user_id})
        contexts.append(f"[Affordability Analysis for ₹{amt:,.2f}]:\n{afford_res}")
        contexts.append(f"[Safe-to-Spend Status]:\n{safe_res}")

    # 2. Category spending query (e.g., where most income is spent)
    if any(k in q_lower for k in ['where', 'category', 'categories', 'most of my income', 'breakdown', 'spend breakdown']):
        cat_res = get_category_spending_tool.invoke({"user_id": user_id, "timeframe": "30d"})
        contexts.append(f"[Category Breakdown Analysis]:\n{cat_res}")

    # 3. Specific category & timeframe query
    matched_cat = None
    for cat_name, syns in CATEGORY_SYNONYMS.items():
        if any(s in q_lower for s in syns):
            matched_cat = cat_name
            break

    if matched_cat:
        cat_spend_res = get_timeframe_category_spend_tool.invoke({"user_id": user_id, "category": matched_cat, "days": 30})
        contexts.append(f"[Recent {matched_cat.capitalize()} Expenses]:\n{cat_spend_res}")

    # 4. Transaction Overview
    if any(k in q_lower for k in ['overview', 'transactions', 'summary', 'statement']):
        ledger_res = get_ledger_summary_tool.invoke({"user_id": user_id})
        contexts.append(f"[Ledger Overview]:\n{ledger_res}")

    # 5. Saving money / advice
    if any(k in q_lower for k in ['save', 'saving', 'reduce', 'cut', 'tips', 'budget']):
        savings_res = get_savings_advice_tool.invoke({"user_id": user_id})
        contexts.append(f"[Savings Optimization Insights]:\n{savings_res}")

    return "\n\n".join(contexts)


def create_deterministic_fallback_response(query: str, user_id: str = "usr-001") -> str:
    """Strict data-driven fallback response. If no user data is available in database, outputs 'no data found'."""
    is_avail, _ = evaluate_query_data_availability(query=query, user_id=user_id)
    if not is_avail:
        return "no data found"

    profile = fetch_user_financial_profile(user_id)
    if not profile.get("has_data") or (profile["income_count"] + profile["expense_count"]) == 0:
        return "no data found"

    q_lower = query.lower()
    safe = profile['safe_to_spend']
    net = profile['net_balance']

    # Specific category check
    for cat_name, syns in CATEGORY_SYNONYMS.items():
        if any(s in q_lower for s in syns):
            cat_res = get_timeframe_category_spend_tool.invoke({"user_id": user_id, "category": cat_name, "days": 30})
            return cat_res

    if any(k in q_lower for k in ['where', 'category', 'most of my income', 'breakdown']):
        cat_res = get_category_spending_tool.invoke({"user_id": user_id, "timeframe": "30d"})
        if cat_res == "no data found":
            return "no data found"
        return f"Here is your real expense breakdown from the database:\n{cat_res}"

    if any(k in q_lower for k in ['afford', 'trip', 'purchase', 'buy']):
        nums = re.findall(r'\d+', q_lower.replace(',', ''))
        amt = float(nums[0]) if nums else 2000.0
        return check_affordability_tool.invoke({"user_id": user_id, "amount": amt, "category": "general"})

    if any(k in q_lower for k in ['overview', 'transaction', 'summary']):
        return (
            f"Financial Overview for your account:\n\n"
            f"- Total Income: ₹{profile['total_income']:,.2f} ({profile['income_count']} transactions)\n"
            f"- Total Expenses: ₹{profile['total_expense']:,.2f} ({profile['expense_count']} transactions)\n"
            f"- Net Balance: ₹{profile['net_balance']:,.2f}\n"
            f"- Safe-to-Spend: ₹{profile['safe_to_spend']:,.2f}"
        )

    return (
        f"Based on your recorded transactions in the database, your current Safe-to-Spend limit is ₹{safe:,.2f} "
        f"with a net balance of ₹{net:,.2f}."
    )


def build_langchain_chat_chain():
    """Builds the complete LangChain LCEL pipeline with prompt template and output parser."""
    system_template = """
You are SPECIFY Assistant, an elite personal financial intelligence and liquidity risk advisor.
Your mission is to provide concise, empathetic, and 100% mathematically accurate guidance on daily spending, liquidity forecasts, and money-saving actions.

CRITICAL FINANCIAL GROUNDING RULES:
1. NEVER invent, hallucinate, or perform unsupported arithmetic. All financial balances, deficits, and category totals MUST come strictly from the [GROUND TRUTH CONTEXT] provided below.
2. If the user asks about any category, expense, or transaction that does not appear in [GROUND TRUTH CONTEXT] or if the context says 'no data found', you MUST reply exactly 'no data found'. NEVER invent sample transactions, merchants (e.g. Swiggy, Canteen), or amounts.
3. Maintain a friendly, supportive, and actionable tone (use bullet points and bold amounts for readability).
4. Keep responses direct (under 150 words) with clear numbers and specific next steps.
5. Adhere to [USER FEEDBACK PREFERENCES] when suggesting behavioral modifications.

[USER FEEDBACK PREFERENCES]:
{feedback_memory}

[GROUND TRUTH CONTEXT]:
{tool_context}
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_template),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{user_input}")
    ])

    return prompt
