from fastapi import FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Dict, Optional, List, Any
import uuid

app = FastAPI(
    title="AI Cashflow Guardian API",
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
        "service": "AI Cashflow Guardian Backend",
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

    # Generate mock access token
    token = f"mock-jwt-token-{uuid.uuid4().hex}"

    return AuthResponse(
        message="User account created successfully!",
        access_token=token,
        user={
            "id": new_user["id"],
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