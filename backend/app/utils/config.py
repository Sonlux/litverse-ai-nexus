import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    # Base directory
    base_dir: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Data directories
    upload_dir: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "uploads")
    vectorstore_dir: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "vectorstore")
    
    # API keys
    nemotron_api_key: str = os.getenv("NEMOTRON_API_KEY", "")
    nemotron_api_url: str = os.getenv("NEMOTRON_API_URL", "https://integrate.api.nvidia.com/v1")
    
    # Supabase configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'bookbot.db')}")
    
    model_config = {
        "env_file": ".env",
        "extra": "allow"
    }

@lru_cache()
def get_settings():
    """
    Get cached settings
    """
    return Settings()