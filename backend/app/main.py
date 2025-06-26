from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api import libraries, upload, chat, history
from app.utils.supabase_client import get_supabase_client
from supabase import Client

app = FastAPI(
    title="BookBot API",
    description="API for BookBot - A RAG-based PDF QA System",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get Supabase client
def get_supabase():
    return get_supabase_client()

# Include routers with Supabase dependency
app.include_router(libraries.router, prefix="/api", tags=["libraries"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(history.router, prefix="/api", tags=["history"])

@app.get("/")
async def root():
    return {"message": "Welcome to BookBot API"}

@app.get("/health")
async def health_check(supabase: Client = Depends(get_supabase)):
    """
    Health check endpoint that also verifies Supabase connection
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)