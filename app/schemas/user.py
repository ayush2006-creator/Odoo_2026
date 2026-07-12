from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    status: Optional[str] = None  # Active, Inactive

class UserRoleUpdate(BaseModel):
    role: str  # Employee, DepartmentHead, AssetManager, Admin

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    status: str
    department_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }