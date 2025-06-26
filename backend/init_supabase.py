import os
import sys
import psycopg2
from psycopg2 import sql
from app.utils.config import get_settings
from dotenv import load_dotenv

load_dotenv()

def init_supabase():
    """
    Initialize Supabase database with required tables
    """
    settings = get_settings()
    
    try:
        # Get database connection details from environment
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL environment variable is not set")
        
        print("Connecting to database...")
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Create libraries table
        print("Creating libraries table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS libraries (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Create documents table
        print("Creating documents table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
                title TEXT,
                num_pages INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Create conversations table
        print("Creating conversations table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                title TEXT,
                library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Create messages table
        print("Creating messages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        
        # Close database connection
        cursor.close()
        conn.close()
        
        # Create storage bucket using Supabase client
        from app.utils.supabase_client import get_supabase_admin_client
        
        print("Creating storage bucket for PDFs...")
        supabase = get_supabase_admin_client()
        try:
            supabase.storage.create_bucket(
                "pdfs",
                {"public": False}  # Private bucket
            )
        except Exception as e:
            if "already exists" not in str(e):
                print(f"Warning when creating storage bucket: {str(e)}")
        
        print("Initialization complete!")
        print(f"Supabase URL: {os.getenv('SUPABASE_URL')}")
        
    except Exception as e:
        print(f"Error initializing Supabase: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    init_supabase()