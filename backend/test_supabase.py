from dotenv import load_dotenv
import os
from app.utils.supabase_client import get_supabase_client

load_dotenv()

def test_supabase_connection():
    """Test the connection to Supabase"""
    try:
        # Get Supabase client
        print("Connecting to Supabase...")
        supabase = get_supabase_client()
        
        # Test storage access
        print("Testing storage access...")
        try:
            buckets = supabase.storage.list_buckets()
            print(f"Found {len(buckets)} storage buckets:")
            for bucket in buckets:
                print(f"  - {bucket['name']}")
            
            # Check specifically for the pdfs bucket
            try:
                files = supabase.storage.from_("pdfs").list()
                print(f"Successfully accessed 'pdfs' bucket. Found {len(files)} files.")
            except Exception as e:
                print(f"Error accessing 'pdfs' bucket: {str(e)}")
        except Exception as e:
            print(f"Error listing buckets: {str(e)}")
        
        # Test database access by querying the libraries table
        print("\nTesting database access...")
        response = supabase.table("libraries").select("*").execute()
        libraries = response.data
        print(f"Found {len(libraries)} libraries")
        
        print("\nConnection test successful!")
        
    except Exception as e:
        print(f"Error connecting to Supabase: {str(e)}")

if __name__ == "__main__":
    test_supabase_connection()