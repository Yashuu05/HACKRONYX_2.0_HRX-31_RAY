from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Dict, Optional, List, Any
import uuid

app = FastAPI(
    title="SPECIFY API",
    description="Backend API for personal liquidity forecasting & user authentication",
    version="1.0.0"
)

# Enable CORS for Vite frontend running on http://localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory mock database store for users
# Initialized with a default demo user for instant Sign In testing
MOCK_USERS_DB: Dict[str, dict] = {
    "riya@college.edu.in": {
        "id": "usr-001",
        "full_name": "Riya Sharma",
        "email": "riya@college.edu.in",
        "password": "Password123!", # In production, hashed with passlib/bcrypt
        "created_at": "2026-09-17T20:00:00Z"
    }
}


# Pydantic Schemas
class SignUpRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    user: dict


@app.get("/")
def read_root():
    return {
        "service": "SPECIFY Backend",
        "status": "online",
        "registered_users_count": len(MOCK_USERS_DB)
    }


@app.post("/api/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest):
    email_clean = payload.email.lower().strip()

    # Rule 1: Email must be unique
    if email_clean in MOCK_USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in instead."
        )

    # Rule 2: Password strength validation
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters long."
        )

    # Create new user record
    new_user = {
        "id": f"usr-{uuid.uuid4().hex[:6]}",
        "full_name": payload.full_name.strip(),
        "email": email_clean,
        "password": payload.password,  # Mock store
        "created_at": "2026-09-17T20:08:00Z"
    }

    MOCK_USERS_DB[email_clean] = new_user

    # Insert new user into Neon PostgreSQL 'users' table
    try:
        from db.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO users (user_id, name)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name;
            """,
            (new_user["id"], new_user["full_name"])
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as db_err:
        print(f"Warning inserting user {new_user['id']} into Neon DB: {db_err}")

    # Generate mock access token
    token = f"mock-jwt-token-{uuid.uuid4().hex}"

    return AuthResponse(
        message="User account created successfully!",
        access_token=token,
        user={
            "id": new_user["id"],
            "user_id": new_user["id"],
            "full_name": new_user["full_name"],
            "email": new_user["email"]
        }
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email_clean = payload.email.lower().strip()

    # Rule 1: Verify email exists
    if email_clean not in MOCK_USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again."
        )

    user = MOCK_USERS_DB[email_clean]

    # Rule 2: Verify password matches
    if user["password"] != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again."
        )

    # Generate mock access token
    token = f"mock-jwt-token-{uuid.uuid4().hex}"

    return AuthResponse(
        message="Logged in successfully!",
        access_token=token,
        user={
            "id": user["id"],
            "user_id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"]
        }
    )


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Google User"
    firebase_uid: Optional[str] = None
    photo_url: Optional[str] = None


@app.post("/api/auth/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest):
    email_clean = payload.email.lower().strip()

    if email_clean not in MOCK_USERS_DB:
        uid_prefix = payload.firebase_uid[:8] if payload.firebase_uid else uuid.uuid4().hex[:6]
        user_id = f"usr-{uid_prefix}"
        MOCK_USERS_DB[email_clean] = {
            "id": user_id,
            "full_name": payload.full_name or email_clean.split("@")[0].capitalize(),
            "email": email_clean,
            "password": "",  # OAuth
            "created_at": "2026-09-26T12:00:00Z"
        }

    user = MOCK_USERS_DB[email_clean]

    # Insert/update user into Neon PostgreSQL 'users' table
    try:
        from db.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO users (user_id, name)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name;
            """,
            (user["id"], user["full_name"])
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as db_err:
        print(f"Warning inserting Google user {user['id']} into Neon DB: {db_err}")

    token = f"mock-jwt-token-{uuid.uuid4().hex}"

    return AuthResponse(
        message="Google authentication successful!",
        access_token=token,
        user={
            "id": user["id"],
            "user_id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"]
        }
    )


@app.get("/api/auth/users")
def get_mock_users():
    """Debug endpoint to inspect mock database state"""
    return {
        "total": len(MOCK_USERS_DB),
        "users": [
            {"id": u["id"], "full_name": u["full_name"], "email": u["email"]}
            for u in MOCK_USERS_DB.values()
        ]
    }


# Schemas for User Profile and AI Feedback
class UserProfileSchema(BaseModel):
    user_id: str
    name: str
    profession: Optional[str] = None
    mobile_number: Optional[str] = None
    birthdate: Optional[str] = None

class AIFeedbackSchema(BaseModel):
    user_id: str
    chat_id: Optional[str] = None
    feedback_action: str  # 'accepted', 'rejected', 'modified'
    user_comment: Optional[str] = None

class UserConstantsSchema(BaseModel):
    user_id: str = "usr-001"
    budget_month: int
    budget_week: int
    safety_buffer: int

@app.post("/api/users/profile")
def update_user_profile(payload: UserProfileSchema):
    """Upsert personal information into Neon PostgreSQL 'users' table."""
    try:
        from db.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        
        upsert_query = """
            INSERT INTO users (user_id, name, profession, mobile_number, birthdate)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
                name = EXCLUDED.name,
                profession = EXCLUDED.profession,
                mobile_number = EXCLUDED.mobile_number,
                birthdate = EXCLUDED.birthdate;
        """
        birthdate_val = payload.birthdate if payload.birthdate else None
        cur.execute(upsert_query, (
            payload.user_id,
            payload.name,
            payload.profession,
            payload.mobile_number,
            birthdate_val
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": "Personal information updated successfully in PostgreSQL!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/users/profile/{user_id}")
def get_user_profile(user_id: str):
    """Fetch personal information from Neon PostgreSQL 'users' table."""
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT user_id, name, profession, mobile_number, birthdate FROM users WHERE user_id = %s;", (user_id,))
        user_row = cur.fetchone()
        cur.close()
        conn.close()
        if not user_row:
            return {"user_id": user_id, "name": "", "profession": "", "mobile_number": "", "birthdate": ""}
        return dict(user_row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.post("/api/users/constants")
def save_user_constants(payload: UserConstantsSchema):
    """
    Save user budget constants (monthly budget, weekly budget, safety buffer) in Neon PostgreSQL 'constants' table.
    """
    try:
        from db.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()

        # Clean existing constants for user to keep single current record
        cur.execute("DELETE FROM constants WHERE user_id = %s;", (payload.user_id,))
        
        insert_query = """
            INSERT INTO constants (user_id, budget_month, budget_week, safety_buffer)
            VALUES (%s, %s, %s, %s);
        """
        cur.execute(insert_query, (
            payload.user_id,
            payload.budget_month,
            payload.budget_week,
            payload.safety_buffer
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {
            "status": "success",
            "message": "Budget & safety buffer constants saved successfully in PostgreSQL database!",
            "constants": {
                "user_id": payload.user_id,
                "budget_month": payload.budget_month,
                "budget_week": payload.budget_week,
                "safety_buffer": payload.safety_buffer
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error saving constants: {str(e)}")


@app.get("/api/users/constants/{user_id}")
def get_user_constants(user_id: str = "usr-001"):
    """
    Fetch latest user budget constants from Neon PostgreSQL 'constants' table.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT user_id, budget_month, budget_week, safety_buffer, created_at FROM constants WHERE user_id = %s ORDER BY created_at DESC LIMIT 1;",
            (user_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {
                "user_id": user_id,
                "budget_month": 10000,
                "budget_week": 5000,
                "safety_buffer": 3000
            }
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error fetching constants: {str(e)}")



@app.post("/api/feedback")
def submit_ai_feedback(payload: AIFeedbackSchema):
    """Log AI feedback into Neon PostgreSQL 'ai_feedback' table."""
    try:
        from db.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()

        # Ensure user exists to satisfy foreign key constraint
        cur.execute(
            """
            INSERT INTO users (user_id, name)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO NOTHING;
            """,
            (payload.user_id, f"User {payload.user_id}")
        )
        
        insert_query = """
            INSERT INTO ai_feedback (user_id, chat_id, feedback_action, user_comment)
            VALUES (%s, %s, %s, %s);
        """
        chat_id_val = payload.chat_id if payload.chat_id else None
        cur.execute(insert_query, (
            payload.user_id,
            chat_id_val,
            payload.feedback_action,
            payload.user_comment
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": "AI feedback logged successfully in PostgreSQL!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/api/feedback/{user_id}")
def get_user_ai_feedbacks(user_id: str = "usr-001", limit: int = 20):
    """
    Fetch stored AI feedback entries for user from Neon PostgreSQL 'ai_feedback' table.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT 
                feedback_id::text,
                user_id,
                chat_id::text,
                feedback_action,
                user_comment,
                created_at::text as created_at
            FROM ai_feedback
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        return {
            "status": "success",
            "user_id": user_id,
            "total_count": len(rows),
            "feedbacks": [dict(r) for r in rows]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error fetching AI feedback: {str(e)}")


@app.delete("/api/users/{user_id}")
def delete_user_account(user_id: str):
    """Delete user profile and related records permanently from Neon PostgreSQL."""
    try:
        from db.database import get_db_connection
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE user_id = %s;", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success", "message": f"Account {user_id} deleted permanently from database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================
# TRANSACTIONS ENDPOINTS (PostgreSQL Integration)
# ============================================================

class TransactionCreateSchema(BaseModel):
    user_id: str = "usr-001"
    activity_type: str  # 'income' | 'expense'
    category: str
    amount: float
    description: str
    transaction_date: Optional[str] = None
    transaction_time: Optional[str] = None
    payment_method: Optional[str] = "upi"
    status: Optional[str] = "Completed"


@app.get("/api/transactions")
def get_transactions(
    user_id: str = "usr-001",
    activity_type: Optional[str] = "all",
    search: Optional[str] = None,
    limit: Optional[int] = None
):
    """
    Fetch transactions for user from Neon PostgreSQL.
    Computes dynamic running net balance for each row chronologically.
    Filters by activity_type ('all', 'income', 'expense') using PostgreSQL queries.
    Supports optional limit parameter to cap returned transactions.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Fetch all user transactions sorted chronologically to calculate running net balance
        chrono_query = """
            SELECT 
                transaction_id,
                user_id,
                activity_type,
                category,
                amount,
                description,
                transaction_date::text as transaction_date,
                transaction_time::text as transaction_time,
                payment_method,
                status,
                created_at
            FROM transactions
            WHERE user_id = %s
            ORDER BY transaction_date ASC, transaction_time ASC, created_at ASC;
        """
        cur.execute(chrono_query, (user_id,))
        all_rows = cur.fetchall()
        cur.close()
        conn.close()

        # 2. Compute running net balance per transaction
        running_balance = 0.0
        enriched_rows = []

        for row in all_rows:
            amt = float(row['amount'])
            if row['activity_type'] == 'income':
                running_balance += amt
            else:
                running_balance -= amt
            
            row_dict = dict(row)
            row_dict['amount'] = amt
            row_dict['id'] = row_dict['transaction_id']
            row_dict['type'] = row_dict['activity_type']
            row_dict['date'] = row_dict['transaction_date']
            row_dict['time'] = row_dict['transaction_time']
            row_dict['net_balance'] = round(running_balance, 2)
            enriched_rows.append(row_dict)

        # 3. Filter by activity_type and search keyword if provided
        filtered = enriched_rows

        if activity_type and activity_type.lower() in ('income', 'expense'):
            filtered = [r for r in filtered if r['activity_type'] == activity_type.lower()]

        if search and search.strip():
            kw = search.strip().lower()
            filtered = [
                r for r in filtered
                if kw in r['description'].lower() or kw in r['category'].lower()
            ]

        # 4. Sort descending by date/time for real-time display in dashboard
        filtered.sort(
            key=lambda x: (x['transaction_date'], x['transaction_time'], str(x['created_at'])),
            reverse=True
        )

        if limit and limit > 0:
            filtered = filtered[:limit]

        return {
            "status": "success",
            "total_count": len(filtered),
            "transactions": filtered
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error fetching transactions: {str(e)}")


@app.get("/api/transactions/recent")
def get_recent_transactions(
    user_id: str = "usr-001",
    limit: int = 5
):
    """
    Fetch top recent account activity transactions directly from Neon PostgreSQL sorted by latest date.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT 
                transaction_id as id,
                transaction_id,
                user_id,
                activity_type as type,
                activity_type,
                category,
                amount,
                description,
                transaction_date::text as date,
                transaction_date::text as transaction_date,
                transaction_time::text as time,
                transaction_time::text as transaction_time,
                payment_method,
                status,
                created_at
            FROM transactions
            WHERE user_id = %s
            ORDER BY transaction_date DESC, transaction_time DESC, created_at DESC
            LIMIT %s;
        """
        cur.execute(query, (user_id, limit))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        recent = []
        for r in rows:
            rd = dict(r)
            rd['amount'] = float(rd['amount'])
            recent.append(rd)

        return {
            "status": "success",
            "total_count": len(recent),
            "transactions": recent
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error fetching recent transactions: {str(e)}")


@app.get("/api/transactions/summary")
def get_transactions_summary(user_id: str = "usr-001"):
    """
    Calculate total_income, total_spendings (expense), and net_balance (total_income - total_spendings)
    from Neon PostgreSQL 'transactions' table using SQL aggregation GROUP BY activity_type.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT activity_type AS activity, COALESCE(SUM(amount), 0) AS total
            FROM transactions
            WHERE user_id = %s
            GROUP BY activity_type;
        """
        cur.execute(query, (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()

        total_income = 0.0
        total_expense = 0.0

        for row in rows:
            act = (row['activity'] or '').lower().strip()
            tot = float(row['total'] or 0.0)
            if act == 'income':
                total_income += tot
            elif act == 'expense':
                total_expense += tot

        net_balance = round(total_income - total_expense, 2)

        return {
            "status": "success",
            "user_id": user_id,
            "total_income": round(total_income, 2),
            "total_spendings": round(total_expense, 2),
            "net_balance": net_balance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error computing transaction summary: {str(e)}")


@app.get("/api/analytics")
def get_analytics(
    user_id: str = "usr-001",
    timeframe: str = "30d",
    granularity: str = "weekly"
):
    """
    Fetch comprehensive financial analytics directly from Neon PostgreSQL using SQL aggregations.
    Includes category breakdowns, time series trends, spending-to-income ratios, top merchants, and day-of-week patterns.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor
        import datetime

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Determine date filter
        today = datetime.date.today()
        min_date = None
        if timeframe == "7d":
            min_date = today - datetime.timedelta(days=7)
        elif timeframe == "30d":
            min_date = today - datetime.timedelta(days=30)
        elif timeframe == "90d":
            min_date = today - datetime.timedelta(days=90)
        elif timeframe == "180d":
            min_date = today - datetime.timedelta(days=180)
        elif timeframe == "1y":
            min_date = today - datetime.timedelta(days=365)
        # 'all' leaves min_date = None

        date_clause = ""
        params_base = [user_id]
        if min_date:
            date_clause = " AND transaction_date >= %s"
            params_base.append(min_date)

        # 2. Expense Category Breakdown
        expense_cat_query = f"""
            SELECT category, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS count
            FROM transactions
            WHERE user_id = %s AND activity_type = 'expense' {date_clause}
            GROUP BY category
            ORDER BY total_amount DESC;
        """
        cur.execute(expense_cat_query, params_base)
        expense_cat_rows = cur.fetchall()

        # 3. Income Category Breakdown
        income_cat_query = f"""
            SELECT category, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS count
            FROM transactions
            WHERE user_id = %s AND activity_type = 'income' {date_clause}
            GROUP BY category
            ORDER BY total_amount DESC;
        """
        cur.execute(income_cat_query, params_base)
        income_cat_rows = cur.fetchall()

        # 4. Overall Totals & Ratios
        total_income = sum(float(r['total_amount']) for r in income_cat_rows)
        total_expense = sum(float(r['total_amount']) for r in expense_cat_rows)
        net_saved = round(total_income - total_expense, 2)
        
        spending_ratio = round((total_expense / total_income * 100), 1) if total_income > 0 else (100.0 if total_expense > 0 else 0.0)
        savings_rate = round((net_saved / total_income * 100), 1) if total_income > 0 else 0.0

        days_count = (today - min_date).days if min_date else 30
        if days_count <= 0:
            days_count = 1
        avg_daily_spend = round(total_expense / days_count, 2)

        # 5. Time Series (Weekly or Monthly)
        trunc_unit = 'week' if granularity.lower() == 'weekly' else 'month'
        timeseries_query = f"""
            SELECT 
                DATE_TRUNC('{trunc_unit}', transaction_date)::date AS period_start,
                activity_type,
                COALESCE(SUM(amount), 0) AS total_amount
            FROM transactions
            WHERE user_id = %s {date_clause}
            GROUP BY period_start, activity_type
            ORDER BY period_start ASC;
        """
        cur.execute(timeseries_query, params_base)
        ts_rows = cur.fetchall()

        # Map timeseries rows into periods
        periods_map = {}
        for r in ts_rows:
            p_str = r['period_start'].strftime("%Y-%m-%d")
            if p_str not in periods_map:
                periods_map[p_str] = {"period": p_str, "income": 0.0, "expense": 0.0, "net": 0.0}
            amt = float(r['total_amount'])
            if r['activity_type'] == 'income':
                periods_map[p_str]['income'] += amt
            else:
                periods_map[p_str]['expense'] += amt
            periods_map[p_str]['net'] = round(periods_map[p_str]['income'] - periods_map[p_str]['expense'], 2)

        timeseries = list(periods_map.values())

        # 6. Top Merchants / Descriptions
        merchants_query = f"""
            SELECT COALESCE(description, category) AS name, category, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS count
            FROM transactions
            WHERE user_id = %s AND activity_type = 'expense' {date_clause}
            GROUP BY COALESCE(description, category), category
            ORDER BY total_amount DESC
            LIMIT 6;
        """
        cur.execute(merchants_query, params_base)
        merchant_rows = cur.fetchall()

        # 7. Day of Week Pattern
        dow_query = f"""
            SELECT EXTRACT(ISODOW FROM transaction_date)::int AS dow, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS count
            FROM transactions
            WHERE user_id = %s AND activity_type = 'expense' {date_clause}
            GROUP BY dow
            ORDER BY dow;
        """
        cur.execute(dow_query, params_base)
        dow_rows = cur.fetchall()
        
        dow_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        dow_map = {i: {"day": dow_names[i-1], "amount": 0.0, "count": 0} for i in range(1, 8)}
        for r in dow_rows:
            d_idx = int(r['dow'])
            if 1 <= d_idx <= 7:
                dow_map[d_idx]["amount"] = float(r['total_amount'])
                dow_map[d_idx]["count"] = int(r['count'])

        dow_pattern = list(dow_map.values())

        cur.close()
        conn.close()

        return {
            "status": "success",
            "timeframe": timeframe,
            "granularity": granularity,
            "summary": {
                "total_income": round(total_income, 2),
                "total_expense": round(total_expense, 2),
                "net_saved": net_saved,
                "spending_ratio": spending_ratio,
                "savings_rate": savings_rate,
                "avg_daily_spend": avg_daily_spend
            },
            "expense_categories": [
                {
                    "category": r['category'],
                    "amount": float(r['total_amount']),
                    "count": int(r['count']),
                    "percentage": round((float(r['total_amount']) / total_expense * 100), 1) if total_expense > 0 else 0
                }
                for r in expense_cat_rows
            ],
            "income_categories": [
                {
                    "category": r['category'],
                    "amount": float(r['total_amount']),
                    "count": int(r['count']),
                    "percentage": round((float(r['total_amount']) / total_income * 100), 1) if total_income > 0 else 0
                }
                for r in income_cat_rows
            ],
            "timeseries": timeseries,
            "top_merchants": [
                {
                    "name": r['name'],
                    "category": r['category'],
                    "amount": float(r['total_amount']),
                    "count": int(r['count'])
                }
                for r in merchant_rows
            ],
            "dow_pattern": dow_pattern
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error generating analytics: {str(e)}")



@app.get("/api/shortfall/analysis")
def get_shortfall_analysis(user_id: str = "usr-001", horizon_days: int = 14):
    """
    Perform 14-day shortfall risk analysis, trajectory forecasting, algorithmic root-cause reasoning,
    and rule-based mitigation strategy generation.
    """
    try:
        from backend.shortfall_detection import (
            calculate_shortfall_trajectory,
            analyze_shortfall_reasons,
            generate_mitigation_strategies
        )

        trajectory_data = calculate_shortfall_trajectory(user_id=user_id, horizon_days=horizon_days)
        reasoning_data = analyze_shortfall_reasons(trajectory_data)
        mitigation_strategies = generate_mitigation_strategies(trajectory_data, reasoning_data)

        return {
            "status": "success",
            "analysis": trajectory_data,
            "reasoning": reasoning_data,
            "mitigation_strategies": mitigation_strategies
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shortfall analysis error: {str(e)}")





@app.post("/api/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreateSchema):
    """
    Insert a new transaction into Neon PostgreSQL database.
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor
        import datetime

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        tx_date = payload.transaction_date or datetime.date.today().isoformat()
        tx_time = payload.transaction_time or datetime.datetime.now().strftime("%H:%M:%S")

        target_user_id = payload.user_id or "usr-001"

        # Ensure user exists in 'users' table to satisfy Foreign Key constraint
        cur.execute(
            """
            INSERT INTO users (user_id, name)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO NOTHING;
            """,
            (target_user_id, "User " + target_user_id)
        )

        insert_query = """
            INSERT INTO transactions (
                user_id, activity_type, category, amount, description,
                transaction_date, transaction_time, payment_method, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING 
                transaction_id, user_id, activity_type, category, amount, description,
                transaction_date::text as transaction_date,
                transaction_time::text as transaction_time,
                payment_method, status, created_at;
        """

        cur.execute(insert_query, (
            target_user_id,
            payload.activity_type.lower(),
            payload.category,
            payload.amount,
            payload.description,
            tx_date,
            tx_time,
            payload.payment_method or "upi",
            payload.status or "Completed"
        ))

        new_row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        res_dict = dict(new_row)
        res_dict['amount'] = float(res_dict['amount'])

        return {
            "status": "success",
            "message": "Transaction recorded successfully in PostgreSQL!",
            "transaction": res_dict
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error creating transaction: {str(e)}")


class NaturalLanguageTransactionSchema(BaseModel):
    text: str
    transaction_date: Optional[str] = None
    user_id: Optional[str] = "usr-001"


@app.post("/api/transactions/natural-language", status_code=status.HTTP_201_CREATED)
def parse_and_create_natural_language_transaction(payload: NaturalLanguageTransactionSchema):
    """
    Parse a natural language financial statement using keyword extraction and LLM fallback,
    then store the structured record directly into Neon PostgreSQL.
    """
    text_clean = payload.text.strip()
    if not text_clean:
        raise HTTPException(status_code=400, detail="Transaction text cannot be empty.")

    try:
        from backend.transaction_categorization.natural_language.auto_text_extract import parse_transaction
        from backend.transaction_categorization.natural_language.llm_fallback import FallBackLLM
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor
        import datetime

        # 1. Parse using keyword matching script
        parsed = parse_transaction(text_clean)
        parsed_dict = parsed.to_dict()

        # 2. Check confidence & required fields for LLM fallback (< 0.5 confidence or missing amount)
        if (parsed_dict.get("confidence", 0) < 0.5 or 
            not parsed_dict.get("amount") or 
            not parsed_dict.get("transaction_type")):
            print(f"Keyword extraction confidence low ({parsed_dict.get('confidence')}), routing to LLM Fallback...")
            try:
                fallback_inst = FallBackLLM()
                llm_result = fallback_inst.llm_fallback_pipeline(user_text=text_clean)
                if llm_result and isinstance(llm_result, dict):
                    if llm_result.get("transaction_type"):
                        parsed_dict["transaction_type"] = llm_result["transaction_type"]
                    if llm_result.get("amount"):
                        parsed_dict["amount"] = float(llm_result["amount"])
                    if llm_result.get("category"):
                        parsed_dict["category"] = llm_result["category"]
                    if llm_result.get("description"):
                        parsed_dict["description"] = llm_result["description"]
                    if llm_result.get("transaction_method"):
                        parsed_dict["payment_method"] = llm_result["transaction_method"]
            except Exception as fallback_err:
                print(f"LLM fallback error: {fallback_err}")

        # Validate extracted amount
        amount_val = float(parsed_dict.get("amount") or 0.0)
        if amount_val <= 0:
            raise HTTPException(
                status_code=422,
                detail="Could not detect a valid amount from text. Please include an amount (e.g. 'spent 500 on pizza')."
            )

        activity_type = (parsed_dict.get("transaction_type") or "expense").lower()
        if activity_type not in ("income", "expense"):
            activity_type = "expense"

        cat_raw = parsed_dict.get("category") or "other"
        cat_formatted = cat_raw.replace("_", " ").title()

        desc_val = (parsed_dict.get("description") or text_clean).strip()
        pay_method = (parsed_dict.get("payment_method") or "upi").lower()

        tx_date = payload.transaction_date or datetime.date.today().isoformat()
        tx_time = datetime.datetime.now().strftime("%H:%M:%S")

        # 3. Store into Neon PostgreSQL database
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        target_user_id = payload.user_id or "usr-001"

        # Ensure user exists in 'users' table to satisfy Foreign Key constraint
        cur.execute(
            """
            INSERT INTO users (user_id, name)
            VALUES (%s, %s)
            ON CONFLICT (user_id) DO NOTHING;
            """,
            (target_user_id, "User " + target_user_id)
        )

        insert_query = """
            INSERT INTO transactions (
                user_id, activity_type, category, amount, description,
                transaction_date, transaction_time, payment_method, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING 
                transaction_id, user_id, activity_type, category, amount, description,
                transaction_date::text as transaction_date,
                transaction_time::text as transaction_time,
                payment_method, status, created_at;
        """

        cur.execute(insert_query, (
            target_user_id,
            activity_type,
            cat_formatted,
            amount_val,
            desc_val,
            tx_date,
            tx_time,
            pay_method,
            "Completed"
        ))

        new_row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not new_row:
            raise HTTPException(status_code=500, detail="Failed to create transaction record in database.")

        res_dict = dict(new_row)
        res_dict["amount"] = float(res_dict["amount"])

        return {
            "status": "success",
            "message": "Transaction added successfully!",
            "parsed_result": parsed_dict,
            "transaction": res_dict
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process natural language transaction: {str(e)}")


# ============================================================
# LANGCHAIN AI CHAT STREAMING ENDPOINT (Neon DB + LCEL)
# ============================================================

class AIChatStreamRequest(BaseModel):
    query: str
    user_id: Optional[str] = "usr-001"
    conversation_history: Optional[List[Dict[str, Any]]] = []


@app.post("/api/ai/chat/stream")
async def chat_stream_endpoint(payload: AIChatStreamRequest):
    """
    Real-time Server-Sent Events (SSE) streaming endpoint powered by LangChain framework,
    sub-15ms pre-calculated SQL metrics engine, and in-context user feedback learning.
    """
    try:
        from backend.ai_agent.lc_orchestrator import stream_ai_chat_response

        return StreamingResponse(
            stream_ai_chat_response(
                query=payload.query,
                user_id=payload.user_id or "usr-001",
                conversation_history=payload.conversation_history or []
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initiating AI chat stream: {str(e)}")


@app.get("/api/ai/chat/history/{user_id}")
def get_ai_chat_history(user_id: str, limit: int = 50):
    """
    Fetch stored AI conversation history from Neon PostgreSQL `ai_chat` table.
    Returns the most recent `limit` conversation turns for the given user, sorted newest-first.
    Schema: chat_id, user_query, ai_response, safe_to_spend_suggested, created_at
    """
    try:
        from db.database import get_db_connection
        from psycopg2.extras import RealDictCursor

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            """
            SELECT
                chat_id::text,
                user_id,
                user_query,
                ai_response,
                safe_to_spend_suggested,
                created_at
            FROM ai_chat
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        history = []
        for r in rows:
            d = dict(r)
            if d.get("safe_to_spend_suggested") is not None:
                d["safe_to_spend_suggested"] = float(d["safe_to_spend_suggested"])
            d["created_at"] = str(d.get("created_at", ""))
            history.append(d)

        return {
            "status": "success",
            "user_id": user_id,
            "total_count": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error fetching AI chat history: {str(e)}")


@app.delete("/api/ai/chat/history/{user_id}")
def clear_ai_chat_history(user_id: str):
    """
    Delete all AI chat conversation records for a user from the Neon PostgreSQL ai_chat table.
    Also cascades to ai_feedback entries linked to these chat records (SET NULL via FK).
    """
    try:
        from db.database import get_db_connection

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("DELETE FROM ai_chat WHERE user_id = %s;", (user_id,))
        deleted_count = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()

        return {
            "status": "success",
            "message": f"Cleared {deleted_count} AI chat record(s) for user {user_id}.",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error clearing AI chat history: {str(e)}")


# ============================================================
# CSV / DATASET INGESTION ENDPOINT (Pre-processing + Firestore DB)
# ============================================================

@app.post("/api/transactions/upload-csv", status_code=status.HTTP_201_CREATED)
async def upload_csv_transactions(
    file: UploadFile = File(...),
    user_id: str = Form("usr-001")
):
    """
    Ingest, clean, parse, and store CSV/XLSX bank datasets into Firestore NoSQL DB.
    Performs:
      - Null filling ("NA"/"NAN")
      - Narration string parsing (splits '-' for payment_method, merchant, description)
      - Composite key deduplication
      - Batch insertion to Firestore 'transactions' collection
    """
    filename = file.filename or "statement.csv"
    if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file extension. Please upload a .csv or .xlsx bank statement file."
        )

    try:
        from backend.ingestion.processor import clean_and_parse_csv
        from backend.db.firestore_client import save_transactions_to_firestore

        file_bytes = await file.read()
        
        # 1. Clean, Parse, and Deduplicate dataset
        cleaned_records, cleaning_summary = clean_and_parse_csv(file_bytes, filename)

        if not cleaned_records:
            return {
                "status": "warning",
                "message": "File processed but zero valid transaction records were found.",
                "summary": cleaning_summary,
                "inserted_count": 0
            }

        # 2. Save directly into Firestore NoSQL Database
        db_result = save_transactions_to_firestore(user_id, cleaned_records)

        return {
            "status": "success",
            "message": f"Successfully ingested and cleaned dataset '{filename}' into Firestore!",
            "summary": cleaning_summary,
            "storage_details": db_result,
            "sample_cleaned_records": cleaned_records[:5]
        }

    except Exception as e:
        print(f"[UploadCSV] Ingestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and ingest dataset: {str(e)}"
        )
