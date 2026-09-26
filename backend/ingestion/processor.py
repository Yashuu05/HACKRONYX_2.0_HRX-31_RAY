import io
import re
import datetime
import pandas as pd
from typing import List, Dict, Any, Tuple


def parse_narration(narration_str: str) -> Dict[str, str]:
    """
    Parses Narration string by hyphen ('-') delimiter.
    Example input: "UPI-ANITA MADHUKAR SHIND-PAYTMQR70W1DZ@PTYS-YESB0PTMUPI-124226945456-EGGS"
    Output:
      payment_method: "UPI"
      merchant: "ANITA MADHUKAR SHIND"
      description: "EGGS"
    """
    if pd.isna(narration_str) or not str(narration_str).strip():
        return {
            "payment_method": "NA",
            "merchant": "NA",
            "description": "NA"
        }

    raw = str(narration_str).strip()
    parts = [p.strip() for p in raw.split("-") if p.strip()]

    if not parts:
        return {"payment_method": "NA", "merchant": "NA", "description": "NA"}

    if len(parts) == 1:
        return {
            "payment_method": "UPI" if "UPI" in parts[0].upper() else "NA",
            "merchant": parts[0],
            "description": parts[0]
        }
    elif len(parts) == 2:
        return {
            "payment_method": parts[0].upper(),
            "merchant": parts[1],
            "description": parts[1]
        }
    else:
        payment_method = parts[0].upper()
        merchant = parts[1]
        description = parts[-1]  # Last segment is description (e.g. EGGS)
        return {
            "payment_method": payment_method if payment_method else "NA",
            "merchant": merchant if merchant else "NA",
            "description": description if description else "NA"
        }


def parse_date_to_iso(date_val: Any) -> str:
    """Standardizes date strings (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD) into ISO YYYY-MM-DD."""
    if pd.isna(date_val) or not str(date_val).strip():
        return datetime.date.today().isoformat()
    
    d_str = str(date_val).strip()
    for fmt in ("%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.datetime.strptime(d_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return datetime.date.today().isoformat()


def infer_category(description: str, merchant: str, activity_type: str) -> str:
    """Rule-based categorization engine for Indian banking & UPI statements."""
    text = f"{description} {merchant}".upper()

    if activity_type == "income":
        if any(k in text for k in ["SALARY", "STIPEND", "BONUS"]):
            return "Salary & Income"
        elif any(k in text for k in ["FREELANCE", "CLIENT"]):
            return "Freelance"
        elif any(k in text for k in ["REFUND", "CASHBACK"]):
            return "Refunds"
        return "General Income"
    else:
        if any(k in text for k in ["EGG", "EGGS", "SWIGGY", "ZOMATO", "FOOD", "CANTEEN", "TEA", "HOTEL", "RESTAURANT", "MESS"]):
            return "Food & Beverages"
        elif any(k in text for k in ["AMAZON", "FLIPKART", "MYNTRA", "SHOP", "STORE", "PAYTMQR"]):
            return "Shopping"
        elif any(k in text for k in ["RECHARGE", "ELECTRICITY", "BILL", "RENT", "WIFI"]):
            return "Utilities & Bills"
        elif any(k in text for k in ["FEES", "COLLEGE", "BOOK", "XEROX", "ACADEMIC"]):
            return "Academic & Education"
        elif any(k in text for k in ["AUTO", "UBER", "OLA", "METRO", "FUEL", "PETROL"]):
            return "Transportation"
        return "Personal Expenses"


def clean_and_parse_csv(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Parses and cleans raw bank dataset file (.csv or .xlsx).
    Handles exact dataset columns:
      - Date
      - Narration
      - Chq./Ref.No.
      - Value Dt
      - Withdrawal Amt.
      - Deposit Amt.
      - Closing Balance

    Performs:
      1. Null filling with "NA" / "NAN"
      2. Narration hyphen splitting
      3. Composite key deduplication
    """
    # 1. Read file into Pandas DataFrame
    is_excel = filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")
    
    if is_excel:
        df = pd.read_excel(io.BytesIO(file_bytes))
    else:
        df = pd.read_csv(io.BytesIO(file_bytes))

    total_rows_read = len(df)

    # Standardize column headers (strip whitespace)
    df.columns = [str(c).strip() for c in df.columns]

    # Flexible column detection
    col_map = {}
    for col in df.columns:
        c_lower = col.lower()
        if "narration" in c_lower or "description" in c_lower or "particulars" in c_lower:
            col_map["narration"] = col
        elif "withdrawal" in c_lower or "debit" in c_lower:
            col_map["withdrawal"] = col
        elif "deposit" in c_lower or "credit" in c_lower:
            col_map["deposit"] = col
        elif c_lower == "date" or "txn date" in c_lower:
            col_map["date"] = col
        elif "value" in c_lower and "dt" in c_lower:
            col_map["value_dt"] = col
        elif "closing" in c_lower or "balance" in c_lower:
            col_map["closing_balance"] = col
        elif "chq" in c_lower or "ref" in c_lower:
            col_map["ref_no"] = col

    cleaned_transactions = []
    nulls_filled_count = 0

    for idx, row in df.iterrows():
        # Read Date
        raw_date = row.get(col_map.get("date", "Date"))
        tx_date = parse_date_to_iso(raw_date)

        raw_value_dt = row.get(col_map.get("value_dt", "Value Dt"))
        val_date = parse_date_to_iso(raw_value_dt)

        # Read Narration & Parse
        raw_narration = row.get(col_map.get("narration", "Narration"))
        parsed_narration = parse_narration(raw_narration)
        
        if pd.isna(raw_narration) or not str(raw_narration).strip():
            nulls_filled_count += 1

        # Read Ref No
        raw_ref = row.get(col_map.get("ref_no", "Chq./Ref.No."))
        ref_no = str(raw_ref).strip() if not pd.isna(raw_ref) and str(raw_ref).strip() else "NA"

        # Read Withdrawal & Deposit Amounts
        raw_wdr = row.get(col_map.get("withdrawal", "Withdrawal Amt."))
        raw_dep = row.get(col_map.get("deposit", "Deposit Amt."))

        wdr_val = float(raw_wdr) if not pd.isna(raw_wdr) and str(raw_wdr).strip() != "" else 0.0
        dep_val = float(raw_dep) if not pd.isna(raw_dep) and str(raw_dep).strip() != "" else 0.0

        if wdr_val > 0:
            activity_type = "expense"
            amount = round(wdr_val, 2)
        elif dep_val > 0:
            activity_type = "income"
            amount = round(dep_val, 2)
        else:
            # Skip rows with no financial movement or invalid 0 amounts
            continue

        # Closing balance
        raw_bal = row.get(col_map.get("closing_balance", "Closing Balance"))
        closing_bal = float(raw_bal) if not pd.isna(raw_bal) and str(raw_bal).strip() != "" else "NAN"

        # Category
        category = infer_category(parsed_narration["description"], parsed_narration["merchant"], activity_type)

        tx_obj = {
            "transaction_date": tx_date,
            "value_date": val_date,
            "activity_type": activity_type,
            "amount": amount,
            "payment_method": parsed_narration["payment_method"],
            "merchant": parsed_narration["merchant"],
            "description": parsed_narration["description"],
            "category": category,
            "ref_no": ref_no,
            "closing_balance": closing_bal,
            "status": "Completed"
        }
        cleaned_transactions.append(tx_obj)

    # 2. Perform Composite Deduplication
    df_clean = pd.DataFrame(cleaned_transactions)
    if not df_clean.empty:
        initial_clean_count = len(df_clean)
        # Composite key: transaction_date, amount, description, activity_type
        df_dedup = df_clean.drop_duplicates(
            subset=["transaction_date", "amount", "description", "activity_type"],
            keep="first"
        )
        duplicates_removed = initial_clean_count - len(df_dedup)
        final_records = df_dedup.to_dict(orient="records")
    else:
        duplicates_removed = 0
        final_records = []

    summary = {
        "total_rows_read": total_rows_read,
        "valid_rows_parsed": len(cleaned_transactions),
        "duplicates_removed": duplicates_removed,
        "nulls_filled_count": nulls_filled_count,
        "final_records_count": len(final_records)
    }

    return final_records, summary
