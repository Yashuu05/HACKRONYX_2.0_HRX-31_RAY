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
        method = "UPI" if "UPI" in parts[0].upper() else ("DEBIT" if "DEBIT" in parts[0].upper() else ("ACH" if "ACH" in parts[0].upper() else "NA"))
        return {
            "payment_method": method,
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


def parse_date_to_iso(date_val: Any, fallback_val: Any = None) -> str:
    """
    Standardizes date strings (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD, etc.) or datetime objects into ISO YYYY-MM-DD.
    If date_val is masked (e.g. '#######' due to Excel column overflow) or invalid, falls back to fallback_val.
    """
    for v in (date_val, fallback_val):
        if pd.isna(v):
            continue
        if isinstance(v, (datetime.datetime, datetime.date, pd.Timestamp)):
            return v.strftime("%Y-%m-%d")
        
        s = str(v).strip()
        if not s or "###" in s or s.lower() in ["nan", "none", "null", "-", "na"]:
            continue
            
        for fmt in (
            "%d/%m/%y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", 
            "%d/%m/%Y %H:%M:%S", "%d-%b-%Y", "%d-%b-%y", "%d-%B-%Y"
        ):
            try:
                return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue

    return datetime.date.today().isoformat()


def clean_float(val: Any) -> float:
    """Converts formatted string/numeric amounts with commas, currency symbols to a clean float."""
    if pd.isna(val):
        return 0.0
    if isinstance(val, (int, float)):
        return float(val) if not pd.isna(val) else 0.0
    
    s = str(val).strip().replace(",", "").replace("₹", "").replace("$", "")
    if not s or s == "-" or s.lower() in ["nan", "none", "null", "na"]:
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def clean_ref_no(raw_ref: Any) -> str:
    """Cleans reference number strings, removing scientific notation trailing decimals."""
    if pd.isna(raw_ref):
        return "NA"
    s = str(raw_ref).strip()
    if not s or s.lower() in ["nan", "none", "null", "-", "0", "0.0"]:
        return "NA"
    if s.endswith(".0"):
        s = s[:-2]
    return s


def infer_category(description: str, merchant: str, activity_type: str) -> str:
    """Rule-based categorization engine for Indian banking & UPI statements."""
    text = f"{description} {merchant}".upper()

    if activity_type == "income":
        if any(k in text for k in ["SALARY", "STIPEND", "BONUS"]):
            return "Salary & Income"
        elif any(k in text for k in ["FREELANCE", "CLIENT"]):
            return "Freelance"
        elif any(k in text for k in ["DIV", "DIVIDEND", "INTEREST", "REFUND", "CASHBACK"]):
            return "Investment & Refunds"
        return "General Income"
    else:
        if any(k in text for k in ["EGG", "EGGS", "SWIGGY", "ZOMATO", "FOOD", "CANTEEN", "TEA", "HOTEL", "RESTAURANT", "MESS", "BAKER", "DAHI", "MILK", "PEETH", "POTATOES"]):
            return "Food & Groceries"
        elif any(k in text for k in ["AMAZON", "FLIPKART", "MYNTRA", "SHOP", "STORE", "PAYTMQR", "FOOTWEAR"]):
            return "Shopping"
        elif any(k in text for k in ["RECHARGE", "ELECTRICITY", "BILL", "RENT", "WIFI", "MSEDCL", "HOTSTAR", "JIOHOTSTAR"]):
            return "Utilities & Subscriptions"
        elif any(k in text for k in ["FEES", "COLLEGE", "BOOK", "XEROX", "ACADEMIC", "SINHGAD", "UDEMY", "COURSE"]):
            return "Academic & Education"
        elif any(k in text for k in ["AUTO", "UBER", "OLA", "METRO", "FUEL", "PETROL", "TRANSPORT"]):
            return "Transportation"
        elif any(k in text for k in ["ZERODHA", "UPSTOX", "NSE", "CDSL", "SECURITY", "INVEST"]):
            return "Investments & Trading"
        elif any(k in text for k in ["MEDICAL", "PHARMACY", "HOSPITAL", "CLINIC", "HEALTH", "ORS"]):
            return "Healthcare"
        elif any(k in text for k in ["HAIRCUT", "SALON", "STYLE", "TURF"]):
            return "Personal Care & Recreation"
        return "Personal Expenses"


def _find_header_row_csv(lines: List[str]) -> int:
    """Finds the 0-indexed line where actual table column headers appear in a bank CSV."""
    for idx, line in enumerate(lines[:40]):
        line_lower = line.lower()
        has_date = "date" in line_lower
        has_narration = any(k in line_lower for k in ["narration", "particulars", "description", "details"])
        has_amount = any(k in line_lower for k in ["withdrawal", "deposit", "debit", "credit", "amount"])
        
        if (has_date and has_narration) or (has_date and has_amount) or (has_narration and has_amount):
            return idx
    return 0


def clean_and_parse_csv(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Parses and cleans raw bank dataset file (.csv, .xlsx, .xls).
    Robustly handles:
      - Bank statement metadata preambles & customer header rows
      - Column overflow / masked dates ('#######') with fallback to Value Dt
      - Formatted amounts with commas ('1,100.00')
      - Scientific notation ref numbers ('1.24227E+11')
      - Footer summary rows ('STATEMENT SUMMARY :-', 'Opening Balance', etc.)
      - Hyphen-delimited narration parsing & rule-based auto-categorization
      - Composite key deduplication
    """
    is_excel = filename.lower().endswith(".xlsx") or filename.lower().endswith(".xls")
    
    if is_excel:
        excel_stream = io.BytesIO(file_bytes)
        engine = "xlrd" if filename.lower().endswith(".xls") else "openpyxl"
        try:
            df_raw = pd.read_excel(excel_stream, header=None, engine=engine)
        except Exception:
            excel_stream.seek(0)
            try:
                df_raw = pd.read_excel(excel_stream, header=None)
            except Exception:
                excel_stream.seek(0)
                df_raw = pd.read_excel(excel_stream, header=None, engine="openpyxl" if engine == "xlrd" else "xlrd")

        # Dynamically find table header row
        header_row_idx = 0
        for idx, row in df_raw.head(40).iterrows():
            row_str = " ".join([str(v).lower() for v in row.dropna()])
            has_date = "date" in row_str
            has_narration = any(k in row_str for k in ["narration", "particulars", "description", "details"])
            has_amount = any(k in row_str for k in ["withdrawal", "deposit", "debit", "credit", "amount"])
            if (has_date and has_narration) or (has_date and has_amount) or (has_narration and has_amount):
                header_row_idx = idx
                break

        df = df_raw.iloc[header_row_idx + 1:].copy().reset_index(drop=True)
        df.columns = [str(c).strip() for c in df_raw.iloc[header_row_idx]]
    else:
        # Decode CSV content handling various encodings
        decoded_text = None
        for enc in ("utf-8", "latin-1", "cp1252", "utf-8-sig"):
            try:
                decoded_text = file_bytes.decode(enc)
                break
            except (UnicodeDecodeError, LookupError):
                continue
        
        if decoded_text is None:
            decoded_text = file_bytes.decode("utf-8", errors="ignore")

        lines = decoded_text.splitlines()
        header_idx = _find_header_row_csv(lines)
        csv_body = "\n".join(lines[header_idx:])
        
        # Read CSV with fallback for variable delimiters
        try:
            df = pd.read_csv(io.StringIO(csv_body), on_bad_lines="skip")
        except Exception:
            df = pd.read_csv(io.StringIO(csv_body), sep=None, engine="python", on_bad_lines="skip")

    total_rows_read = len(df)

    # Standardize column headers (strip whitespace)
    df.columns = [str(c).strip() for c in df.columns]

    # Flexible column detection
    col_map = {}
    for col in df.columns:
        c_lower = col.lower()
        if any(k in c_lower for k in ["narration", "particulars", "description", "details"]):
            col_map["narration"] = col
        elif any(k in c_lower for k in ["withdrawal", "debit", "dr"]):
            col_map["withdrawal"] = col
        elif any(k in c_lower for k in ["deposit", "credit", "cr"]):
            col_map["deposit"] = col
        elif "value" in c_lower and "dt" in c_lower:
            col_map["value_dt"] = col
        elif "txn date" in c_lower or "tran date" in c_lower or c_lower == "date":
            col_map["date"] = col
        elif "closing" in c_lower or "balance" in c_lower:
            col_map["closing_balance"] = col
        elif any(k in c_lower for k in ["chq", "ref", "cheque", "utr"]):
            col_map["ref_no"] = col

    summary_keywords = [
        "statement summary", "opening balance", "closing balance", 
        "end of statement", "gstin", "dr count", "cr count", 
        "generated on", "registered office", "page no"
    ]

    cleaned_transactions = []
    nulls_filled_count = 0

    for idx, row in df.iterrows():
        raw_narration = row.get(col_map.get("narration", "Narration"))
        narration_str = str(raw_narration).strip() if not pd.isna(raw_narration) else ""
        
        # Filter out bank footer summaries or non-transaction metadata lines
        if any(kw in narration_str.lower() for kw in summary_keywords):
            continue

        # Read Withdrawal & Deposit Amounts
        raw_wdr = row.get(col_map.get("withdrawal", "Withdrawal Amt."))
        raw_dep = row.get(col_map.get("deposit", "Deposit Amt."))

        wdr_val = clean_float(raw_wdr)
        dep_val = clean_float(raw_dep)

        if wdr_val > 0:
            activity_type = "expense"
            amount = round(wdr_val, 2)
        elif dep_val > 0:
            activity_type = "income"
            amount = round(dep_val, 2)
        else:
            # Skip rows with no financial movement (preamble leftover or summary text)
            continue

        # Read Dates with masked value fallback
        raw_date = row.get(col_map.get("date", "Date"))
        raw_value_dt = row.get(col_map.get("value_dt", "Value Dt"))

        tx_date = parse_date_to_iso(raw_date, fallback_val=raw_value_dt)
        val_date = parse_date_to_iso(raw_value_dt, fallback_val=raw_date)

        # Parse Narration
        parsed_narration = parse_narration(raw_narration)
        if pd.isna(raw_narration) or not narration_str:
            nulls_filled_count += 1

        # Read Ref No
        raw_ref = row.get(col_map.get("ref_no", "Chq./Ref.No."))
        ref_no = clean_ref_no(raw_ref)

        # Closing balance
        raw_bal = row.get(col_map.get("closing_balance", "Closing Balance"))
        closing_bal = clean_float(raw_bal) if not pd.isna(raw_bal) and str(raw_bal).strip() != "" else "NAN"

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
        # Composite key: transaction_date, amount, description, activity_type, ref_no
        df_dedup = df_clean.drop_duplicates(
            subset=["transaction_date", "amount", "description", "activity_type", "ref_no"],
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

