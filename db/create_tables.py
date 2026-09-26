import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import sys
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0,project_root)
from db.database import get_db_connection

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def create_transaction_table():
    """
    Creates transactions table
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('income', 'expense')),
            category VARCHAR(100) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
            description TEXT,
            transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
            transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
            payment_method VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'Completed',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Transactions table created successfully!")

def create_alerts_table():
    """
    Creates alerts table
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('low', 'mid', 'high', 'critical')),
            alert_type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Alerts table created successfully!")

def create_forecasts_table():
    """
    Creates forecasts / predictions table
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS forecasts (
            forecast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            forecast_date DATE NOT NULL,
            predicted_balance NUMERIC(12, 2) NOT NULL,
            min_range NUMERIC(12, 2) NOT NULL,
            max_range NUMERIC(12, 2) NOT NULL,
            generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_user_forecast_date UNIQUE (user_id, forecast_date)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Forecasts table created successfully!")

def create_ai_chat_table():
    """
    Creates AI chat table
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ai_chat (
            chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            user_query TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            safe_to_spend_suggested NUMERIC(12, 2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("AI chat table created successfully!")

def create_ai_feedback_table():
    """
    Creates AI feedback table
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ai_feedback (
            feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            chat_id UUID REFERENCES ai_chat(chat_id) ON DELETE SET NULL,
            feedback_action VARCHAR(20) NOT NULL CHECK (feedback_action IN ('accepted', 'rejected', 'modified')),
            user_comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("AI feedback table created successfully!")

def create_constants_table():
    """
    creates 'constants' table which includes 'budget','safety buffer'
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS constants (
            constant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            budget_month INTEGER NOT NULL,
            budget_week INTEGER NOT NULL,
            safety_buffer INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """
    )
    conn.commit()
    cur.close()
    conn.close()
    print("Constants table created successfully!")


def create_all_tables():
    create_transaction_table()
    create_alerts_table()
    create_forecasts_table()
    create_ai_chat_table()
    create_ai_feedback_table()
    create_constants_table()

if __name__ == "__main__":
    create_all_tables()
