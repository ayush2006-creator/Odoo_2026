from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DepartmentCreate(BaseModel):
    name: str
    parent_department_id: Optional[int] = None
    department_head_id: Optional[int] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    parent_department_id: Optional[int] = None
    department_head_id: Optional[int] = None
    status: Optional[str] = None

class DepartmentResponse(BaseModel):
    id: int
    name: str
    parent_department_id: Optional[int] = None
    department_head_id: Optional[int] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
