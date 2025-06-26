import os
from app.models.database import Base, engine, create_tables
from app.utils.config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    """
    Initialize the database with the correct schema
    """
    settings = get_settings()
    
    # Create data directories if they don't exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.vectorstore_dir, exist_ok=True)
    
    # Create database tables
    logger.info("Creating database tables...")
    create_tables()
    
    logger.info("Database initialized successfully")
    logger.info(f"Upload directory: {settings.upload_dir}")
    logger.info(f"Vector store directory: {settings.vectorstore_dir}")
    logger.info(f"Database URL: {settings.database_url}")

if __name__ == "__main__":
    init_db()