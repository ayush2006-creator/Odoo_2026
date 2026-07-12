from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.department import Department
from app.models.user import User
from app.core.security import require_admin, get_current_user
from app.schemas.department import DepartmentResponse, DepartmentCreate, DepartmentUpdate
from app.services.activity_service import log_activity

router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)

@router.get("", response_model=List[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Department).all()

@router.post("", response_model=DepartmentResponse)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    # Verify parent department exists if specified
    if dept_data.parent_department_id:
        parent = db.query(Department).filter(Department.id == dept_data.parent_department_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent department not found"
            )
            
    # Verify head employee exists if specified
    if dept_data.department_head_id:
        head = db.query(User).filter(User.id == dept_data.department_head_id).first()
        if not head:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department head employee not found"
            )

    new_dept = Department(
        name=dept_data.name,
        parent_department_id=dept_data.parent_department_id,
        department_head_id=dept_data.department_head_id,
        status="Active"
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    
    log_activity(db, admin_user.id, f"Created Department {new_dept.name}", "Department", new_dept.id)
    
    return new_dept

@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    return dept

@router.patch("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    update_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
        
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if "parent_department_id" in update_dict and update_dict["parent_department_id"]:
        if update_dict["parent_department_id"] == department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A department cannot be its own parent"
            )
        parent = db.query(Department).filter(Department.id == update_dict["parent_department_id"]).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent department not found"
            )
            
    if "department_head_id" in update_dict and update_dict["department_head_id"]:
        head = db.query(User).filter(User.id == update_dict["department_head_id"]).first()
        if not head:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department head employee not found"
            )
            
    for key, value in update_dict.items():
        setattr(dept, key, value)
        
    db.commit()
    db.refresh(dept)
    
    log_activity(db, admin_user.id, f"Updated Department {dept.name}", "Department", dept.id, update_dict)
    
    return dept

@router.delete("/{department_id}", response_model=DepartmentResponse)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
        
    # Deactivate instead of hard delete
    dept.status = "Inactive"
    db.commit()
    db.refresh(dept)
    
    log_activity(db, admin_user.id, f"Deactivated Department {dept.name}", "Department", dept.id)
    
    return dept
