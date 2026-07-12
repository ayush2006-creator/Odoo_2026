from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String, unique=True, index=True, nullable=False)  # e.g., AF-0001
    name = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey("asset_categories.id", ondelete="RESTRICT"), nullable=False)
    serial_number = Column(String, nullable=True)
    qr_code = Column(String, nullable=True)
    acquisition_date = Column(Date, nullable=True)
    acquisition_cost = Column(Numeric(10, 2), nullable=True)
    condition = Column(String, default="New")  # New, Good, Fair, Poor, Damaged
    location = Column(String, nullable=True)
    photos_docs = Column(JSON, default=list)  # array of file refs/urls
    custom_values = Column(JSON, default=dict)  # values for category-specific fields
    is_bookable = Column(Boolean, default=False)
    status = Column(String, default="Available")  # Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed
    current_holder_type = Column(String, default="None")  # Employee, Department, None
    current_holder_id = Column(Integer, nullable=True)  # Referencing User.id or Department.id
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    category = relationship("AssetCategory", back_populates="assets")
    allocations = relationship("AssetAllocation", back_populates="asset")
    bookings = relationship("Booking", back_populates="asset")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="asset")
