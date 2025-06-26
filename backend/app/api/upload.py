from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import logging
from pydantic import BaseModel, HttpUrl

from app.models.database import get_db, Library, Document
from app.core.pdf_processor import PDFProcessor
from app.core.web_processor import WebProcessor
from app.core.langchain_rag import LangChainRAG
from app.utils.config import get_settings
from app.utils.supabase_client import get_supabase_client

router = APIRouter()
settings = get_settings()

# Initialize components
pdf_processor = PDFProcessor(upload_dir=settings.upload_dir)
web_processor = WebProcessor()
rag_system = LangChainRAG(vectorstore_path=settings.vectorstore_dir)

# Initialize Supabase client
supabase = get_supabase_client()

# Pydantic models for request/response
class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    file_size: Optional[int] = None
    status: str
    library_id: int
    
    class Config:
        orm_mode = True

class WebDocumentCreate(BaseModel):
    url: HttpUrl
    css_selectors: Optional[List[str]] = None

class WebPageUploadRequest(BaseModel):
    url: str
    css_selectors: Optional[List[str]] = None

@router.post("/upload/{library_id}", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    library_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    supabase = Depends(get_supabase_client)
):
    """
    Upload a PDF document to a library and process it for RAG
    """
    # Check if library exists
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    try:
        # Generate a unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Save the file
        file_path = await pdf_processor.save_file(file, unique_filename)
        
        # Create document record
        document = Document(
            filename=file.filename,
            file_path=file_path,
            library_id=library_id,
            status="processing"
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Process the document in the background
        background_tasks.add_task(
            process_document,
            document.id,
            file_path,
            library.name,
            db
            )
        
        return document
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

@router.post("/upload-web/{library_id}", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_web_page(
    library_id: int,
    request: WebPageUploadRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Upload a web page to a library and process it for RAG
    """
    # Check if library exists
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    try:
        # Create document record
        document = Document(
            filename=request.url,
            file_path=request.url,
            library_id=library_id,
            status="processing",
            is_web_document=True
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        
        # Process the web page in the background
        background_tasks.add_task(
            process_web_page,
            document.id,
            request.url,
            library.name,
            request.css_selectors,
            db
            )
        
        return document
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing web page: {str(e)}"
        )

@router.get("/documents/{library_id}", response_model=List[DocumentResponse])
async def get_library_documents(library_id: int, db: Session = Depends(get_db)):
    """
    Get all documents in a library
    """
    # Check if library exists
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    documents = db.query(Document).filter(Document.library_id == library_id).all()
    return documents

@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int, 
    db: Session = Depends(get_db),
    supabase = Depends(get_supabase_client)
):
    """
    Delete a document and its associated data
    """
    # Check if document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found"
        )
    
    # Get library
    library = db.query(Library).filter(Library.id == document.library_id).first()
    
    try:
        # Delete from vector store
        if library:
            rag_system.delete_document(
                library_name=library.name,
                document_id=str(document.id)
            )
        
        # Delete file if it's a PDF
        if not document.is_web_document and document.file_path and os.path.exists(document.file_path):
            try:
                # This assumes file_path is the name of the file in the bucket
                # If file_path is a full local path, you need to extract the filename
                file_key = os.path.basename(document.file_path)
                supabase.storage.from_("pdfs").remove([file_key])
                # Also remove the local file
                os.remove(document.file_path)
            except Exception as e:
                # Log but continue if storage removal fails
                print(f"Warning: Could not remove file from storage or local disk: {str(e)}")
        
        # Delete from database
        db.delete(document)
        db.commit()
        
        return None
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )

async def process_document(document_id: int, file_path: str, library_name: str, db: Session):
    """
    Process a document for RAG
    """
    try:
        # Update status
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logging.error(f"Document {document_id} not found")
            return
        
        document.status = "processing"
        db.commit()
        
        # Process the document
        text_chunks = pdf_processor.process_pdf(file_path)
        
        # Update document metadata
        document.page_count = pdf_processor.get_page_count(file_path)
        document.file_size = os.path.getsize(file_path)
        
        # Add to vector store
        rag_system.add_document(text_chunks, document_id, file_path, library_name)
        
        # Update status
        document.status = "processed"
        db.commit()
        
    except Exception as e:
        logging.error(f"Error processing document {document_id}: {str(e)}")
        # Update status to error
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "error"
            db.commit()

async def process_web_page(document_id: int, url: str, library_name: str, css_selectors: Optional[List[str]], db: Session):
    """
    Process a web page for RAG
    """
    try:
        # Update status
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logging.error(f"Document {document_id} not found")
            return
        
        document.status = "processing"
        db.commit()
        
        # Process the web page
        text_chunks = web_processor.process_webpage(url, css_selectors)
        
        # Update document metadata
        document.title = web_processor.get_page_title()
        
        # Add to vector store
        rag_system.add_document(text_chunks, document_id, url, library_name)
        
        # Update status
        document.status = "processed"
        db.commit()
        
    except Exception as e:
        logging.error(f"Error processing web page {document_id}: {str(e)}")
        # Update status to error
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = "error"
            db.commit()