from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class AllocationCreate(BaseModel):
    asset_id: int
    holder_type: str  # Employee, Department
    holder_id: int  # User.id or Department.id
    expected_return_date: Optional[date] = None

class AllocationReturn(BaseModel):
    condition_check_in_notes: Optional[str] = None

class AllocationResponse(BaseModel):
    id: int
    asset_id: int
    holder_type: str
    holder_id: int
    allocated_date: date
    expected_return_date: Optional[date] = None
    actual_return_date: Optional[date] = None
    status: str
    condition_check_in_notes: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat()
        }
