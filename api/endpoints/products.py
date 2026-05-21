from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from datetime import datetime

from api.database import get_db
from api.models import Product
from api.schemas import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse, ProductCategoryResponse
from api.simple_auth import get_current_user_optional, get_current_user_required
from api.error_responses import raise_http_exception, ErrorCode

router = APIRouter(prefix="/api/products", tags=["Products"])

# Category options
CATEGORIES = [
    "protein_fitness",
    "vitamins_minerals",
    "gut_health",
    "healthy_snacks",
    "diabetic_friendly",
    "womens_health"
]

@router.get("", response_model=ProductListResponse)
async def list_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    sort: Optional[str] = Query("popular", description="Sort by: popular, new, price_low, price_high"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List products with filters and pagination"""
    try:
        query = db.query(Product).filter(Product.is_active == True)
        
        # Category filter
        if category and category in CATEGORIES:
            query = query.filter(Product.category == category)
        
        # Search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.short_benefit.ilike(search_term)
                )
            )
        
        # Sorting
        if sort == "new":
            query = query.order_by(Product.created_at.desc())
        elif sort == "price_low":
            query = query.order_by(Product.price.asc())
        elif sort == "price_high":
            query = query.order_by(Product.price.desc())
        else:  # popular (default)
            query = query.order_by(Product.rating.desc(), Product.review_count.desc())
        
        # Get total count
        total = query.count()
        
        # Pagination
        offset = (page - 1) * page_size
        products = query.offset(offset).limit(page_size).all()
        
        return ProductListResponse(
            products=[ProductResponse.model_validate(p) for p in products],
            total=total,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to fetch products",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

@router.get("/featured", response_model=List[ProductResponse])
async def get_featured_products(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get featured products for home page slider"""
    try:
        products = db.query(Product).filter(
            and_(Product.is_active == True, Product.is_featured == True)
        ).order_by(Product.rating.desc(), Product.review_count.desc()).limit(limit).all()
        
        return [ProductResponse.model_validate(p) for p in products]
    except Exception as e:
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to fetch featured products",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

@router.get("/categories", response_model=List[ProductCategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    """Get all product categories with counts"""
    try:
        categories = []
        for cat in CATEGORIES:
            count = db.query(Product).filter(
                and_(Product.category == cat, Product.is_active == True)
            ).count()
            categories.append(ProductCategoryResponse(category=cat, count=count))
        
        return categories
    except Exception as e:
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to fetch categories",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get product details by ID"""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Product not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        if not product.is_active:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Product is not available",
                error_code=ErrorCode.NOT_FOUND
            )
        
        return ProductResponse.model_validate(product)
    except HTTPException:
        raise
    except Exception as e:
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to fetch product",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Create a new product (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Only admins can create products",
                error_code=ErrorCode.FORBIDDEN
            )
        
        db_product = Product(**product.model_dump())
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        
        return ProductResponse.model_validate(db_product)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to create product",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Update a product (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Only admins can update products",
                error_code=ErrorCode.FORBIDDEN
            )
        
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Product not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Update fields
        update_data = product_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_product, field, value)
        
        db_product.updated_at = datetime.now()
        db.commit()
        db.refresh(db_product)
        
        return ProductResponse.model_validate(db_product)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to update product",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Delete a product (admin only)"""
    try:
        # Check if user is admin
        if current_user.role != "admin":
            raise_http_exception(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Only admins can delete products",
                error_code=ErrorCode.FORBIDDEN
            )
        
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            raise_http_exception(
                status_code=status.HTTP_404_NOT_FOUND,
                message="Product not found",
                error_code=ErrorCode.NOT_FOUND
            )
        
        # Soft delete by setting is_active to False
        db_product.is_active = False
        db_product.updated_at = datetime.now()
        db.commit()
        
        return None
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise_http_exception(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message="Failed to delete product",
            detail=str(e),
            error_code=ErrorCode.UNKNOWN_ERROR
        )

