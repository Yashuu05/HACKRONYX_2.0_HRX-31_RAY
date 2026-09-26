import os
import sys
import psycopg2
from dotenv import load_dotenv

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection, init_db
from db.create_tables import create_all_tables

load_dotenv()

def seed_db():
    print("Ensuring database tables exist...")
    # Initialize users table
    init_db()
    # Initialize all remaining tables
    create_all_tables()

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Ensure default demo user usr-001 exists in users table
        cur.execute("""
            INSERT INTO users (user_id, name, profession, mobile_number, birthdate)
            VALUES ('usr-001', 'Riya Sharma', 'Student', '9876543210', '2004-05-15')
            ON CONFLICT (user_id) DO NOTHING;
        """)

        # Check if transactions table already has records for usr-001
        cur.execute("SELECT COUNT(*) FROM transactions WHERE user_id = 'usr-001';")
        row = cur.fetchone()
        count = row[0] if row else 0

        if count == 0:
            print("Seeding default transactions for user 'usr-001'...")
            seed_data = [
                ('usr-001', 'income', 'Family Transfer', 4000.00, 'Family Bank Transfer', '2026-10-20', '10:30:00', 'bank_transfer', 'Completed'),
                ('usr-001', 'expense', 'UPI Merchant', 150.00, 'College Canteen UPI', '2026-10-17', '11:10:00', 'upi', 'Completed'),
                ('usr-001', 'expense', 'UPI Merchant', 350.00, 'Swiggy Food Delivery', '2026-10-18', '13:20:00', 'upi', 'Completed'),
                ('usr-001', 'expense', 'UPI Merchant', 1800.00, 'Laptop Screen Repair (UPI)', '2026-10-21', '16:45:00', 'upi', 'Completed'),
                ('usr-001', 'expense', 'Mess & Hostel', 2500.00, 'Mess & Hostel Fee Debit', '2026-10-24', '09:15:00', 'cheque', 'Protected'),
                ('usr-001', 'income', 'Stipend / Salary', 2000.00, 'Freelance Design Stipend', '2026-10-29', '17:00:00', 'upi', 'Completed'),
            ]

            insert_query = """
                INSERT INTO transactions (
                    user_id, activity_type, category, amount, description, 
                    transaction_date, transaction_time, payment_method, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
            """

            for row in seed_data:
                cur.execute(insert_query, row)

            conn.commit()
            print(f"Successfully inserted {len(seed_data)} seed transactions!")
        else:
            print(f"Transactions table already has {count} records. Skipping seed insertion.")

    except Exception as e:
        conn.rollback()
        print(f"Error seeding database: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_db()
