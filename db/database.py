import os
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

_connection_pool = None

def get_connection_pool():
    global _connection_pool
    if _connection_pool is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is missing from .env file!")
        _connection_pool = ThreadedConnectionPool(1, 20, dsn=DATABASE_URL)
    return _connection_pool

class PooledConnectionWrapper:
    def __init__(self, conn, pool):
        self._conn = conn
        self._pool = pool
        self._closed = False

    def close(self):
        if not self._closed:
            try:
                self._conn.rollback()
            except Exception:
                pass
            try:
                self._pool.putconn(self._conn)
            except Exception:
                pass
            self._closed = True

    def __enter__(self):
        return self._conn.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._conn.__exit__(exc_type, exc_val, exc_tb)

    def __getattr__(self, name):
        return getattr(self._conn, name)

def get_db_connection():
    """Establish and return a pooled connection to Neon PostgreSQL database for sub-second queries."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing from .env file!")
    try:
        pool = get_connection_pool()
        raw_conn = pool.getconn()
        if raw_conn.closed != 0:
            try:
                pool.putconn(raw_conn, close=True)
            except Exception:
                pass
            raw_conn = pool.getconn()
        return PooledConnectionWrapper(raw_conn, pool)
    except Exception as e:
        # Fallback to direct connection if pool encounters an issue
        return psycopg2.connect(DATABASE_URL)

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
