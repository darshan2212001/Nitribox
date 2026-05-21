#!/usr/bin/env python3
"""
Geocoding API endpoints
Provides address-to-coordinates and coordinates-to-address conversion
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from api.database import get_db
from api.services.google_maps_service import geocode_address, reverse_geocode, GoogleMapsService

router = APIRouter(prefix="/api/geocoding", tags=["Geocoding"])

class GeocodeRequest(BaseModel):
    address: str

class GeocodeResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None
    components: Optional[dict] = None

class ReverseGeocodeRequest(BaseModel):
    latitude: float
    longitude: float

class ReverseGeocodeResponse(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None
    components: Optional[dict] = None

class BatchGeocodeRequest(BaseModel):
    addresses: List[str]

class BatchGeocodeResponse(BaseModel):
    results: List[GeocodeResponse]
    failed_addresses: List[str]

@router.post("/address-to-coords", response_model=GeocodeResponse)
async def address_to_coordinates(
    request: GeocodeRequest,
    db: Session = Depends(get_db)
):
    """Convert address to coordinates"""
    try:
        result = await geocode_address(request.address)
        
        if not result:
            raise HTTPException(
                status_code=404, 
                detail=f"Could not geocode address: {request.address}"
            )
        
        return GeocodeResponse(
            formatted_address=result.formatted_address,
            latitude=result.coordinates.lat,
            longitude=result.coordinates.lng,
            place_id=result.place_id,
            components=result.components
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Geocoding failed: {str(e)}"
        )

@router.post("/coords-to-address", response_model=ReverseGeocodeResponse)
async def coordinates_to_address(
    request: ReverseGeocodeRequest,
    db: Session = Depends(get_db)
):
    """Convert coordinates to address"""
    try:
        result = await reverse_geocode(request.latitude, request.longitude)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Could not reverse geocode coordinates: ({request.latitude}, {request.longitude})"
            )
        
        return ReverseGeocodeResponse(
            formatted_address=result.formatted_address,
            latitude=result.coordinates.lat,
            longitude=result.coordinates.lng,
            place_id=result.place_id,
            components=result.components
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Reverse geocoding failed: {str(e)}"
        )

@router.post("/batch-geocode", response_model=BatchGeocodeResponse)
async def batch_geocode(
    request: BatchGeocodeRequest,
    db: Session = Depends(get_db)
):
    """Convert multiple addresses to coordinates"""
    try:
        results = []
        failed_addresses = []
        
        async with GoogleMapsService() as service:
            for address in request.addresses:
                try:
                    result = await service.geocode_address(address)
                    if result:
                        results.append(GeocodeResponse(
                            formatted_address=result.formatted_address,
                            latitude=result.coordinates.lat,
                            longitude=result.coordinates.lng,
                            place_id=result.place_id,
                            components=result.components
                        ))
                    else:
                        failed_addresses.append(address)
                except Exception:
                    failed_addresses.append(address)
        
        return BatchGeocodeResponse(
            results=results,
            failed_addresses=failed_addresses
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch geocoding failed: {str(e)}"
        )

@router.get("/validate-address")
async def validate_address(
    address: str,
    db: Session = Depends(get_db)
):
    """Validate if an address can be geocoded"""
    try:
        result = await geocode_address(address)
        
        return {
            "valid": result is not None,
            "formatted_address": result.formatted_address if result else None,
            "coordinates": {
                "latitude": result.coordinates.lat if result else None,
                "longitude": result.coordinates.lng if result else None
            } if result else None
        }
    
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }
