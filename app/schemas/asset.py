from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List, Dict, Any

class AssetCreate(BaseModel):
    name: str
    category_id: int
    serial_number: Optional[str] = None
    qr_code: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = None
    condition: Optional[str] = "New"
    location: Optional[str] = None
    photos_docs: Optional[List[str]] = []
    custom_values: Optional[Dict[str, Any]] = {}
    is_bookable: Optional[bool] = False

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    serial_number: Optional[str] = None
    qr_code: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    photos_docs: Optional[List[str]] = None
    custom_values: Optional[Dict[str, Any]] = None
    is_bookable: Optional[bool] = None
    status: Optional[str] = None
    current_holder_type: Optional[str] = None
    current_holder_id: Optional[int] = None

class AssetTransition(BaseModel):
    next_status: str  # e.g., "Under Maintenance", "Available"

class AssetResponse(BaseModel):
    id: int
    asset_tag: str
    name: str
    category_id: int
    serial_number: Optional[str] = None
    qr_code: Optional[str] = None
    acquisition_date: Optional[date] = None
    acquisition_cost: Optional[float] = None
    condition: str
    location: Optional[str] = None
    photos_docs: List[str]
    custom_values: Dict[str, Any]
    is_bookable: bool
    status: str
    current_holder_type: str
    current_holder_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
