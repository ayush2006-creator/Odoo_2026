from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TransferCreate(BaseModel):
    asset_id: int
    to_holder_id: int  # Target User.id or Department.id

class TransferResponse(BaseModel):
    id: int
    asset_id: int
    from_holder_id: int
    to_holder_id: int
    requested_by: int
    status: str
    approved_by: Optional[int] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
