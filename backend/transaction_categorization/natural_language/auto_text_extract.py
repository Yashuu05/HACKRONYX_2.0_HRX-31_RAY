"""
AI Cashflow Guardian
--------------------
Natural Language Transaction Parser

Extracts:
    1. Transaction type
    2. Amount
    3. Currency
    4. Payment method
    5. Description
    6. Category

Approach:
    - Regex for amount extraction
    - Keyword matching for payment methods
    - Keyword matching for categories
    - Rule-based transaction type detection
    - Lightweight description extraction

No LLM/API is required.

Author: AI Cashflow Guardian Team
"""

import re
import json
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict
import os 
import sys
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
from backend.transaction_categorization.natural_language.keywords import *

# ============================================================
# 2. DATA MODEL
# ============================================================

@dataclass
class Transaction:
    transaction_type: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "INR"
    payment_method: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

    # Useful for debugging / UI
    matched_keywords: Optional[List[str]] = None
    confidence: float = 0.0

    def to_dict(self):
        return asdict(self)


# ============================================================
# 3. TEXT NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:
    """
    Normalize input text for reliable keyword matching.
    """

    text = text.lower().strip()

    # Normalize common variations
    replacements = {
        "t shirt": "t-shirt",
        "tshirt": "t-shirt",
        "g pay": "gpay",
        "google-pay": "google pay",
        "phone pay": "phonepe",
        "phone-pay": "phonepe",
        "creditcard": "credit card",
        "debitcard": "debit card",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Normalize multiple spaces
    text = re.sub(r"\s+", " ", text)

    return text


# ============================================================
# 4. AMOUNT EXTRACTION
# ============================================================

def extract_amount(text: str) -> Optional[float]:
    """
    Extract monetary amount from text.

    Supports examples:
        INR 1000
        INR 1,000
        ₹1000
        ₹ 1,000.50
        Rs 500
        Rs. 500
        500 rupees
    """

    amount_patterns = [

        # INR 1000 / INR 1,000 / INR 1000.50
        r"(?:inr|rs\.?|rupees?)\s*₹?\s*([\d,]+(?:\.\d{1,2})?)",

        # ₹1000 / ₹ 1,000
        r"₹\s*([\d,]+(?:\.\d{1,2})?)",

        # 1000 rupees
        r"([\d,]+(?:\.\d{1,2})?)\s*rupees?",

        # Generic fallback:
        # "spent 1000 on..."
        r"\b(\d[\d,]*(?:\.\d{1,2})?)\b",
    ]

    for pattern in amount_patterns:

        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            raw_amount = match.group(1)

            try:
                return float(raw_amount.replace(",", ""))
            except ValueError:
                continue

    return None


# ============================================================
# 5. PAYMENT METHOD EXTRACTION
# ============================================================

def extract_payment_method(
    text: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Extract payment method and matched keyword.
    """

    # Sort longest keywords first so that
    # "credit card" is checked before "credit".
    methods = []

    for method, keywords in PAYMENT_METHODS.items():

        for keyword in keywords:
            methods.append((keyword, method))

    methods.sort(key=lambda x: len(x[0]), reverse=True)

    for keyword, method in methods:

        if keyword in text:

            return method, keyword

    return None, None


# ============================================================
# 6. CATEGORY EXTRACTION
# ============================================================

def extract_category(
    text: str,
    transaction_type: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    """
    Extract category according to transaction type.
    """

    if transaction_type == "income":
        category_dict = INCOME_CATEGORIES

    elif transaction_type == "expense":
        category_dict = EXPENSE_CATEGORIES

    else:
        # Search both if transaction type isn't known
        category_dict = {
            **EXPENSE_CATEGORIES,
            **INCOME_CATEGORIES,
        }

    matches = []

    for category, keywords in category_dict.items():

        for keyword in keywords:

            if keyword in text:
                matches.append(
                    (
                        len(keyword),
                        category,
                        keyword
                    )
                )

    if not matches:
        return None, None

    # Prefer the longest / most specific keyword.
    matches.sort(reverse=True)

    _, category, keyword = matches[0]

    return category, keyword


# ============================================================
# 7. TRANSACTION TYPE DETECTION
# ============================================================

def detect_transaction_type(
    text: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Determine whether transaction is income or expense.
    """

    # Check longer phrases first
    expense_keywords = sorted(
        EXPENSE_KEYWORDS,
        key=len,
        reverse=True
    )

    income_keywords = sorted(
        INCOME_KEYWORDS,
        key=len,
        reverse=True
    )

    expense_matches = []
    income_matches = []

    for keyword in expense_keywords:

        if keyword in text:
            expense_matches.append(keyword)

    for keyword in income_keywords:

        if keyword in text:
            income_matches.append(keyword)

    # Strong income categories
    if income_matches and not expense_matches:
        return "income", income_matches[0]

    if expense_matches and not income_matches:
        return "expense", expense_matches[0]

    # If both exist, use context.
    # Example:
    # "received refund after spending..."
    if "received" in text or "credited" in text:
        return "income", "received"

    if "spent" in text or "paid" in text or "purchased" in text:
        return "expense", "spent"

    return None, None


# ============================================================
# 8. DESCRIPTION EXTRACTION
# ============================================================

def extract_description(
    text: str,
    transaction_type: Optional[str],
) -> Optional[str]:
    """
    Extract a human-readable transaction description.

    Examples:

        "spent INR 1000 on new t-shirt via credit"
        -> "new t-shirt"

        "paid INR 500 for dinner using UPI"
        -> "dinner"

        "INR 30000 salary via cheque"
        -> "salary"
    """

    # --------------------------------------------------------
    # Pattern 1:
    # "spent INR 1000 on new t-shirt via credit"
    # --------------------------------------------------------

    patterns = [

        r"\bon\s+(.+?)(?=\s+\bvia\b|\s+\busing\b|$)",

        r"\bfor\s+(.+?)(?=\s+\bvia\b|\s+\busing\b|$)",

        r"\btowards\s+(.+?)(?=\s+\bvia\b|\s+\busing\b|$)",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            description = match.group(1).strip()

            if description:
                return description

    # --------------------------------------------------------
    # Income:
    #
    # "INR 30000 salary via cheque"
    # --------------------------------------------------------

    if transaction_type == "income":

        category, keyword = extract_category(
            text,
            "income"
        )

        if keyword:
            return keyword

    # --------------------------------------------------------
    # Expense:
    #
    # "spent INR 50 coffee via UPI"
    # --------------------------------------------------------

    category, keyword = extract_category(
        text,
        "expense"
    )

    if keyword:
        return keyword

    return None


# ============================================================
# 9. CONFIDENCE CALCULATION
# ============================================================

def calculate_confidence(transaction: Transaction) -> float:
    """
    Calculate a simple rule-based extraction confidence.

    This is NOT an ML confidence score.

    It indicates how many important fields were successfully
    extracted.
    """

    fields = [
        transaction.transaction_type,
        transaction.amount,
        transaction.payment_method,
        transaction.description,
        transaction.category,
    ]

    extracted = sum(
        field is not None
        for field in fields
    )

    confidence = extracted / len(fields)

    return round(confidence, 2)


# ============================================================
# 10. MAIN PARSER
# ============================================================

def parse_transaction(text: str) -> Transaction:
    """
    Main transaction parsing function.
    """

    normalized_text = normalize_text(text)

    transaction = Transaction()

    # --------------------------------------------------------
    # Transaction type
    # --------------------------------------------------------

    transaction_type, type_keyword = detect_transaction_type(
        normalized_text
    )

    transaction.transaction_type = transaction_type

    # --------------------------------------------------------
    # Amount
    # --------------------------------------------------------

    transaction.amount = extract_amount(
        normalized_text
    )

    # --------------------------------------------------------
    # Payment method
    # --------------------------------------------------------

    payment_method, payment_keyword = extract_payment_method(
        normalized_text
    )

    transaction.payment_method = payment_method

    # --------------------------------------------------------
    # Category
    # --------------------------------------------------------

    category, category_keyword = extract_category(
        normalized_text,
        transaction_type
    )

    transaction.category = category

    # --------------------------------------------------------
    # Description
    # --------------------------------------------------------

    transaction.description = extract_description(
        normalized_text,
        transaction_type
    )

    # --------------------------------------------------------
    # Matched keywords
    # --------------------------------------------------------

    matched_keywords = []

    for keyword in [
        type_keyword,
        payment_keyword,
        category_keyword,
    ]:

        if keyword and keyword not in matched_keywords:
            matched_keywords.append(keyword)

    transaction.matched_keywords = matched_keywords

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    transaction.confidence = calculate_confidence(
        transaction
    )

    return transaction


# ============================================================
# 11. JSON OUTPUT
# ============================================================

def parse_transaction_json(text: str) -> str:
    """
    Parse transaction and return formatted JSON.
    """

    transaction = parse_transaction(text)

    return json.dumps(
        transaction.to_dict(),
        indent=4,
        ensure_ascii=False
    )


# ============================================================
# 12. DEMO / TEST CASES
# ============================================================

def run_demo():
    """
    Run predefined examples.
    """

    examples = [
        # Expenses
        "spent INR 50 on coffee via UPI",
        "spent INR 1000 on new t-shirt via credit",
        "paid ₹750 for dinner using debit card",
        "bought shoes for Rs 2500 via UPI",
        "spent INR 800 on Uber via Google Pay",

        # Income
        "INR 30000 salary via Cheque",
        "INR 2300 family transfer via UPI",
        "received INR 5000 stipend through bank transfer",
        "earned ₹12000 from freelance work via UPI",
        "received INR 1000 cashback through credit card",
    ]
    for example in examples:
        print("=" * 70)
        print("INPUT:")
        print(example)
        print("\nOUTPUT:")
        print(parse_transaction_json(example))
        print()


# full pipeline
def full_keyword_extraction(text:str=""):
    text = text.lower().strip()
    result = parse_transaction(text=text)
    print("\nExtracted transaction:")
    
    print(
        json.dumps(
        result.to_dict(),
        indent=4,
        ensure_ascii=False
        )
    )
    
    print()

if __name__ == "__main__":
    
    full_keyword_extraction(text="Spent INR 340 on taxi via UPI")