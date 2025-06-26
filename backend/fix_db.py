#!/usr/bin/env python
"""
Script to fix database issues and set default values
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def fix_database():
    """Fix database issues and set default values"""
    load_dotenv()
    
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")
    
    print(f"Connecting to database: {DATABASE_URL}")
    
    # Create SQLAlchemy engine
    if DATABASE_URL.startswith('sqlite'):
        engine = create_engine(DATABASE_URL)
    else:
        # PostgreSQL with Supabase
        engine = create_engine(
            DATABASE_URL,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,
            connect_args={"sslmode": "require"}
        )
    
    # Connect to the database and execute SQL directly
    with engine.connect() as conn:
        # Copy num_pages values to page_count
        print("Copying num_pages values to page_count")
        try:
            conn.execute(text('UPDATE documents SET page_count = num_pages WHERE num_pages IS NOT NULL AND page_count IS NULL'))
            conn.commit()
            print("Successfully copied values")
        except Exception as e:
            print(f"Error copying values: {str(e)}")
            conn.rollback()
        
        # Set default values for status, source_type, and is_web_document
        print("Setting default values for new columns")
        try:
            conn.execute(text("UPDATE documents SET status = 'processed' WHERE status IS NULL"))
            conn.execute(text("UPDATE documents SET source_type = 'pdf' WHERE source_type IS NULL"))
            conn.execute(text("UPDATE documents SET is_web_document = FALSE WHERE is_web_document IS NULL"))
            conn.commit()
            print("Successfully set default values")
        except Exception as e:
            print(f"Error setting default values: {str(e)}")
            conn.rollback()
    
    print("Database fixing completed")

if __name__ == "__main__":
    fix_database() 