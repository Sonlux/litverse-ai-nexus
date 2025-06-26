import os
import fitz  # PyMuPDF
import uuid
import re
from typing import List, Dict, Any, Tuple
import logging
import numpy as np
from langchain.text_splitter import RecursiveCharacterTextSplitter
from fastapi import UploadFile
import aiofiles

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdf_processor")

class PDFProcessor:
    """
    Class for processing PDF files, extracting text, and chunking for embedding
    """
    
    def __init__(self, upload_dir: str):
        """
        Initialize the PDF processor
        
        Args:
            upload_dir: Directory to store uploaded PDF files
        """
        self.upload_dir = upload_dir
        os.makedirs(upload_dir, exist_ok=True)
        
        # Initialize LangChain text splitter with default settings
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=750,
            chunk_overlap=150,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        logger.info(f"PDF processor initialized with upload directory: {upload_dir}")
    
    async def save_file(self, file: UploadFile, filename: str) -> str:
        """
        Save an uploaded file from FastAPI UploadFile
        
        Args:
            file: FastAPI UploadFile object
            filename: Name to save the file as
            
        Returns:
            Path to the saved file
        """
        # Create the file path
        file_path = os.path.join(self.upload_dir, filename)
        
        # Write the file to disk using aiofiles for async support
        async with aiofiles.open(file_path, "wb") as out_file:
            # Read the file in chunks
            while content := await file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
        
        logger.info(f"Saved uploaded file to {file_path}")
        
        return file_path
    
    def save_uploaded_file(self, file_data: bytes, filename: str) -> str:
        """
        Save an uploaded PDF file to disk
        
        Args:
            file_data: Bytes of the uploaded file
            filename: Name of the file
            
        Returns:
            Path to the saved file
        """
        # Clean the filename to avoid security issues
        clean_filename = self._clean_filename(filename)
        
        # Create the file path
        file_path = os.path.join(self.upload_dir, clean_filename)
        
        # Write the file to disk
        with open(file_path, "wb") as file:
            file.write(file_data)
        
        logger.info(f"Saved uploaded file to {file_path}")
        
        return file_path
    
    def _clean_filename(self, filename: str) -> str:
        """
        Clean a filename to avoid security issues
        
        Args:
            filename: Original filename
            
        Returns:
            Cleaned filename
        """
        # Remove path information
        filename = os.path.basename(filename)
        
        # Replace potentially problematic characters
        filename = re.sub(r'[^\w\.\-]', '_', filename)
        
        return filename
    
    def get_page_count(self, file_path: str) -> int:
        """
        Get the number of pages in a PDF file
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Number of pages
        """
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at {file_path}")
        
        # Open the PDF
        try:
            doc = fitz.open(file_path)
            page_count = len(doc)
            doc.close()
            return page_count
        except Exception as e:
            logger.error(f"Error getting page count: {str(e)}")
            raise
    
    def process_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Process a PDF file and return chunks for embedding
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            List of text chunks
        """
        # Extract text and metadata
        pages, _ = self.extract_text_and_metadata(file_path)
        
        # Chunk the text
        chunks = self.chunk_text(pages)
        
        return chunks
    
    def extract_text_and_metadata(self, file_path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extract text and metadata from a PDF file
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Tuple of (list of page dicts, document metadata dict)
        """
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at {file_path}")
        
        # Open the PDF
        try:
            doc = fitz.open(file_path)
        except Exception as e:
            logger.error(f"Error opening PDF: {str(e)}")
            raise
        
        # Extract document metadata
        metadata = {
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "subject": doc.metadata.get("subject", ""),
            "keywords": doc.metadata.get("keywords", ""),
            "page_count": len(doc),
            "filename": os.path.basename(file_path)
        }
        
        # Extract text from each page with enhanced extraction
        pages = []
        for page_num, page in enumerate(doc):
            # Extract text
            text = page.get_text()
            
            # Extract page dimensions
            page_dim = {
                "width": page.rect.width,
                "height": page.rect.height
            }
            
            # Check for tables and images
            has_tables = False
            if hasattr(page, "find_tables"):
                try:
                    tables = page.find_tables()
                    has_tables = tables is not None and len(tables) > 0
                except Exception:
                    has_tables = False
                    
            has_images = len(page.get_images()) > 0
            
            # Create page dict with details
            page_dict = {
                "page_num": page_num,
                "text": text,
                "dimensions": page_dim,
                "details": {
                    "has_tables": has_tables,
                    "has_images": has_images,
                    "word_count": len(text.split()),
                    "char_count": len(text)
                }
            }
            
            pages.append(page_dict)
        
        # Close the document
        doc.close()
        
        logger.info(f"Extracted text from {len(pages)} pages in {file_path}")
        
        return pages, metadata
    
    def chunk_text(
        self, 
        pages: List[Dict[str, Any]], 
        chunk_size: int = 750, 
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Chunk page text for embeddings using LangChain's text splitter
        
        Args:
            pages: List of page dicts from extract_text_and_metadata
            chunk_size: Target size of chunks in characters
            chunk_overlap: Overlap between chunks in characters
            
        Returns:
            List of chunk dicts with text and metadata
        """
        # Update text splitter settings if different from default
        # Note: LangChain's RecursiveCharacterTextSplitter uses different attribute names now
        current_splitter_size = getattr(self.text_splitter, "chunk_size", None)
        if current_splitter_size is None:
            current_splitter_size = getattr(self.text_splitter, "_chunk_size", 750)
            
        current_overlap = getattr(self.text_splitter, "chunk_overlap", None)
        if current_overlap is None:
            current_overlap = getattr(self.text_splitter, "_chunk_overlap", 150)
            
        if chunk_size != current_splitter_size or chunk_overlap != current_overlap:
            self.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )
        
        # Process each page and create chunks
        all_chunks = []
        chunk_id = 0
        
        for page in pages:
            page_num = page["page_num"]
            page_text = page["text"]
            
            # Skip empty pages
            if not page_text.strip():
                continue
            
            # Use LangChain's text splitter to create chunks
            raw_chunks = self.text_splitter.create_documents(
                texts=[page_text],
                metadatas=[{"page_num": page_num}]
            )
            
            # Convert LangChain documents to our chunk format
            for i, raw_chunk in enumerate(raw_chunks):
                chunk = {
                    "chunk_id": f"{page_num}_{i}",
                    "page_num": page_num,
                    "text": raw_chunk.page_content,
                    "chunk_size": len(raw_chunk.page_content),
                    "details": page.get("details", {})
                }
                
                all_chunks.append(chunk)
                chunk_id += 1
        
        logger.info(f"Created {len(all_chunks)} chunks from {len(pages)} pages")
        
        return all_chunks