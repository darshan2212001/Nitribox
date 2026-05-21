from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from api.database import get_db
from api import models, schemas
from api.simple_auth import get_current_user_optional

router = APIRouter(prefix="/clients", tags=["Clients"])

@router.get("/", response_model=List[schemas.ClientResponse])
def get_clients(
    skip: int = 0, 
    limit: int = 100, 
    nutritionist_id: Optional[str] = None,
    nutritionist_user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all clients, optionally filtered by nutritionist"""
    query = db.query(models.Client)
    
    # If nutritionist_user_id is provided, find nutritionist by user_id first
    if nutritionist_user_id:
        nutritionist = db.query(models.Nutritionist).filter(
            models.Nutritionist.user_id == nutritionist_user_id
        ).first()
        if nutritionist:
            query = query.filter(models.Client.nutritionist_id == nutritionist.id)
        else:
            # If nutritionist not found, return empty list
            return []
    elif nutritionist_id:
        # Filter by nutritionist_id directly
        query = query.filter(models.Client.nutritionist_id == nutritionist_id)
    elif current_user and current_user.role == "nutritionist":
        # If current user is a nutritionist, automatically filter to their clients
        nutritionist = db.query(models.Nutritionist).filter(
            models.Nutritionist.user_id == current_user.id
        ).first()
        if nutritionist:
            query = query.filter(models.Client.nutritionist_id == nutritionist.id)
        else:
            # If nutritionist record not found, return empty list
            return []
    
    clients = query.offset(skip).limit(limit).all()
    return clients

@router.get("/user/{user_id}", response_model=Optional[schemas.ClientResponse])
def get_client_by_user_id(user_id: str, db: Session = Depends(get_db)):
    """Get a client by user_id. Returns null if not found (client may not exist yet)"""
    client = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    if not client:
        # Return None - FastAPI will serialize this as null with status 200
        return None
    return client

@router.get("/{client_id}", response_model=schemas.ClientResponse)
def get_client(client_id: str, db: Session = Depends(get_db)):
    """Get a specific client"""
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

