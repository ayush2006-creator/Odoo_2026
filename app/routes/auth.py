from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    SECRET_KEY,
    ALGORITHM
)
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, Token
from app.services.activity_service import log_activity

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password),
        role="Employee",  # defaulted to Employee, never set via signup
        status="Active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_activity(db, new_user.id, "User Signup", "User", new_user.id, {"email": new_user.email})
    
    return new_user

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if user.status == "Inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
        
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    })
    
    log_activity(db, user.id, "User Login", "User", user.id)
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_activity(db, current_user.id, "User Logout", "User", current_user.id)
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Avoid user enumeration by returning 200 anyway
        return {"message": "If the email exists, a password reset link has been generated"}
        
    # Create a password reset token valid for 15 minutes
    reset_payload = {
        "sub": str(user.id),
        "purpose": "password_reset",
        "exp": datetime.utcnow() + timedelta(minutes=15)
    }
    reset_token = jwt.encode(reset_payload, SECRET_KEY, algorithm=ALGORITHM)
    
    log_activity(db, user.id, "Requested Password Reset", "User", user.id)
    
    # Return reset_token for testing/hackathon purposes
    return {
        "message": "Password reset token generated",
        "reset_token": reset_token
    }

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token purpose"
            )
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.hashed_password = hash_password(request.new_password)
    db.commit()
    
    log_activity(db, user.id, "Reset Password", "User", user.id)
    
    return {"message": "Password reset successfully"}

@router.get("/session", response_model=UserResponse)
def get_session(current_user: User = Depends(get_current_user)):
    return current_user