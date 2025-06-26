from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY: {'*' * 10 + SUPABASE_KEY[-5:] if SUPABASE_KEY else 'Not set'}")

# Try to create Supabase client
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client created successfully")
        
        # Check RLS policies
        print("\nChecking tables and RLS policies...")
        tables = ["libraries", "documents", "conversations", "messages"]
        for table in tables:
            try:
                response = supabase.table(table).select("count", count="exact").execute()
                print(f"Table '{table}': {response.count} rows")
                
                # Try to get RLS policies for this table
                print(f"  - This table is accessible")
            except Exception as e:
                print(f"Error accessing table '{table}': {str(e)}")
                
        # Check storage bucket
        try:
            buckets = supabase.storage.list_buckets()
            print("\nStorage buckets:")
            for bucket in buckets:
                print(f"  - {bucket['name']}")
        except Exception as e:
            print(f"Error listing storage buckets: {str(e)}")
            
    except Exception as e:
        print(f"Error creating Supabase client: {str(e)}")
else:
    print("Supabase credentials not properly set in .env file") 