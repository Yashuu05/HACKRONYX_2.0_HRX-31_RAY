from typing import Optional, List, Dict

PAYMENT_METHODS: Dict[str, List[str]] = {

    "upi": [
        "upi",
        "google pay",
        "gpay",
        "phonepe",
        "paytm",
        "bhim",
    ],

    "credit_card": [
        "credit card",
        "credit",
        "cc",
    ],

    "debit_card": [
        "debit card",
        "debit",
        "dc",
    ],

    "cash": [
        "cash",
        "cash payment",
    ],

    "cheque": [
        "cheque",
        "check",
    ],

    "bank_transfer": [
        "bank transfer",
        "bank transfer",
        "neft",
        "rtgs",
        "imps",
    ],
}

EXPENSE_CATEGORIES: Dict[str, List[str]] = {

    "food_and_beverages": [
        "food",
        "coffee",
        "tea",
        "restaurant",
        "restaurants",
        "cafe",
        "cafeteria",
        "lunch",
        "dinner",
        "breakfast",
        "snack",
        "snacks",
        "pizza",
        "burger",
        "zomato",
        "swiggy",
        "dominos",
        "kfc",
        "mcdonald",
        "groceries",
        "grocery",
    ],

    "travel": [
        "travel",
        "uber",
        "ola",
        "rapido",
        "taxi",
        "cab",
        "bus",
        "train",
        "flight",
        "metro",
        "rickshaw",
        "auto",
        "transport",
        "fuel",
        "petrol",
        "diesel",
        "parking",
    ],

    "clothing": [
        "clothing",
        "clothes",
        "shirt",
        "t-shirt",
        "tshirt",
        "jeans",
        "trouser",
        "pants",
        "dress",
        "jacket",
        "shoes",
        "sneakers",
        "fashion",
        "apparel",
    ],

    "academic": [
        "academic",
        "college",
        "university",
        "school",
        "tuition",
        "course",
        "courses",
        "books",
        "book",
        "exam",
        "education",
        "fees",
        "fee",
        "certification",
        "udemy",
        "coursera",
    ],

    "entertainment": [
        "movie",
        "movies",
        "cinema",
        "netflix",
        "spotify",
        "gaming",
        "game",
        "concert",
        "entertainment",
        "youtube premium",
    ],

    "shopping": [
        "shopping",
        "amazon",
        "flipkart",
        "myntra",
        "electronics",
        "accessory",
        "accessories",
        "purchase",
        "product",
    ],

    "healthcare": [
        "hospital",
        "doctor",
        "medicine",
        "medical",
        "pharmacy",
        "healthcare",
        "clinic",
        "dental",
        "dentist",
    ],

    "utilities": [
        "electricity",
        "water bill",
        "internet",
        "wifi",
        "mobile recharge",
        "recharge",
        "phone bill",
        "gas bill",
        "utility",
    ],

    "rent": [
        "rent",
        "house rent",
        "room rent",
        "hostel",
        "pg",
        "paying guest",
    ],

    "subscriptions": [
        "subscription",
        "membership",
        "netflix",
        "spotify",
        "prime",
        "amazon prime",
        "gym membership",
    ],

    "personal_care": [
        "salon",
        "haircut",
        "spa",
        "beauty",
        "grooming",
        "personal care",
    ],

    "gifts": [
        "gift",
        "birthday gift",
        "present",
        "wedding gift",
    ],

    "other": [
        "other",
        "miscellaneous",
        "misc",
    ],
}

INCOME_CATEGORIES: Dict[str, List[str]] = {

    "salary": [
        "salary",
        "paycheck",
        "pay cheque",
        "monthly salary",
        "salary credit",
        "wages",
    ],

    "stipend": [
        "stipend",
        "internship stipend",
        "internship payment",
        "internship income",
    ],

    "family_transfer": [
        "family transfer",
        "family",
        "parents",
        "parent",
        "pocket money",
        "allowance",
        "money from parents",
        "money from mom",
        "money from dad"
    ],

    "freelance": [
        "freelance",
        "freelancing",
        "freelance payment",
        "client payment",
        "client",
        "client pay",
    ],

    "business_income": [
        "business income",
        "business payment",
        "business revenue",
        "sales",
        "revenue",
        
    ],

    "rewards": [
        "reward",
        "rewards",
        "cashback",
        "cash back",
        "bonus",
        "prize",
        "prize money",
    ],

    "passive_income": [
        "passive income",
        "interest",
        "dividend",
        "dividends",
        "royalty",
        "royalties",
    ],

    "refund": [
        "refund",
        "cash refund",
        "payment refund",
        "reimbursement",
    ],

    "other_income": [
        "other income",
        "income",
        "earning",
        "earnings",
    ],
}

EXPENSE_KEYWORDS = [
    "spent",
    "spend",
    "spent on",
    "paid",
    "pay",
    "purchase",
    "purchased",
    "bought",
    "buy",
    "expense",
    "expenses",
    "charged",
    "withdrawn",
    "withdraw",
    "debited",
    "debit",
]

INCOME_KEYWORDS = [
    "received",
    "receive",
    "earned",
    "earn",
    "credited",
    "credit",
    "income",
    "salary",
    "stipend",
    "refund",
    "cashback",
    "reward",
    "bonus",
    "dividend",
    "interest",
    "transfer received",
]