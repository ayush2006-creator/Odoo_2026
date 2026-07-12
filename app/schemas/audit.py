from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List

class AuditCycleCreate(BaseModel):
    name: str
    scope_type: str  # Department, Location
    scope_value: str  # e.g., "Engineering" or "Building A"
    date_range_start: date
    date_range_end: date

class AuditCycleResponse(BaseModel):
    id: int
    name: str
    scope_type: str
    scope_value: str
    date_range_start: date
    date_range_end: date
    status: str
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat()
        }

class AuditorsAssign(BaseModel):
    auditor_ids: List[int]

class AuditItemUpdate(BaseModel):
    result: str  # Verified, Missing, Damaged
    notes: Optional[str] = None

class AuditItemResponse(BaseModel):
    id: int
    audit_cycle_id: int
    asset_id: int
    verified_by: Optional[int] = None
    result: Optional[str] = None
    notes: Optional[str] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class DiscrepancyResponse(BaseModel):
    id: int
    audit_cycle_id: int
    asset_id: int
    discrepancy_type: str
    resolution_status: str
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
