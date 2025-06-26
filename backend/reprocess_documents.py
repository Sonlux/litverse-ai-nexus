#!/usr/bin/env python
"""
Script to reprocess all documents with improved PDF processing and chunking using LangChain
"""

import os
import sys
import asyncio
import tempfile
import requests
import argparse
import time
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.models.database import engine, Library, Document
from app.core.pdf_processor import PDFProcessor
from app.core.langchain_rag import LangChainRAG
from app.utils.config import get_settings
from app.utils.supabase_client import get_supabase_client

async def reprocess_all_documents(document_id=None):
    """
    Reprocess all documents or a specific document with LangChain
    
    Args:
        document_id: Optional ID of a specific document to process
    """
    print("Starting document reprocessing with LangChain...")
    
    # Load environment variables and configuration
    load_dotenv()
    
    # Get settings
    settings = get_settings()
    
    # Initialize components
    pdf_processor = PDFProcessor(upload_dir=settings.UPLOAD_DIR)
    langchain_rag = LangChainRAG(vectorstore_path=settings.VECTORSTORE_DIR)
    
    # Make sure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Initialize Supabase client
    try:
        supabase = get_supabase_client()
        print("Successfully connected to Supabase")
    except Exception as e:
        print(f"Warning: Could not connect to Supabase: {str(e)}")
        print("Will attempt to process local files only")
        supabase = None
    
    # Get all documents from the database
    with Session(engine) as db:
        if document_id:
            # Process only the specified document
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                print(f"Error: Document with ID {document_id} not found")
                return
            
            library = db.query(Library).filter(Library.id == document.library_id).first()
            if not library:
                print(f"Error: Library for document {document_id} not found")
                return
            
            print(f"Processing document {document.id}: {document.filename} from library '{library.name}'")
            await process_document(document, library, pdf_processor, langchain_rag, supabase, settings)
        else:
            # Process all documents
            libraries = db.query(Library).all()
            print(f"Found {len(libraries)} libraries")
            
            for library in libraries:
                print(f"\nProcessing library: {library.name} (ID: {library.id})")
                
                documents = db.query(Document).filter(Document.library_id == library.id).all()
                print(f"Found {len(documents)} documents in this library")
                
                for document in documents:
                    print(f"Reprocessing document: {document.filename} (ID: {document.id})")
                    await process_document(document, library, pdf_processor, langchain_rag, supabase, settings)
    
    print("\nDocument reprocessing complete!")

async def process_document(document, library, pdf_processor, langchain_rag, supabase, settings):
    """Process a single document with progress updates"""
    # Get the file path - checking if it's a Supabase path or local path
    file_path = document.file_path
    temp_file = None
    
    try:
        # Check if it's a local file
        if os.path.exists(file_path):
            print(f"  Using local file at {file_path}")
        else:
            # Try to download from Supabase
            if supabase:
                try:
                    print(f"  Downloading file from Supabase storage: {file_path}")
                    # Create a temporary file
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                    temp_file.close()
                    
                    # Download the file from Supabase
                    with open(temp_file.name, "wb") as f:
                        res = supabase.storage.from_("pdfs").download(file_path)
                        f.write(res)
                    
                    file_path = temp_file.name
                    print(f"  Downloaded to temporary file: {file_path}")
                except Exception as e:
                    print(f"  Error downloading from Supabase: {str(e)}")
                    
                    # Try to use the public URL as a fallback
                    try:
                        url = supabase.storage.from_("pdfs").get_public_url(file_path)
                        print(f"  Trying to download from public URL: {url}")
                        
                        # Download from URL
                        response = requests.get(url)
                        if response.status_code == 200:
                            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                            temp_file.close()
                            
                            with open(temp_file.name, "wb") as f:
                                f.write(response.content)
                            
                            file_path = temp_file.name
                            print(f"  Downloaded to temporary file: {file_path}")
                        else:
                            print(f"  Failed to download from URL: {response.status_code}")
                            return
                    except Exception as e2:
                        print(f"  Error downloading from URL: {str(e2)}")
                        return
            else:
                # Try to construct local path if it's a Supabase path
                local_filename = os.path.basename(file_path)
                local_path = os.path.join(settings.UPLOAD_DIR, local_filename)
                
                if os.path.exists(local_path):
                    file_path = local_path
                    print(f"  Using local file at {file_path}")
                else:
                    print(f"  Warning: File not found at {file_path} or {local_path}")
                    print(f"  Skipping document")
                    return
        
        # Delete existing embeddings
        print(f"  Deleting existing embeddings...")
        langchain_rag.delete_document(
            library_name=library.name,
            document_id=str(document.id)
        )
        
        # Reprocess document with LangChain - with progress updates
        print(f"  Extracting text from PDF pages...")
        start_time = time.time()
        pages, metadata = pdf_processor.extract_text_and_metadata(file_path)
        print(f"  Extracted text from {len(pages)} pages in {time.time() - start_time:.2f} seconds")
        
        print(f"  Creating chunks with LangChain text splitter...")
        start_time = time.time()
        chunks = pdf_processor.chunk_text(pages, chunk_size=750, chunk_overlap=150)
        print(f"  Created {len(chunks)} chunks in {time.time() - start_time:.2f} seconds")
        
        # Store new embeddings with progress updates
        print(f"  Creating and storing embeddings with LangChain...")
        start_time = time.time()
        
        # Process in smaller batches for progress reporting
        batch_size = 50
        total_chunks = len(chunks)
        for i in range(0, total_chunks, batch_size):
            batch_end = min(i + batch_size, total_chunks)
            batch = chunks[i:batch_end]
            
            print(f"  Processing batch {i//batch_size + 1}/{(total_chunks-1)//batch_size + 1} ({i+1}-{batch_end}/{total_chunks} chunks)...")
            batch_start = time.time()
            
            langchain_rag.embed_and_store_chunks(
                chunks=batch,
                library_name=library.name,
                document_id=str(document.id)
            )
            
            print(f"  Batch processed in {time.time() - batch_start:.2f} seconds")
        
        print(f"  Successfully processed all {total_chunks} chunks in {time.time() - start_time:.2f} seconds")
        
    except Exception as e:
        print(f"  Error reprocessing document: {str(e)}")
    
    finally:
        # Clean up temporary file if it exists
        if temp_file and os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
                print(f"  Removed temporary file: {temp_file.name}")
            except Exception as e:
                print(f"  Warning: Could not remove temporary file: {str(e)}")

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Reprocess documents with LangChain")
    parser.add_argument("--document", type=int, help="Process only the document with this ID")
    args = parser.parse_args()
    
    # Run the reprocessing
    asyncio.run(reprocess_all_documents(args.document)) 