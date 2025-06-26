#!/usr/bin/env python
"""
Script to test querying the RAG system
"""

import os
import sys
import asyncio
import json
from dotenv import load_dotenv
from app.core.langchain_rag import LangChainRAG
from app.utils.config import get_settings

async def test_query():
    """
    Test querying the RAG system with a sample question
    """
    # Load environment variables
    load_dotenv()
    
    # Get settings
    settings = get_settings()
    
    # Initialize RAG system
    rag_system = LangChainRAG(vectorstore_path=settings.VECTORSTORE_DIR)
    
    # Prompt for library name
    print("\nAvailable libraries:")
    libraries_dir = settings.VECTORSTORE_DIR
    libraries = [d for d in os.listdir(libraries_dir) if os.path.isdir(os.path.join(libraries_dir, d))]
    
    for i, library in enumerate(libraries):
        print(f"{i+1}. {library}")
    
    library_choice = input("\nEnter library number to query: ")
    try:
        library_index = int(library_choice) - 1
        if library_index < 0 or library_index >= len(libraries):
            raise ValueError()
        library_name = libraries[library_index]
    except ValueError:
        print("Invalid choice, using first library")
        library_name = libraries[0] if libraries else "Engineering"
    
    # Prompt for query
    query = input(f"\nEnter your question for library '{library_name}': ")
    if not query:
        query = "What are the main data mining techniques described in the book?"
        print(f"Using default query: '{query}'")
    
    print(f"\nQuerying library '{library_name}' with: '{query}'")
    
    # Execute query
    try:
        result = await rag_system.generate_answer(query, library_name)
        
        print("\n=== ANSWER ===")
        print(result["answer"])
        
        print("\n=== SOURCES ===")
        for i, source in enumerate(result["sources"]):
            print(f"Source {i+1}: Document {source['document_id']}, Page {source['page_num']}")
            print(f"Preview: {source['text_preview'][:100]}...")
            print()
    
    except Exception as e:
        print(f"\nError querying RAG system: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_query()) 