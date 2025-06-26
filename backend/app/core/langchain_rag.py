"""
LangChain-based RAG implementation for BookBot
"""

import os
import json
import logging
import re
from typing import List, Dict, Any, Optional, AsyncGenerator
from dotenv import load_dotenv
from operator import itemgetter

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("langchain_rag")

class LangChainRAG:
    """
    LangChain-based Retrieval-Augmented Generation system
    """
    
    def __init__(self, vectorstore_path: str):
        """
        Initialize the RAG system
        
        Args:
            vectorstore_path: Path to store ChromaDB data
        """
        self.vectorstore_path = vectorstore_path
        
        # Initialize embedding model - using the same model as the custom implementation
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        
        # Initialize API credentials for LLM
        self.api_key = os.getenv("NEMOTRON_API_KEY")
        self.api_base_url = os.getenv("NEMOTRON_API_URL", "https://integrate.api.nvidia.com/v1")
        
        # The correct model ID for NVIDIA's Llama 3.3 70B
        self.model_name = "meta/llama-3.3-70b-instruct"
        
        # Validate API key
        if not self.api_key:
            raise ValueError("NEMOTRON_API_KEY environment variable is not set")
        
        # Initialize the LLM with NVIDIA endpoint
        try:
            self.llm = ChatOpenAI(
                base_url=self.api_base_url,
                api_key=self.api_key,
                model_name=self.model_name,
                temperature=0.3,
                max_tokens=1024
            )
            logger.info(f"LangChain RAG system initialized with NVIDIA API at {self.api_base_url}")
        except Exception as e:
            logger.error(f"Failed to initialize NVIDIA API client: {str(e)}")
            raise
        
        # Create template for RAG prompt
        self.template = ChatPromptTemplate.from_messages([
            ("system", """You are BookBot, an expert AI assistant that answers questions based on document content.

INSTRUCTIONS:
1.  Answer the user's question STRICTLY based on the provided "Context" and "Chat History".
2.  Do not make up information or answer from prior knowledge. If the answer isn't in the context, say you don't know.
3.  Be concise and helpful.
4.  If you use information from the context, you MUST cite the source using the format: [Source: <source_name>]. The source is the `source` metadata field from the context.
5.  The user's question may be a follow-up. Use the "Chat History" to understand the context of the conversation.
6.  Wrap your chain-of-thought reasoning steps inside <reasoning>...</reasoning> tags, and then provide the final answer.

Chat History:
{chat_history}"""),
            ("human", """Context:
{context}

Question: {question}""")
        ])
    
    def get_vectorstore(self, library_name: str):
        """
        Get or create a Chroma vectorstore for a library
        
        Args:
            library_name: Name of the library
            
        Returns:
            Chroma vectorstore
        """
        # Create library-specific path
        library_path = os.path.join(self.vectorstore_path, library_name)
        os.makedirs(library_path, exist_ok=True)
        
        # Sanitize library name for ChromaDB collection name
        # Replace spaces with underscores and remove any invalid characters
        collection_name = library_name.replace(" ", "_")
        # Ensure it only contains alphanumeric characters, underscores, or hyphens
        collection_name = re.sub(r'[^a-zA-Z0-9_\-]', '', collection_name)
        
        # Initialize Chroma with the embeddings
        return Chroma(
            persist_directory=library_path,
            embedding_function=self.embeddings,
            collection_name=collection_name
        )
    
    def add_document(self, text_chunks: List[Dict[str, Any]], document_id: str, file_path: str, library_name: str) -> int:
        """
        Add a document to the vector store
        
        Args:
            text_chunks: List of text chunks with metadata
            document_id: ID of the document
            file_path: Path to the document file
            library_name: Name of the library
            
        Returns:
            Number of chunks embedded and stored
        """
        logger.info(f"Adding document {document_id} to library {library_name}")
        
        # Process chunks if needed
        processed_chunks = []
        for i, chunk in enumerate(text_chunks):
            # Ensure each chunk has the required metadata
            if isinstance(chunk, dict) and "text" in chunk:
                # Use existing chunk structure if it matches what we need
                processed_chunk = chunk.copy()
                
                # Add chunk_id if not present
                if "chunk_id" not in processed_chunk:
                    processed_chunk["chunk_id"] = i
                
                # Add chunk_size if not present
                if "chunk_size" not in processed_chunk:
                    processed_chunk["chunk_size"] = len(chunk["text"])
                
                processed_chunks.append(processed_chunk)
            else:
                # Create chunk structure if it's just text
                processed_chunks.append({
                    "text": chunk if isinstance(chunk, str) else str(chunk),
                    "page_num": i // 4,  # Estimate 4 chunks per page
                    "chunk_id": i,
                    "chunk_size": len(chunk) if isinstance(chunk, str) else len(str(chunk))
                })
        
        # Store chunks in vector store
        return self.embed_and_store_chunks(
            chunks=processed_chunks,
            library_name=library_name,
            document_id=str(document_id)
        )
    
    def _format_docs(self, docs: List[Document]) -> str:
        """
        Format retrieved documents for context
        
        Args:
            docs: List of retrieved documents
            
        Returns:
            Formatted context string
        """
        # Add a section header
        context_parts = ["# DOCUMENT EXCERPTS:"]
        
        # Group chunks by document and page for better context
        doc_pages = {}
        
        for doc in docs:
            metadata = doc.metadata
            doc_id = metadata.get("document_id", "unknown")
            page_num = metadata.get("page_num", "unknown")
            
            key = f"{doc_id}_{page_num}"
            if key not in doc_pages:
                doc_pages[key] = []
            
            doc_pages[key].append(doc.page_content)
        
        # Format grouped chunks
        for key, texts in doc_pages.items():
            doc_id, page_num = key.split("_")
            
            # Join all text from the same page
            combined_text = "\n".join(texts)
            
            # Add clear section markers
            context_part = f"\n## DOCUMENT ID: {doc_id}, PAGE: {page_num}\n\n{combined_text}\n"
            context_parts.append(context_part)
        
        # Join all context parts
        return "\n".join(context_parts)
    
    def get_retriever(self, library_name: str, document_id: Optional[int] = None):
        """
        Get a retriever for a library, optionally filtered by document.
        """
        vectorstore = self.get_vectorstore(library_name)
        search_kwargs = {"k": 8}
        if document_id:
            # Ensure document_id is a string for filtering
            search_kwargs["filter"] = {"document_id": str(document_id)}
        
        return vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs=search_kwargs
        )
    
    def create_rag_chain(self, library_name: str, document_id: Optional[int] = None):
        """
        Create a RAG chain for a library
        
        Args:
            library_name: Name of the library
            document_id: ID of the document
            
        Returns:
            LangChain RAG chain
        """
        retriever = self.get_retriever(library_name, document_id)
        
        rag_chain = (
            {
                "context": itemgetter("question") | retriever | self._format_docs,
                "chat_history": itemgetter("chat_history"),
                "question": itemgetter("question"),
            }
            | self.template
            | self.llm
            | StrOutputParser()
        )
        
        return rag_chain
    
    def embed_and_store_chunks(self, chunks: List[Dict[str, Any]], library_name: str, document_id: str) -> int:
        """
        Embed text chunks and store them in the vector store
        
        Args:
            chunks: List of text chunks with metadata
            library_name: Name of the library
            document_id: ID of the document
            
        Returns:
            Number of chunks embedded and stored
        """
        # Get vectorstore
        vectorstore = self.get_vectorstore(library_name)
        
        # Convert chunks to LangChain documents
        documents = []
        for chunk in chunks:
            # Prepare metadata
            metadata = {
                "document_id": document_id,
                "page_num": chunk["page_num"],
                "chunk_id": chunk["chunk_id"],
                "chunk_size": chunk["chunk_size"]
            }
            
            # Add any page details if available
            if "details" in chunk:
                details = chunk["details"]
                if details.get("has_tables", False):
                    metadata["has_tables"] = True
                if details.get("has_images", False):
                    metadata["has_images"] = True
            
            # Create LangChain document
            documents.append(Document(
                page_content=chunk["text"],
                metadata=metadata
            ))
        
        # Add documents to vectorstore
        vectorstore.add_documents(documents)
        
        return len(chunks)
    
    def delete_document(self, library_name: str, document_id: str) -> bool:
        """
        Delete a document from the vector store
        
        Args:
            library_name: Name of the library
            document_id: ID of the document
            
        Returns:
            True if successful
        """
        try:
            # Get vectorstore
            vectorstore = self.get_vectorstore(library_name)
            
            # First check if documents with this ID exist
            results = vectorstore.get(
                where={"document_id": document_id}
            )
            
            # If documents exist, delete them
            if results and len(results['ids']) > 0:
                vectorstore.delete(
                    ids=results['ids']
                )
                logger.info(f"Deleted {len(results['ids'])} chunks for document {document_id}")
            else:
                logger.info(f"No chunks found for document {document_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            raise
    
    async def generate_answer(
        self, question: str, library_name: str, chat_history: List = [], document_id: Optional[int] = None
    ) -> str:
        """
        Generate an answer to a question using RAG
        
        Args:
            question: User's question
            library_name: Name of the library to search in
            chat_history: Optional chat history
            document_id: ID of the document to search in
            
        Returns:
            Generated answer
        """
        rag_chain = self.create_rag_chain(library_name, document_id=document_id)

        chat_history_str = "\n".join(
            [f"{msg.role}: {msg.content}" for msg in chat_history]
        )

        try:
            result = await rag_chain.ainvoke({
                "question": question, 
                "chat_history": chat_history_str
            })
            return result
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "Sorry, I encountered an error processing your request. Please try again."
    
    async def generate_streaming_answer(
        self, 
        query: str, 
        library_name: str, 
        chat_history: Optional[List[Dict[str, str]]] = None,
        n_results: int = 8
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming answer to a question using RAG
        
        Args:
            query: User's question
            library_name: Name of the library to search in
            chat_history: Optional chat history
            n_results: Number of chunks to retrieve
            
        Yields:
            Chunks of the generated answer
        """
        # Get vectorstore
        vectorstore = self.get_vectorstore(library_name)
        
        # Search for similar documents
        docs = vectorstore.similarity_search(
            query=query,
            k=n_results
        )
        
        if not docs:
            yield json.dumps({
                "type": "answer",
                "content": "I couldn't find any relevant information in the library to answer your question."
            })
            return
        
        # Format context
        context = self._format_docs(docs)
        
        # Prepare sources information for streaming
        sources = []
        for doc in docs:
            metadata = doc.metadata
            sources.append({
                "document_id": metadata.get("document_id"),
                "page_num": metadata.get("page_num"),
                "text_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            })
        
        # Stream sources first
        yield json.dumps({
            "type": "sources",
            "content": sources
        })
        
        # Setup streaming LLM
        streaming_llm = ChatOpenAI(
            base_url=self.api_base_url,
            api_key=self.api_key,
            model_name=self.model_name,
            temperature=0.3,
            max_tokens=1024,
            streaming=True
        )
        
        # Create streaming chain
        streaming_chain = self.template | streaming_llm
        
        # Generate streaming response
        current_token = ""
        async for chunk in streaming_chain.astream({"context": context, "question": query}):
            if chunk.content:
                current_token += chunk.content
                
                # Yield the token
                yield json.dumps({
                    "type": "answer",
                    "content": chunk.content
                }) 