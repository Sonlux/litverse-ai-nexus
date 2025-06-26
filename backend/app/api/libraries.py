from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.models.database import get_db, Library

router = APIRouter()

# Pydantic models for request/response
class LibraryBase(BaseModel):
    name: str
    description: str = None

class LibraryCreate(LibraryBase):
    pass

class LibraryResponse(LibraryBase):
    id: int
    
    class Config:
        orm_mode = True

# API endpoints
@router.get("/libraries", response_model=List[LibraryResponse])
async def get_libraries(db: Session = Depends(get_db)):
    """
    Get all libraries
    """
    libraries = db.query(Library).all()
    return libraries

@router.post("/libraries", response_model=LibraryResponse, status_code=status.HTTP_201_CREATED)
async def create_library(library: LibraryCreate, db: Session = Depends(get_db)):
    """
    Create a new library
    """
    # Check if library with same name exists
    existing_library = db.query(Library).filter(Library.name == library.name).first()
    if existing_library:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Library with name '{library.name}' already exists"
        )
    
    # Create new library
    db_library = Library(
        name=library.name,
        description=library.description
    )
    
    db.add(db_library)
    db.commit()
    db.refresh(db_library)
    
    return db_library

@router.get("/libraries/{library_id}", response_model=LibraryResponse)
async def get_library(library_id: int, db: Session = Depends(get_db)):
    """
    Get a specific library by ID
    """
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    return library

@router.delete("/libraries/{library_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_library(library_id: int, db: Session = Depends(get_db)):
    """
    Delete a library by ID
    """
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    db.delete(library)
    db.commit()
    
    return None