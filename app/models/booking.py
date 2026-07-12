from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    booked_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    purpose = Column(String, nullable=True)
    status = Column(String, default="Upcoming")  # Upcoming, Ongoing, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", back_populates="bookings")
    user = relationship("User")
