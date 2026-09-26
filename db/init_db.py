import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def setup_database():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing from .env file!")

    print(f"Connecting to PostgreSQL database at Neon.com...")
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Create 'users' table
        create_table_query = """
        CREATE TABLE IF NOT EXISTS users (
            user_id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            profession VARCHAR(255),
            mobile_number VARCHAR(10),
            birthdate DATE
        );
        """
        cursor.execute(create_table_query)
        conn.commit()

        # Verify table creation by querying information_schema
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        """)
        columns = cursor.fetchall()
        
        if columns:
            print("Successfully connected to Neon PostgreSQL database!")
            print("Table 'users' is successfully created/verified with the following structure:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (Max Length: {col[2]})")
        else:
            print("Error: 'users' table verification failed.")

        cursor.close()
    except Exception as e:
        print(f"Failed to connect or create table in PostgreSQL database: {e}")
        raise e
    finally:
        if conn is not None:
            conn.close()

if __name__ == "__main__":
    setup_database()
