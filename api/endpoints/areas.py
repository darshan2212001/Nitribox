from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_required

router = APIRouter(prefix="/areas", tags=["Areas"])


@router.get("", response_model=List[schemas.AreaResponse])
async def get_areas(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get all areas, optionally filtered by active status"""
    query = db.query(models.Area)
    
    if is_active is not None:
        query = query.filter(models.Area.is_active == is_active)
    
    areas = query.order_by(models.Area.name.asc()).all()
    # Convert to response format to ensure proper serialization
    return [schemas.AreaResponse.model_validate(area) for area in areas]


@router.get("/{area_id}", response_model=schemas.AreaResponse)
async def get_area(
    area_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Get a specific area by ID"""
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found"
        )
    
    # Convert to response format to ensure proper serialization
    return schemas.AreaResponse.model_validate(area)


@router.post("", response_model=schemas.AreaResponse, status_code=status.HTTP_201_CREATED)
async def create_area(
    area_data: schemas.AreaCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Create a new area"""
    # Check if code already exists (if provided)
    if area_data.code:
        existing = db.query(models.Area).filter(models.Area.code == area_data.code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Area with code '{area_data.code}' already exists"
            )
    
    area = models.Area(
        name=area_data.name,
        code=area_data.code,
        description=area_data.description,
        delivery_radius_km=area_data.delivery_radius_km,
        is_active=area_data.is_active
    )
    
    db.add(area)
    db.commit()
    db.refresh(area)
    
    return area


@router.patch("/{area_id}", response_model=schemas.AreaResponse)
async def update_area(
    area_id: str,
    area_data: schemas.AreaUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Update an existing area"""
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found"
        )
    
    # Check if code already exists (if being updated)
    if area_data.code and area_data.code != area.code:
        existing = db.query(models.Area).filter(
            models.Area.code == area_data.code,
            models.Area.id != area_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Area with code '{area_data.code}' already exists"
            )
    
    # Update fields
    if area_data.name is not None:
        area.name = area_data.name
    if area_data.code is not None:
        area.code = area_data.code
    if area_data.description is not None:
        area.description = area_data.description
    if area_data.delivery_radius_km is not None:
        area.delivery_radius_km = area_data.delivery_radius_km
    if area_data.is_active is not None:
        area.is_active = area_data.is_active
    
    db.commit()
    db.refresh(area)
    
    # Convert to response format to ensure proper serialization
    return schemas.AreaResponse.model_validate(area)


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(
    area_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_required)
):
    """Delete an area (soft delete by setting is_active=False)"""
    area = db.query(models.Area).filter(models.Area.id == area_id).first()
    
    if not area:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Area not found"
        )
    
    # Check if area is used in any batches
    batch_count = db.query(models.Batch).filter(models.Batch.area_id == area_id).count()
    if batch_count > 0:
        # Soft delete instead of hard delete
        area.is_active = False
        db.commit()
    else:
        # Hard delete if no batches reference it
        db.delete(area)
        db.commit()
    
    return None

