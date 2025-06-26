"""
Web document processor for BookBot using LangChain
"""

import os
import logging
from typing import List, Dict, Tuple, Any
from urllib.parse import urlparse

# LangChain imports
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import bs4

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("web_processor")

class WebProcessor:
    """
    Class for processing web pages and preparing them for embedding
    """
    
    def __init__(self):
        """
        Initialize the web processor
        """
        # Initialize LangChain text splitter with default settings
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=750,
            chunk_overlap=150,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        logger.info("Web processor initialized")
    
    def extract_text_and_metadata(self, url: str, css_selectors: List[str] = None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extract text and metadata from a web page
        
        Args:
            url: URL of the web page
            css_selectors: Optional list of CSS selectors to extract specific content
            
        Returns:
            Tuple of (list of page dicts, document metadata dict)
        """
        # Create a BeautifulSoup strainer if CSS selectors are provided
        bs4_strainer = None
        if css_selectors:
            bs4_strainer = bs4.SoupStrainer(class_=css_selectors)
        
        # Load the web page with WebBaseLoader
        loader_kwargs = {}
        if bs4_strainer:
            loader_kwargs["bs_kwargs"] = {"parse_only": bs4_strainer}
        
        try:
            loader = WebBaseLoader(
                web_paths=[url],
                **loader_kwargs
            )
            docs = loader.load()
            
            # If no documents were found, raise an error
            if not docs:
                raise ValueError(f"No content found at URL: {url}")
            
            # Extract domain for metadata
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            
            # Create metadata
            metadata = {
                "title": f"Web content from {domain}",
                "source": url,
                "domain": domain,
                "filename": f"{domain.replace('.', '_')}.html",
                "page_count": 1
            }
            
            # Create a single page dict
            pages = [{
                "page_num": 0,
                "text": docs[0].page_content,
                "dimensions": {
                    "width": 0,
                    "height": 0
                },
                "details": {
                    "has_tables": False,
                    "has_images": False,
                    "word_count": len(docs[0].page_content.split()),
                    "char_count": len(docs[0].page_content),
                    "url": url
                }
            }]
            
            logger.info(f"Extracted {len(docs[0].page_content)} characters from {url}")
            
            return pages, metadata
            
        except Exception as e:
            logger.error(f"Error extracting content from URL {url}: {str(e)}")
            raise
    
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
        if chunk_size != self.text_splitter.chunk_size or chunk_overlap != self.text_splitter.chunk_overlap:
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
            
            # Convert to LangChain document for splitting
            lc_doc = Document(
                page_content=page_text,
                metadata={"page_num": page_num}
            )
            
            # Use LangChain's text splitter to create chunks
            raw_chunks = self.text_splitter.split_documents([lc_doc])
            
            # Convert LangChain documents to our chunk format
            for i, raw_chunk in enumerate(raw_chunks):
                chunk = {
                    "chunk_id": f"web_{page_num}_{i}",
                    "page_num": page_num,
                    "text": raw_chunk.page_content,
                    "chunk_size": len(raw_chunk.page_content),
                    "details": page.get("details", {})
                }
                
                all_chunks.append(chunk)
                chunk_id += 1
        
        logger.info(f"Created {len(all_chunks)} chunks from {len(pages)} web pages")
        
        return all_chunks 