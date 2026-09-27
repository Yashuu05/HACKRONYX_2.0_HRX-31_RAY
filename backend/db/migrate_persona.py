"""
Migration script for Persona Creation Feature.
Establishes the 6 relational tables in Neon PostgreSQL (cashflow_db)
as specified in persona_creation.md.
"""

import os
import sys

# Ensure project root in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from db.database import get_db_connection


SCHEMA_SQL = """
-- 1. Master Persona Record
CREATE TABLE IF NOT EXISTS user_persona (
    persona_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    persona_version INTEGER DEFAULT 1,
    total_fixed_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_variable_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_expected_income NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_monthly_surplus NUMERIC(12,2),
    suggested_safety_buffer NUMERIC(12,2) NOT NULL DEFAULT 2000,
    user_safety_buffer_override NUMERIC(12,2),
    has_dependents BOOLEAN DEFAULT FALSE,
    number_of_dependents INTEGER DEFAULT 0,
    is_primary_breadwinner VARCHAR(10) DEFAULT 'no'
        CHECK (is_primary_breadwinner IN ('yes', 'no', 'shared')),
    emergency_fund_preference VARCHAR(20) DEFAULT 'none'
        CHECK (emergency_fund_preference IN ('none', '1_month', '2_months', '3_months')),
    risk_profile VARCHAR(20)
        CHECK (risk_profile IN ('conservative', 'balanced', 'flexible')),
    spending_archetype VARCHAR(30)
        CHECK (spending_archetype IN ('saver', 'balanced', 'free_spender')),
    income_earliest_date INTEGER CHECK (income_earliest_date BETWEEN 1 AND 31),
    income_latest_date INTEGER CHECK (income_latest_date BETWEEN 1 AND 31),
    setup_completed BOOLEAN DEFAULT FALSE,
    setup_step_reached INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_persona_user ON user_persona(user_id);


-- 2. Committed Monthly Fixed Outflows
CREATE TABLE IF NOT EXISTS persona_fixed_expenses (
    fixed_expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('rent', 'emi', 'utility', 'subscription', 'insurance',
                            'academic', 'family_support', 'other')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    due_day_of_month INTEGER CHECK (due_day_of_month BETWEEN 1 AND 31),
    due_day_buffer INTEGER DEFAULT 0,
    payment_mode VARCHAR(30) DEFAULT 'auto_debit'
        CHECK (payment_mode IN ('auto_debit', 'upi', 'net_banking', 'cash', 'cheque')),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user ON persona_fixed_expenses(user_id, is_active);


-- 3. Expected Monthly Variable Lifestyle Spend
CREATE TABLE IF NOT EXISTS persona_variable_expenses (
    variable_expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('food', 'transport', 'leisure', 'shopping',
                            'medical', 'travel', 'self_dev', 'other')),
    expected_monthly_amount NUMERIC(12,2) NOT NULL CHECK (expected_monthly_amount >= 0),
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_variable_expenses_user ON persona_variable_expenses(user_id, is_active);


-- 4. Income Streams (Scheduled & Variable)
CREATE TABLE IF NOT EXISTS persona_income_sources (
    income_source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    source_name VARCHAR(100) NOT NULL,
    income_type VARCHAR(30) NOT NULL
        CHECK (income_type IN ('salary', 'stipend', 'freelance', 'family_transfer', 'pension',
                               'part_time', 'commission', 'business', 'gift',
                               'savings_withdrawal', 'other')),
    stream_nature VARCHAR(20) NOT NULL DEFAULT 'scheduled'
        CHECK (stream_nature IN ('scheduled', 'variable')),
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount >= 0),
    min_amount NUMERIC(12,2),
    max_amount NUMERIC(12,2),
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly'
        CHECK (frequency IN ('monthly', 'weekly', 'biweekly', 'quarterly', 'one_time', 'irregular')),
    expected_credit_day INTEGER CHECK (expected_credit_day BETWEEN 1 AND 31),
    credit_day_buffer INTEGER DEFAULT 2,
    payment_mode VARCHAR(30) DEFAULT 'bank_transfer'
        CHECK (payment_mode IN ('bank_transfer', 'upi', 'cash', 'cheque')),
    reliability VARCHAR(20) DEFAULT 'always_on_time'
        CHECK (reliability IN ('always_on_time', 'occasionally_late', 'irregular')),
    employer_or_source VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_sources_user ON persona_income_sources(user_id, is_active, stream_nature);


-- 5. Dependent Details & Family Financial Obligations
CREATE TABLE IF NOT EXISTS persona_dependents (
    dependent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    relationship VARCHAR(30) NOT NULL
        CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'other')),
    age_group VARCHAR(20)
        CHECK (age_group IN ('child', 'adult', 'senior')),
    monthly_support_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_support_amount >= 0),
    is_fixed_transfer BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dependents_user ON persona_dependents(user_id);


-- 6. Forward Income Calendar (For Trajectory & Forecasting)
CREATE TABLE IF NOT EXISTS persona_income_schedule (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    income_source_id UUID REFERENCES persona_income_sources(income_source_id) ON DELETE SET NULL,
    expected_date DATE NOT NULL,
    expected_amount NUMERIC(12,2) NOT NULL CHECK (expected_amount >= 0),
    date_confidence VARCHAR(20) DEFAULT 'high'
        CHECK (date_confidence IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'received', 'delayed', 'cancelled')),
    actual_amount_received NUMERIC(12,2),
    matched_transaction_id UUID REFERENCES transactions(transaction_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_income_schedule_user_date ON persona_income_schedule(user_id, expected_date ASC);
CREATE INDEX IF NOT EXISTS idx_income_schedule_status ON persona_income_schedule(user_id, status);
"""


def run_migration():
    print("[Migration] Connecting to Neon PostgreSQL database...")
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("[Migration] Executing Persona schema DDL...")
        cur.execute(SCHEMA_SQL)
        conn.commit()
        print("[Migration] Schema DDL committed successfully.")

        # Verification: inspect created tables
        persona_tables = [
            "user_persona",
            "persona_fixed_expenses",
            "persona_variable_expenses",
            "persona_income_sources",
            "persona_dependents",
            "persona_income_schedule"
        ]

        print("\n[Migration Verification] Verifying created tables and column counts:")
        for t in persona_tables:
            cur.execute(
                """
                SELECT count(column_name) 
                FROM information_schema.columns 
                WHERE table_name = %s;
                """,
                (t,)
            )
            col_count = cur.fetchone()[0]
            print(f"  [OK] Table '{t}' exists with {col_count} columns.")

        print("\n[Migration Success] All 6 Persona tables are active in Neon PostgreSQL!")

    except Exception as e:
        conn.rollback()
        print(f"[Migration Failed] Error: {e}")
        raise e
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
