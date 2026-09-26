import os
import uuid
import datetime
from typing import List, Dict, Any, Optional

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

_db_instance = None

def get_firestore_client():
    """
    Initialize and return Google Cloud Firestore client.
    Supports credentials via GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_KEY
    or serviceAccountKey.json.
    """
    global _db_instance
    if _db_instance is not None:
        return _db_instance

    if not FIREBASE_AVAILABLE:
        print("[FirestoreClient] Warning: firebase-admin is not installed. Operating in mock mode.")
        return None

    # Check for service account JSON path
    cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path or not os.path.exists(cred_path):
        # Look in workspace root as fallback
        default_path = os.path.join(os.getcwd(), "serviceAccountKey.json")
        if os.path.exists(default_path):
            cred_path = default_path

    try:
        if not firebase_admin._apps:
            if cred_path and os.path.exists(cred_path):
                print(f"[FirestoreClient] Initializing Firebase App with service account key: {cred_path}")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                print("[FirestoreClient] Initializing Firebase App with default project credentials (cashflow-guardian-main)...")
                firebase_admin.initialize_app(options={'projectId': 'cashflow-guardian-main'})
        
        _db_instance = firestore.client()
        print("[FirestoreClient] Firestore client initialized successfully.")
        return _db_instance
    except Exception as err:
        print(f"[FirestoreClient] Error initializing Firestore client: {err}")
        return None

def save_transactions_to_firestore(user_id: str, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Save list of transaction dicts into root Firestore collection 'transactions'.
    Each document stores transaction metadata and user_id.
    """
    db = get_firestore_client()
    inserted_records = []
    
    if db is None:
        print(f"[FirestoreClient Mock] Simulating insertion of {len(transactions)} transactions for user {user_id}")
        for tx in transactions:
            tx_copy = dict(tx)
            tx_copy["user_id"] = user_id
            if "transaction_id" not in tx_copy or not tx_copy["transaction_id"]:
                tx_copy["transaction_id"] = f"tx-fs-{uuid.uuid4().hex[:8]}"
            inserted_records.append(tx_copy)
        return {
            "status": "success",
            "storage_mode": "mock_memory",
            "inserted_count": len(inserted_records),
            "records": inserted_records
        }

    try:
        collection_ref = db.collection("transactions")
        batch = db.batch()
        count = 0

        for tx in transactions:
            doc_id = tx.get("transaction_id") or f"tx-{uuid.uuid4().hex[:12]}"
            doc_ref = collection_ref.document(doc_id)
            
            tx_data = {
                "transaction_id": doc_id,
                "user_id": user_id,
                "activity_type": tx.get("activity_type", "expense"),
                "category": tx.get("category", "NA"),
                "merchant": tx.get("merchant", "NA"),
                "payment_method": tx.get("payment_method", "NA"),
                "amount": float(tx.get("amount", 0.0)),
                "description": tx.get("description", "NA"),
                "ref_no": tx.get("ref_no", "NA"),
                "closing_balance": float(tx.get("closing_balance", 0.0)) if tx.get("closing_balance") not in [None, "NA", "NAN"] else None,
                "transaction_date": str(tx.get("transaction_date", datetime.date.today().isoformat())),
                "value_date": str(tx.get("value_date", tx.get("transaction_date", datetime.date.today().isoformat()))),
                "created_at": firestore.SERVER_TIMESTAMP if FIREBASE_AVAILABLE else datetime.datetime.utcnow().isoformat()
            }

            batch.set(doc_ref, tx_data)
            inserted_records.append(tx_data)
            count += 1

            # Firestore batch limit is 500 documents
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()

        if count % 400 != 0:
            batch.commit()

        return {
            "status": "success",
            "storage_mode": "firestore_live",
            "inserted_count": len(inserted_records),
            "records": inserted_records
        }
    except Exception as e:
        print(f"[FirestoreClient] Error writing batch to Firestore: {e}")
        return {
            "status": "error",
            "storage_mode": "failed",
            "error_detail": str(e),
            "inserted_count": 0,
            "records": []
        }
