from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MaintenanceCreate(BaseModel):
    asset_id: int
    issue_description: str
    priority: Optional[str] = "Low"  # Low, Medium, High, Critical
    photo: Optional[str] = None  # File ref / URL

class MaintenanceAssign(BaseModel):
    technician_id: int

class MaintenanceResolve(BaseModel):
    resolution_notes: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: int
    asset_id: int
    raised_by: int
    issue_description: str
    priority: str
    photo: Optional[str] = None
    status: str
    approved_by: Optional[int] = None
    technician_id: Optional[int] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
