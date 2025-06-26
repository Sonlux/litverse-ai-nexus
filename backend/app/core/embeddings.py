from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.utils import embedding_functions
import os
import re
from typing import List, Dict, Any, Optional
import numpy as np

class EmbeddingManager:
    """
    Class for managing embeddings and vector store operations
    """
    
    def __init__(self, vectorstore_path: str, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding manager
        
        Args:
            vectorstore_path: Path to store ChromaDB data
            model_name: Name of the sentence transformer model to use
        """
        self.vectorstore_path = vectorstore_path
        os.makedirs(vectorstore_path, exist_ok=True)
        
        # Initialize the embedding model
        self.model = SentenceTransformer(model_name)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(path=vectorstore_path)
        
        # Create embedding function
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=model_name)
    
    def get_or_create_collection(self, library_name: str) -> chromadb.Collection:
        """
        Get or create a ChromaDB collection for a library
        
        Args:
            library_name: Name of the library
            
        Returns:
            ChromaDB collection
        """
        try:
            collection = self.client.get_collection(
                name=library_name,
                embedding_function=self.embedding_function
            )
        except:
            collection = self.client.create_collection(
                name=library_name,
                embedding_function=self.embedding_function
            )
        
        return collection
    
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
        collection = self.get_or_create_collection(library_name)
        
        # Prepare data for batch insertion
        ids = []
        texts = []
        metadatas = []
        
        for chunk in chunks:
            # Create a unique ID for each chunk
            chunk_id = f"{document_id}_{chunk['chunk_id']}"
            ids.append(chunk_id)
            
            # Extract text for embedding
            chunk_text = chunk["text"]
            texts.append(chunk_text)
            
            # Prepare enhanced metadata
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
            
            # Extract and store keywords for better retrieval
            keywords = self._extract_keywords(chunk_text)
            if keywords:
                metadata["keywords"] = ", ".join(keywords[:10])  # Store top 10 keywords
            
            metadatas.append(metadata)
        
        # Add documents to the collection
        collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas
        )
        
        return len(chunks)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """
        Extract potential keywords from text
        
        Args:
            text: Text to extract keywords from
            
        Returns:
            List of potential keywords
        """
        # Simple keyword extraction - look for capitalized terms, quoted phrases, etc.
        keywords = []
        
        # Find quoted phrases (likely important terms)
        quoted = re.findall(r'"([^"]+)"', text)
        keywords.extend(quoted)
        
        # Find capitalized terms (potential proper nouns or important concepts)
        # Exclude single letters and all-caps words (likely acronyms)
        capitalized = re.findall(r'\b[A-Z][a-z]{2,}\b', text)
        keywords.extend(capitalized)
        
        # Find potential technical terms or phrases (words with numbers, underscores, etc.)
        technical = re.findall(r'\b[a-zA-Z]+[_\-][a-zA-Z0-9_\-]+\b', text)
        keywords.extend(technical)
        
        # Remove duplicates and return
        return list(set(keywords))
    
    def search_similar_chunks(
        self, 
        query: str, 
        library_name: str, 
        n_results: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for chunks similar to the query with improved relevance
        
        Args:
            query: The search query
            library_name: Name of the library to search in
            n_results: Number of results to return
            document_ids: Optional list of document IDs to filter by
            
        Returns:
            List of similar chunks with text and metadata
        """
        collection = self.get_or_create_collection(library_name)
        
        # Preprocess query - extract important terms
        query = self._preprocess_query(query)
        
        # Prepare filter if document_ids is provided
        where_filter = None
        if document_ids:
            where_filter = {"document_id": {"$in": document_ids}}
        
        # Query the collection
        results = collection.query(
            query_texts=[query],
            n_results=n_results * 2,  # Retrieve more than needed for post-processing
            where=where_filter
        )
        
        # Post-process and rank results
        formatted_results = self._postprocess_results(results, query, n_results)
        
        return formatted_results
    
    def _preprocess_query(self, query: str) -> str:
        """
        Preprocess and enhance the search query
        
        Args:
            query: Original query
            
        Returns:
            Enhanced query
        """
        # Clean the query
        query = query.strip()
        
        # Extract key terms for emphasis
        key_terms = []
        
        # Look for quoted phrases
        quoted = re.findall(r'"([^"]+)"', query)
        if quoted:
            key_terms.extend(quoted)
            # Remove quotes from the query to avoid confusion with the embedding model
            for term in quoted:
                query = query.replace(f'"{term}"', term)
        
        # Look for capitalized terms
        capitalized = re.findall(r'\b[A-Z][a-z]{2,}\b', query)
        if capitalized:
            key_terms.extend(capitalized)
        
        # Emphasize key terms by repeating them
        if key_terms:
            key_terms_str = " ".join(key_terms)
            query = f"{query} {key_terms_str}"
        
        return query
    
    def _postprocess_results(self, results, query: str, n_results: int) -> List[Dict[str, Any]]:
        """
        Post-process search results for better relevance
        
        Args:
            results: Raw search results
            query: Original query
            n_results: Number of results to return
            
        Returns:
            Processed and re-ranked results
        """
        formatted_results = []
        
        if not results["documents"] or len(results["documents"][0]) == 0:
            return formatted_results
        
        # Extract key terms from the query for boosting
        key_terms = set()
        # Add all words from the query (lowercase)
        for word in re.findall(r'\b[a-zA-Z]{3,}\b', query.lower()):
            key_terms.add(word)
        
        # Create enhanced results with relevance score
        enhanced_results = []
        for i, doc in enumerate(results["documents"][0]):
            distance = float(results["distances"][0][i]) if results["distances"] else 1.0
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            
            # Calculate a relevance boost based on term presence
            boost = 0
            doc_lower = doc.lower()
            for term in key_terms:
                if term in doc_lower:
                    # Boost based on term frequency
                    term_count = doc_lower.count(term)
                    boost += 0.1 * min(term_count, 3)  # Cap at 3 occurrences
            
            # Apply boost to distance (lower distance = better match)
            adjusted_distance = max(0.01, distance - boost)
            
            enhanced_results.append({
                "text": doc,
                "metadata": metadata,
                "distance": distance,
                "adjusted_distance": adjusted_distance
            })
        
        # Sort by adjusted distance
        enhanced_results.sort(key=lambda x: x["adjusted_distance"])
        
        # Take the top n_results
        for result in enhanced_results[:n_results]:
            formatted_results.append({
                "text": result["text"],
                "metadata": result["metadata"],
                "distance": result["distance"]
            })
        
        return formatted_results
    
    def delete_document(self, library_name: str, document_id: str) -> bool:
        """
        Delete all chunks for a document from the vector store
        
        Args:
            library_name: Name of the library
            document_id: ID of the document to delete
            
        Returns:
            True if successful
        """
        collection = self.get_or_create_collection(library_name)
        
        # Delete all chunks with the given document_id
        collection.delete(
            where={"document_id": document_id}
        )
        
        return True