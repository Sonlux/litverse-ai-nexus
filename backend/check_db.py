#!/usr/bin/env python
"""
Script to check the current database schema
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def check_database():
    """Check the current database schema"""
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
    
    # Connect to the database and check schema
    with engine.connect() as conn:
        # List all tables
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        
        tables = [row[0] for row in result]
        print("\nTables in database:")
        for table in tables:
            print(f"  - {table}")
        
        # For each table, list columns
        for table in tables:
            print(f"\nColumns in {table}:")
            result = conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = '{table}'
                ORDER BY ordinal_position
            """))
            
            for row in result:
                print(f"  - {row[0]} ({row[1]}, {'NULL' if row[2] == 'YES' else 'NOT NULL'})")

if __name__ == "__main__":
    check_database() 