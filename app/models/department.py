from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    department_head_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="Active")  # Active, Inactive
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent_department = relationship("Department", remote_side=[id], backref="sub_departments")
    department_head = relationship("User", foreign_keys=[department_head_id])
    employees = relationship("User", foreign_keys="[User.department_id]", back_populates="department")
