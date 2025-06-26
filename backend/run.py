import uvicorn
from app.utils.config import get_settings
import os

def main():
    """
    Main entry point for the application
    """
    settings = get_settings()
    
    # Create data directories if they don't exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.vectorstore_dir, exist_ok=True)
    
    # Note: We don't need to create tables here since we've created them manually in Supabase
    print("Starting BookBot API server...")
    print(f"Using Supabase URL: {os.getenv('SUPABASE_URL')}")
    
    # Run the application
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()