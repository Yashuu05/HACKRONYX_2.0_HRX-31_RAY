# Implementation Plan — CSV/XLSX Engine & Firestore Ingestion

> **Project:** AI Cashflow Guardian  
> **Module:** Core Dataset Ingestion Engine (Backend Only)  
> **Target Document:** `implementation_plan.md`  

---

## 1. Overview & Architectural Shift

The objective of this task is to implement the **Core Data Ingestion Engine** responsible for uploading, cleaning, preprocessing, and storing bank transaction datasets (`.csv` / `.xlsx`) strictly into **Google Cloud Firestore (NoSQL Database)**.

In accordance with the updated guidelines:
- **No Frontend Changes**: Work will focus exclusively on backend file processing, cleaning logic, and Firestore database integration.
- **Strict NoSQL Storage**: Cleaned transaction records will be saved into **Firestore**, using the `cashflow-guardian-main` Firebase project context.

---

## 2. Scope of Implementation

```
┌──────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌────────────────────────┐
│  Upload Endpoint │ ──► │  Cleaning & Normalization Engine                       │ ──► │ Firestore Database     │
│  (.csv / .xlsx)  │     │  • Fill nulls ("NA"/"NAN")                             │     │ (NoSQL Collection)     │
│                  │     │  • Composite Deduplication                             │     │ • `transactions`       │
│                  │     │  • Date/Amount Formatting & Activity Normalization      │     │   documents            │
└──────────────────┘     └────────────────────────────────────────────────────────┘     └────────────────────────┘
```

### Key Components to Build:
1. **Python Dependencies**:
   - Add `firebase-admin` (or `google-cloud-firestore`) and `openpyxl` to `pyproject.toml`.
2. **Firestore DB Connection (`backend/db/firestore_client.py`)**:
   - Initialize connection to Firestore database (`cashflow-guardian-main`) via Firebase Service Account.
   - Provide helper functions for batch writing transaction documents to Firestore.
3. **Data Cleaning & Normalization Engine (`backend/ingestion/processor.py`)**:
   - **Bank Dataset Columns Supported**:
     - `Date` & `Value Dt`: Parsed into standardized ISO date strings (`YYYY-MM-DD`).
     - `Withdrawal Amt.` & `Deposit Amt.`:
       - If `Withdrawal Amt.` > 0 $\rightarrow$ `activity_type = 'expense'`, `amount = Withdrawal Amt.`
       - If `Deposit Amt.` > 0 $\rightarrow$ `activity_type = 'income'`, `amount = Deposit Amt.`
     - `Closing Balance`: Captured as float.
     - `Chq./Ref.No.`: Captured or filled with `"NA"`.
   - **Narration Parsing Logic**:
     - Narration string is split by hyphen (`-`).
     - `part[0]`: `payment_method` (e.g. `UPI`, `DEBIT`, `CREDIT`).
     - `part[1]`: `merchant_name` (e.g. `ANITA MADHUKAR SHIND`).
     - `part[-1]`: `description` (e.g. `EGGS`).
   - **Null Filling & Deduplication**:
     - Empty text fields filled with `"NA"` / `"NAN"`.
     - `drop_duplicates(subset=['transaction_date', 'amount', 'description', 'activity_type'])`.
4. **FastAPI Endpoint (`main.py` / `backend/ingestion/router.py`)**:
   - `POST /api/transactions/upload-csv`: Endpoint receiving `file: UploadFile` and `user_id: str`.
   - Returns structured cleaning report (`total_rows_read`, `duplicates_removed`, `nulls_filled_count`, `inserted_count`).

---

## 3. Step-by-Step Implementation Steps

### Step 1: Install Dependencies
- Add `firebase-admin>=6.5.0` and `openpyxl>=3.1.0` to `pyproject.toml`.

### Step 2: Create Firestore Connection Layer (`backend/db/firestore_client.py`)
- Initialize `firebase_admin` SDK.
- Create `get_firestore_db()` client accessor.
- Implement `save_transactions_batch(user_id: str, transactions: list[dict])` using Firestore batch writes.

### Step 3: Implement Data Preprocessing & Cleaning Engine (`backend/ingestion/processor.py`)
- Implement `process_transaction_dataset(file_content: bytes, filename: str) -> dict`:
  1. Detect format (`.csv` vs `.xlsx`) and load into Pandas DataFrame.
  2. Map column headers dynamically to target schema (`transaction_date`, `amount`, `description`, `category`, `activity_type`, `payment_method`).
  3. Perform string null filling with `"NA"` or `"NAN"`.
  4. Perform deduplication: `df.drop_duplicates(subset=['transaction_date', 'amount', 'description'], keep='first')`.
  5. Format timestamps and cast amounts to `float`.
  6. Return cleaned dict list alongside execution summary metrics.

### Step 4: Create Upload API Endpoint (`main.py`)
- Expose `POST /api/transactions/upload-csv` with `file: UploadFile` and `user_id: str = Form("usr-001")`.
- Execute data cleaning engine, insert clean records into Firestore, and return JSON summary response.

### Step 5: Backend Ingestion Testing
- Create test script `backend/ingestion/test_ingestion.py` using sample `.csv` and `.xlsx` files to verify:
  - Successful parsing.
  - Correct filling of null fields with `"NA"`/`"NAN"`.
  - Proper removal of duplicate rows.
  - Successful document creation in Firestore.

---

## 4. Verification Plan

| Test Case | Description | Expected Outcome |
| :--- | :--- | :--- |
| **CSV Parsing & Cleaning** | Upload CSV with null descriptions and duplicate rows | Missing fields populated with `"NA"`, duplicates dropped, valid rows structured |
| **XLSX Parsing** | Upload `.xlsx` statement file | Excel buffer parsed cleanly via `openpyxl` |
| **Firestore Batch Write** | Execute upload endpoint for `user_id = "usr-001"` | Transaction documents created in Firestore collection `users/usr-001/transactions` or `transactions` |
| **Summary Response** | Inspect HTTP response | Status `201 Created` with accurate stats (`total_rows`, `duplicates_removed`, `nulls_filled`) |

---

## 5. Confirmed Design Choices

1. **Firestore Authentication**:
   - The Python backend will authenticate using a **Firebase Service Account JSON key file** (configured via `GOOGLE_APPLICATION_CREDENTIALS` environment variable or `serviceAccountKey.json`).
2. **Firestore Collection Structure**:
   - Transactions will be stored in a **root collection named `transactions`**, where each transaction document includes the field `user_id: "usr-001"`.

