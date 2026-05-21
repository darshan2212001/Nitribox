from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from api.database import get_db
from api import models, schemas

router = APIRouter(prefix="/delivery-agents", tags=["Delivery Agents"])

@router.get("/", response_model=List[schemas.DeliveryAgentResponse])
def get_delivery_agents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all delivery agents"""
    agents = db.query(models.DeliveryAgent).offset(skip).limit(limit).all()
    return agents

@router.get("/{agent_id}", response_model=schemas.DeliveryAgentResponse)
def get_delivery_agent(agent_id: str, db: Session = Depends(get_db)):
    """Get a specific delivery agent"""
    agent = db.query(models.DeliveryAgent).filter(models.DeliveryAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Delivery agent not found")
    return agent

@router.get("/{agent_id}/orders")
def get_agent_orders(agent_id: str, db: Session = Depends(get_db)):
    """Get all orders assigned to a delivery agent"""
    orders = db.query(models.Order).join(
        models.DeliveryTracking
    ).filter(
        models.DeliveryTracking.delivery_agent_id == agent_id
    ).all()
    return orders

