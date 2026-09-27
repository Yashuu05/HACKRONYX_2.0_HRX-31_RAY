import os
import sys
import time

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.alerts.engine import evaluate_and_record_alerts, get_user_alerts
from db.database import get_db_connection

def test_alert_responsiveness():
    test_user = "test_resp_user"
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Setup test user and constants
    cur.execute("INSERT INTO users (user_id, name) VALUES (%s, %s) ON CONFLICT (user_id) DO NOTHING;", (test_user, "Responsive Test User"))
    cur.execute("DELETE FROM alerts WHERE user_id = %s;", (test_user,))
    cur.execute("DELETE FROM transactions WHERE user_id = %s;", (test_user,))
    cur.execute("DELETE FROM constants WHERE user_id = %s;", (test_user,))
    
    # constants: weekly_budget = 5000, safety_buffer = 3000, monthly_budget = 10000
    cur.execute("""
        INSERT INTO constants (user_id, budget_month, budget_week, safety_buffer)
        VALUES (%s, 10000, 5000, 3000);
    """, (test_user,))
    
    # Initial balance: deposit 8000 income
    cur.execute("""
        INSERT INTO transactions (user_id, activity_type, category, amount, description, transaction_date, transaction_time, payment_method, status)
        VALUES (%s, 'income', 'Salary', 8000, 'Initial Income', CURRENT_DATE, '10:00:00', 'bank_transfer', 'Completed');
    """, (test_user,))
    conn.commit()
    cur.close()
    conn.close()

    print("Initial state: Net Balance = 8000, Weekly Budget = 5000, Safety Buffer = 3000")
    
    # User adds transaction of 4000 expense
    print("\nAdding transaction: Expense of INR 4000...")
    tx_4000 = {
        "user_id": test_user,
        "activity_type": "expense",
        "category": "Shopping",
        "amount": 4000.0,
        "description": "Electronics gadget purchase",
        "transaction_date": "2026-09-27"
    }
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO transactions (user_id, activity_type, category, amount, description, transaction_date, transaction_time, payment_method, status)
        VALUES (%s, 'expense', 'Shopping', 4000, 'Electronics gadget purchase', CURRENT_DATE, '10:05:00', 'upi', 'Completed');
    """, (test_user,))
    conn.commit()
    cur.close()
    conn.close()

    # Now evaluate immediately as happens on transaction creation
    start_time = time.time()
    created_alerts = evaluate_and_record_alerts(test_user, trigger_tx=tx_4000)
    elapsed_ms = (time.time() - start_time) * 1000.0

    print(f"Alert evaluation completed in {elapsed_ms:.1f}ms")
    print(f"Generated {len(created_alerts)} alerts:")
    for a in created_alerts:
        print(f" - [{a['alert_level'].upper()}] {a['alert_type']}: {a['message']}")
        
    alerts_data = get_user_alerts(test_user)
    print(f"\nTotal unread alerts in database: {alerts_data['unread_count']}")

if __name__ == "__main__":
    test_alert_responsiveness()
