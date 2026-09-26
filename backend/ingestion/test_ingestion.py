import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.ingestion.processor import clean_and_parse_csv, parse_narration
from backend.db.firestore_client import save_transactions_to_firestore

def test_narration_parser():
    print("=== TEST 1: Narration Parsing Logic ===")
    sample_narration = "UPI-ANITA MADHUKAR SHIND-PAYTMQR70W1DZ@PTYS-YESB0PTMUPI-124226945456-EGGS"
    res = parse_narration(sample_narration)
    print(f"Input: {sample_narration}")
    print(f"Parsed Payment Method : {res['payment_method']}")
    print(f"Parsed Merchant       : {res['merchant']}")
    print(f"Parsed Description    : {res['description']}")
    
    assert res['payment_method'] == "UPI", f"Expected 'UPI', got {res['payment_method']}"
    assert res['merchant'] == "ANITA MADHUKAR SHIND", f"Expected 'ANITA MADHUKAR SHIND', got {res['merchant']}"
    assert res['description'] == "EGGS", f"Expected 'EGGS', got {res['description']}"
    print("-> Test 1 PASSED!\n")


def test_csv_cleaning_and_ingestion():
    print("=== TEST 2: CSV Cleaning, Null Handling & Deduplication ===")
    
    # Create sample CSV content matching exact user dataset structure
    sample_csv_content = (
        "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance\n"
        "05/06/26,UPI-ANITA MADHUKAR SHIND-PAYTMQR70W1DZ@PTYS-YESB0PTMUPI-124226945456-EGGS,00000000000,05/06/26,42,,16369.27\n"
        "05/06/26,UPI-ANITA MADHUKAR SHIND-PAYTMQR70W1DZ@PTYS-YESB0PTMUPI-124226945456-EGGS,00000000000,05/06/26,42,,16369.27\n"  # Duplicate row
        "06/06/26,UPI-RAMESH STORES-PAYTMQR@PTYS-124226945777-GROCERIES,,06/06/26,,150.00,16519.27\n"  # Null Chq/Ref & Withdrawal
        "07/06/26,DEBIT-SWIGGY FOOD ORDER-SWIGGY-124226949999-LUNCH,11111111111,07/06/26,250,,16269.27\n"
    )

    file_bytes = sample_csv_content.encode("utf-8")
    records, summary = clean_and_parse_csv(file_bytes, "test_statement.csv")

    print(f"Total Rows Read     : {summary['total_rows_read']}")
    print(f"Duplicates Removed  : {summary['duplicates_removed']}")
    print(f"Nulls Filled Count  : {summary['nulls_filled_count']}")
    print(f"Final Records Count : {summary['final_records_count']}")

    assert summary['total_rows_read'] == 4
    assert summary['duplicates_removed'] == 1, f"Expected 1 duplicate removed, got {summary['duplicates_removed']}"
    assert summary['final_records_count'] == 3

    print("\nCleaned Transaction Records:")
    for i, rec in enumerate(records, 1):
        print(f" Record {i}: {rec['transaction_date']} | {rec['activity_type'].upper()} | Rs.{rec['amount']} | Method: {rec['payment_method']} | Merchant: {rec['merchant']} | Desc: {rec['description']} | Cat: {rec['category']}")

    print("-> Test 2 PASSED!\n")

    print("=== TEST 3: Firestore Database Storage ===")
    db_res = save_transactions_to_firestore("usr-001", records)
    print(f"Storage Status : {db_res['status']}")
    print(f"Storage Mode   : {db_res['storage_mode']}")
    print(f"Inserted Count : {db_res['inserted_count']}")
    print("-> Test 3 PASSED!\n")


def test_excel_ingestion():
    print("=== TEST 4: Excel (.xlsx) Engine Ingestion ===")
    import pandas as pd
    import io

    data = {
        "Date": ["05/06/26"],
        "Narration": ["UPI-ANITA MADHUKAR SHIND-PAYTMQR70W1DZ@PTYS-YESB0PTMUPI-124226945456-EGGS"],
        "Chq./Ref.No.": ["00000000000"],
        "Value Dt": ["05/06/26"],
        "Withdrawal Amt.": [42.0],
        "Deposit Amt.": [None],
        "Closing Balance": [16369.27]
    }
    df = pd.DataFrame(data)
    excel_buf = io.BytesIO()
    with pd.ExcelWriter(excel_buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    
    records, summary = clean_and_parse_csv(excel_buf.getvalue(), "test_statement.xlsx")
    print(f"Excel Rows Read     : {summary['total_rows_read']}")
    print(f"Excel Final Records : {summary['final_records_count']}")
    assert summary['final_records_count'] == 1
    print("-> Test 4 PASSED!\n")


def test_real_hdfc_bank_statement():
    print("=== TEST 5: Real HDFC Bank Statement Structure (Preamble, Masked Dates, Comma Amounts, Footer) ===")
    
    hdfc_csv_content = (
        "HDFC BANK Ltd. Page No .: 1 Statement of accounts\n"
        "Account Branch :AMBEGAON\n"
        "MR YASH SHEKHAR CHILLAL Address :UPPER GRD FLR,SHOP NO 6,7,8 BHADALE\n"
        "COMMERCIAL COMPLEX, BLDG B PLOT NO 23 SR NO 40/1 NEAR AJINKYA MITRA\n"
        "PUNE 411046 MAHARASHTRA INDIA Phone no. :18002600/18001600\n"
        "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance\n"
        "#######,UPI-ANITA MADHUKAR SHIND-PAYTMQR70W1DZ@PTYS-YESB0PTMUPI-124226945456-EGGS,1.24227E+11,08/06/26,42,,16369.27\n"
        "08/06/26,UPI-VIGNESH VIVEK SHETTY-VIGNESHSHETTY752006@OKICICI-BCBM0000032-615985172597-UPI,0000615985172597,08/06/26,,1100,17469.27\n"
        "14/07/26,CHQ DEP CTS CLG2 MODEL COLONY PUNE - CTS: YASH TECHNOLOGY :BANK OF INDIA,0000000000910008,14/07/26,,18000,33403.43\n"
        "14/07/26,UPI-SINHGAD TECHNICAL ED-SINHGADTECHNICA564077.RZP@RXAXIS-UTIB0000RZP-126282552213-PENDING FEES,0000126282552213,14/07/26,14377,,19026.43\n"
        "STATEMENT SUMMARY :-\n"
        "Opening Balance,Debits,Credits\n"
        "16411.3,26496.99,27861.48\n"
        "Dr Count,Cr Count\n"
        "52,16\n"
        "Generated On: 17-Sep-2026 12:09 Generated By: 259097432\n"
        "--- End Of Statement ---\n"
    )

    file_bytes = hdfc_csv_content.encode("utf-8")
    records, summary = clean_and_parse_csv(file_bytes, "HDFC_Statement_Yash.csv")

    print(f"Total Rows Read     : {summary['total_rows_read']}")
    print(f"Valid Rows Parsed   : {summary['valid_rows_parsed']}")
    print(f"Final Records Count : {summary['final_records_count']}")

    assert summary['final_records_count'] == 4, f"Expected 4 records, got {summary['final_records_count']}"
    
    # Check that masked date '#######' was successfully recovered from 'Value Dt' (08/06/26 -> 2026-06-08)
    assert records[0]['transaction_date'] == "2026-06-08", f"Expected date '2026-06-08', got {records[0]['transaction_date']}"
    assert records[0]['amount'] == 42.0
    assert records[0]['category'] == "Food & Groceries"
    
    # Check large amount transaction
    assert records[2]['amount'] == 18000.0
    assert records[2]['activity_type'] == "income"

    # Check academic fee transaction
    assert records[3]['amount'] == 14377.0
    assert records[3]['category'] == "Academic & Education"

    print("Sample Parsed HDFC Statement Records:")
    for r in records:
        print(f"  {r['transaction_date']} | {r['activity_type'].upper():<7} | Rs.{r['amount']:<8} | {r['category']:<24} | Ref: {r['ref_no']}")

    print("-> Test 5 PASSED!\n")


if __name__ == "__main__":
    test_narration_parser()
    test_csv_cleaning_and_ingestion()
    test_excel_ingestion()
    test_real_hdfc_bank_statement()
    print("ALL TESTS COMPLETED SUCCESSFULLY!")

