import os
from app.models.database import Base, engine, create_tables
from app.utils.config import get_settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_db():
    """
    Drop all tables and recreate them
    """
    settings = get_settings()
    
    # Create data directories if they don't exist
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.vectorstore_dir, exist_ok=True)
    
    # Drop all tables
    logger.info("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Create database tables
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Database reset successfully")
    logger.info(f"Upload directory: {settings.upload_dir}")
    logger.info(f"Vector store directory: {settings.vectorstore_dir}")
    logger.info(f"Database URL: {settings.database_url}")

if __name__ == "__main__":
    reset_db() 