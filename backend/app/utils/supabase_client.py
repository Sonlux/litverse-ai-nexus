import os
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class SupabaseClientError(Exception):
    """Exception raised for Supabase client errors"""
    pass

@lru_cache()
def get_supabase_client() -> Client:
    """
    Get a cached Supabase client instance
    
    Returns:
        Supabase client
    
    Raises:
        SupabaseClientError: If Supabase URL or key is not set
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        raise SupabaseClientError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")
    
    return create_client(url, key)

@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Get a cached Supabase admin client instance with service role key
    
    Returns:
        Supabase admin client
    
    Raises:
        SupabaseClientError: If Supabase URL or service key is not set
    """
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not service_key:
        raise SupabaseClientError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file")
    
    return create_client(url, service_key)