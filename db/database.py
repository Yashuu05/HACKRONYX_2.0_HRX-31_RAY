import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Establish and return a connection to Neon PostgreSQL database."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing from .env file!")
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def init_db():
    """Initialize database schema including 'users' table."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    profession VARCHAR(255),
                    mobile_number VARCHAR(10),
                    birthdate DATE
                );
            """)
            conn.commit()
            print("PostgreSQL 'users' table initialized successfully.")
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
