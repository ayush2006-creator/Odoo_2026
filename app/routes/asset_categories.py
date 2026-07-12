from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.category import AssetCategory
from app.models.user import User
from app.core.security import require_admin, get_current_user
from app.schemas.category import AssetCategoryResponse, AssetCategoryCreate, AssetCategoryUpdate
from app.services.activity_service import log_activity

router = APIRouter(
    prefix="/asset-categories",
    tags=["Asset Categories"]
)

@router.get("", response_model=List[AssetCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AssetCategory).all()

@router.post("", response_model=AssetCategoryResponse)
def create_category(
    cat_data: AssetCategoryCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    existing = db.query(AssetCategory).filter(AssetCategory.name == cat_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists"
        )
        
    new_cat = AssetCategory(
        name=cat_data.name,
        custom_fields=cat_data.custom_fields
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    
    log_activity(db, admin_user.id, f"Created Asset Category {new_cat.name}", "AssetCategory", new_cat.id)
    
    return new_cat

@router.get("/{category_id}", response_model=AssetCategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cat = db.query(AssetCategory).filter(AssetCategory.id == category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return cat

@router.patch("/{category_id}", response_model=AssetCategoryResponse)
def update_category(
    category_id: int,
    update_data: AssetCategoryUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    cat = db.query(AssetCategory).filter(AssetCategory.id == category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
        
    update_dict = update_data.model_dump(exclude_unset=True)
    if "name" in update_dict:
        existing = db.query(AssetCategory).filter(
            AssetCategory.name == update_dict["name"],
            AssetCategory.id != category_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists"
            )
            
    for key, value in update_dict.items():
        setattr(cat, key, value)
        
    db.commit()
    db.refresh(cat)
    
    log_activity(db, admin_user.id, f"Updated Asset Category {cat.name}", "AssetCategory", cat.id, update_dict)
    
    return cat

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    cat = db.query(AssetCategory).filter(AssetCategory.id == category_id).first()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
        
    db.delete(cat)
    db.commit()
    
    log_activity(db, admin_user.id, f"Deleted Asset Category {cat.name}", "AssetCategory", category_id)
    
    return {"message": "Category deleted successfully"}
