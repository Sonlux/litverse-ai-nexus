from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Create FastAPI app
app = FastAPI(
    title="BookBot API (Simple Version)",
    description="Simple version of BookBot API using Supabase",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to BookBot API (Simple Version)"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint that verifies Supabase connection
    """
    try:
        # Test Supabase connection
        response = supabase.table("libraries").select("count", count="exact").execute()
        count = response.count
        
        return {
            "status": "healthy",
            "supabase_connected": True,
            "libraries_count": count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "supabase_connected": False,
            "error": str(e)
        }

@app.get("/libraries")
async def get_libraries():
    """
    Get all libraries
    """
    try:
        response = supabase.table("libraries").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching libraries: {str(e)}")

@app.post("/libraries")
async def create_library(library: dict):
    """
    Create a new library
    """
    try:
        response = supabase.table("libraries").insert(library).execute()
        return response.data[0] if response.data else {"error": "No data returned"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating library: {str(e)}")

if __name__ == "__main__":
    print(f"Starting simple BookBot API server...")
    print(f"Using Supabase URL: {SUPABASE_URL}")
    try:
        # Test Supabase connection first
        print("Testing Supabase connection...")
        test = supabase.table("libraries").select("count", count="exact").execute()
        print(f"Connection successful! Found {test.count} libraries.")
        
        # Run the server on port 8001 (since 8000 is already in use)
        uvicorn.run(app, host="0.0.0.0", port=8001)
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()