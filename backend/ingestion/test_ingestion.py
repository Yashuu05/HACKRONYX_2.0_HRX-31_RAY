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

if __name__ == "__main__":
    test_narration_parser()
    test_csv_cleaning_and_ingestion()
    print("ALL TESTS COMPLETED SUCCESSFULLY!")
