import os
import sys
from app.utils.supabase_client import get_supabase_admin_client
from app.utils.config import get_settings
from dotenv import load_dotenv

load_dotenv()

def init_supabase_api():
    """
    Initialize Supabase using the REST API instead of direct PostgreSQL connection
    """
    settings = get_settings()
    
    try:
        # Get Supabase admin client
        print("Connecting to Supabase...")
        supabase = get_supabase_admin_client()
        
        # Create tables using SQL through the Supabase API
        print("Creating tables...")
        
        # Libraries table
        print("Creating libraries table...")
        supabase.rpc(
            "rpc_name",
            {
                "query": """
                CREATE TABLE IF NOT EXISTS libraries (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """
            }
        ).execute()
        
        # Documents table
        print("Creating documents table...")
        supabase.rpc(
            "rpc_name",
            {
                "query": """
                CREATE TABLE IF NOT EXISTS documents (
                    id SERIAL PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
                    title TEXT,
                    num_pages INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """
            }
        ).execute()
        
        # Conversations table
        print("Creating conversations table...")
        supabase.rpc(
            "rpc_name",
            {
                "query": """
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    title TEXT,
                    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """
            }
        ).execute()
        
        # Messages table
        print("Creating messages table...")
        supabase.rpc(
            "rpc_name",
            {
                "query": """
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """
            }
        ).execute()
        
        # Create storage bucket for PDFs
        print("Creating storage bucket for PDFs...")
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
    init_supabase_api()