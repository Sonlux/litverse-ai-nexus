import os
import json
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
from dotenv import load_dotenv
from app.core.embeddings import EmbeddingManager
from openai import AsyncOpenAI

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_system")

class RAGSystem:
    """
    Retrieval-Augmented Generation system for answering questions based on document context
    """
    
    def __init__(self, embedding_manager: EmbeddingManager):
        """
        Initialize the RAG system
        
        Args:
            embedding_manager: Instance of EmbeddingManager for retrieving relevant chunks
        """
        self.embedding_manager = embedding_manager
        self.api_key = os.getenv("NEMOTRON_API_KEY")
        self.api_base_url = os.getenv("NEMOTRON_API_URL", "https://integrate.api.nvidia.com/v1")
        
        # The correct model ID for NVIDIA's Llama 3.3 70B
        self.model = "meta/llama-3.3-70b-instruct"
        
        # Validate API key
        if not self.api_key:
            raise ValueError("NEMOTRON_API_KEY environment variable is not set")
        
        # Initialize the OpenAI client with NVIDIA endpoint
        try:
            self.client = AsyncOpenAI(
                base_url=self.api_base_url,
                api_key=self.api_key
            )
            logger.info(f"RAG system initialized with NVIDIA API at {self.api_base_url}")
        except Exception as e:
            logger.error(f"Failed to initialize NVIDIA API client: {str(e)}")
            raise
    
    def _prepare_context(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Prepare context from retrieved chunks with better formatting
        
        Args:
            chunks: List of retrieved text chunks
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        # Add a section header to help the LLM understand the context
        context_parts.append("# DOCUMENT EXCERPTS:")
        
        # Group chunks by document and page for better context
        doc_pages = {}
        
        for chunk in chunks:
            metadata = chunk["metadata"]
            doc_id = metadata.get("document_id", "unknown")
            page_num = metadata.get("page_num", "unknown")
            
            key = f"{doc_id}_{page_num}"
            if key not in doc_pages:
                doc_pages[key] = []
            
            doc_pages[key].append(chunk["text"])
        
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
    
    def _prepare_prompt(self, query: str, context: str, chat_history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
        """
        Prepare prompt for the LLM with improved instructions
        
        Args:
            query: User's question
            context: Retrieved context
            chat_history: Optional chat history
            
        Returns:
            Formatted messages for the LLM
        """
        # Start with enhanced system message
        messages = [{
            "role": "system",
            "content": """You are BookBot, an expert AI assistant that answers questions based on document content.

INSTRUCTIONS:
1. Read the provided document excerpts carefully.
2. Base your answer ONLY on the information in the provided excerpts.
3. If the answer is in the documents, provide a detailed and accurate response.
4. When citing information, mention the document ID and page number.
5. If the information is NOT in the provided excerpts, be honest and say you don't have enough information.
6. DO NOT make up or infer information that isn't explicitly stated in the documents.
7. If the excerpts contain partial information, provide what you can find and acknowledge the limitations.
8. Use a confident, helpful tone while remaining factual and accurate.
"""
        }]
        
        # Add chat history if provided
        if chat_history:
            messages.extend(chat_history)
        
        # Add context and query with clear instructions
        messages.append({
            "role": "user",
            "content": f"""I need information from the following document excerpts:

{context}

Based ONLY on the above excerpts (not your general knowledge), please answer this question:
{query}

If the answer isn't contained in the excerpts, please state that you don't have enough information from the provided documents to answer the question."""
        })
        
        return messages
    
    async def generate_answer(
        self, 
        query: str, 
        library_name: str, 
        chat_history: Optional[List[Dict[str, str]]] = None,
        n_results: int = 8
    ) -> Dict[str, Any]:
        """
        Generate an answer to a question using RAG
        
        Args:
            query: User's question
            library_name: Name of the library to search in
            chat_history: Optional chat history
            n_results: Number of chunks to retrieve
            
        Returns:
            Dictionary with answer and source information
        """
        # Clean and prepare the query for better search
        clean_query = query.strip().lower()
        
        # Retrieve relevant chunks with increased number
        chunks = self.embedding_manager.search_similar_chunks(
            query=clean_query,
            library_name=library_name,
            n_results=n_results
        )
        
        if not chunks:
            return {
                "answer": "I couldn't find any relevant information in the library to answer your question.",
                "sources": [],
                "query": query
            }
        
        # Prepare context and prompt
        context = self._prepare_context(chunks)
        messages = self._prepare_prompt(query, context, chat_history)
        
        # Call LLM API using the OpenAI client
        try:
            logger.info(f"Generating response with model: {self.model}")
            
            # Convert messages to OpenAI format
            openai_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
            
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=openai_messages,
                temperature=0.3,
                max_tokens=1024
            )
            
            # Extract response
            answer = completion.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            raise Exception(f"Failed to generate response: {str(e)}")
        
        # Prepare source information
        sources = []
        for chunk in chunks:
            metadata = chunk["metadata"]
            sources.append({
                "document_id": metadata.get("document_id"),
                "page_num": metadata.get("page_num"),
                "text_preview": chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"]
            })
        
        return {
            "answer": answer,
            "sources": sources,
            "query": query
        }
    
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
        # Clean and prepare the query for better search
        clean_query = query.strip().lower()
        
        # Retrieve relevant chunks with increased number
        chunks = self.embedding_manager.search_similar_chunks(
            query=clean_query,
            library_name=library_name,
            n_results=n_results
        )
        
        if not chunks:
            yield json.dumps({
                "type": "answer",
                "content": "I couldn't find any relevant information in the library to answer your question."
            })
            return
        
        # Prepare context and prompt
        context = self._prepare_context(chunks)
        messages = self._prepare_prompt(query, context, chat_history)
        
        # First yield the sources
        sources = []
        for chunk in chunks:
            metadata = chunk["metadata"]
            sources.append({
                "document_id": metadata.get("document_id"),
                "page_num": metadata.get("page_num"),
                "text_preview": chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"]
            })
        
        yield json.dumps({
            "type": "sources",
            "content": sources
        })
        
        # Since streaming seems to be causing issues, temporarily fall back to non-streaming
        # and return the whole response at once
        try:
            logger.info(f"Falling back to non-streaming response due to SSE issues")
            
            # Convert messages to OpenAI format
            openai_messages = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
            
            # Use non-streaming API call
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=openai_messages,
                temperature=0.3,
                max_tokens=1024,
                stream=False
            )
            
            # Return the complete response at once
            answer = completion.choices[0].message.content
            
            yield json.dumps({
                "type": "answer",
                "content": answer
            })
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            yield json.dumps({
                "type": "answer",
                "content": f"I encountered an error while processing your question. Error: {str(e)}"
            })