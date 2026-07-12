from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.core.security import require_admin, get_current_user
from app.schemas.user import UserResponse, UserUpdate, UserRoleUpdate
from app.services.activity_service import log_activity

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)

@router.get("", response_model=List[UserResponse])
def list_employees(
    department_id: Optional[int] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)
    if department_id is not None:
        query = query.filter(User.department_id == department_id)
    if role is not None:
        query = query.filter(User.role == role)
    if status is not None:
        query = query.filter(User.status == status)
    return query.all()

@router.get("/{employee_id}", response_model=UserResponse)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == employee_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return user

@router.patch("/{employee_id}", response_model=UserResponse)
def update_employee(
    employee_id: int,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == employee_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)
        
    db.commit()
    db.refresh(user)
    
    log_activity(db, admin_user.id, f"Updated Employee {user.name}", "User", user.id, update_dict)
    
    return user

@router.patch("/{employee_id}/role", response_model=UserResponse)
def update_employee_role(
    employee_id: int,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == employee_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Check if role is valid
    valid_roles = ["Employee", "DepartmentHead", "AssetManager", "Admin"]
    if role_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of {valid_roles}"
        )
        
    old_role = user.role
    user.role = role_data.role
    db.commit()
    db.refresh(user)
    
    log_activity(
        db, 
        admin_user.id, 
        f"Promoted Employee {user.name} from {old_role} to {user.role}", 
        "User", 
        user.id, 
        {"old_role": old_role, "new_role": user.role}
    )
    
    return user
