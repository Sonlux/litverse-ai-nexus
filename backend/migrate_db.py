#!/usr/bin/env python
"""
Database migration script to update the document table schema
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def migrate_database():
    """Perform database migration to add new columns to the document table"""
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
        # Check which columns already exist
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents'"))
        existing_columns = [row[0] for row in result]
        
        print(f"Existing columns in documents table: {existing_columns}")
        
        # Define columns to add with their SQL data types
        columns_to_add = {
            'file_size': 'INTEGER',
            'status': 'VARCHAR',
            'source_type': 'VARCHAR',
            'page_count': 'INTEGER',
            'author': 'VARCHAR',
            'is_web_document': 'BOOLEAN'
        }
        
        # Add missing columns
        for col_name, col_type in columns_to_add.items():
            if col_name not in existing_columns:
                print(f"Adding column: {col_name}")
                try:
                    conn.execute(text(f'ALTER TABLE documents ADD COLUMN {col_name} {col_type}'))
                    conn.commit()
                except Exception as e:
                    print(f"Error adding column {col_name}: {str(e)}")
        
        # Rename num_pages to page_count if needed
        if 'num_pages' in existing_columns and 'page_count' in existing_columns:
            print("Both num_pages and page_count exist, copying values")
            try:
                conn.execute(text('UPDATE documents SET page_count = num_pages WHERE page_count IS NULL'))
                conn.commit()
            except Exception as e:
                print(f"Error copying num_pages to page_count: {str(e)}")
        elif 'num_pages' in existing_columns and 'page_count' not in existing_columns:
            print("Renaming num_pages to page_count")
            try:
                conn.execute(text('ALTER TABLE documents RENAME COLUMN num_pages TO page_count'))
                conn.commit()
            except Exception as e:
                print(f"Error renaming num_pages to page_count: {str(e)}")
        
        # Set default values for new columns
        print("Setting default values for new columns")
        try:
            conn.execute(text("UPDATE documents SET status = 'processed' WHERE status IS NULL"))
            conn.execute(text("UPDATE documents SET source_type = 'pdf' WHERE source_type IS NULL"))
            conn.execute(text("UPDATE documents SET is_web_document = FALSE WHERE is_web_document IS NULL"))
            conn.commit()
        except Exception as e:
            print(f"Error setting default values: {str(e)}")
    
    print("Migration completed")

if __name__ == "__main__":
    migrate_database() 