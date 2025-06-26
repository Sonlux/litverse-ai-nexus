from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, create_engine, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
from app.utils.config import get_settings

load_dotenv()

# Get database URL from settings
settings = get_settings()
DATABASE_URL = settings.database_url

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create SQLAlchemy engine with PostgreSQL-specific options
# Check if using SQLite (for local development) or PostgreSQL (for Supabase)
if DATABASE_URL.startswith('sqlite'):
    engine = create_engine(DATABASE_URL)
else:
    # PostgreSQL with Supabase
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        connect_args={"sslmode": "require"}  # Enable SSL for Supabase connection
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Library(Base):
    __tablename__ = "libraries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="library", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="library", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_path = Column(String)  # Can store either a Supabase path or a URL
    library_id = Column(Integer, ForeignKey("libraries.id"))
    title = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # Size in bytes or characters
    status = Column(String, default="uploaded")  # uploaded, processing, processed, error
    source_type = Column(String, default="pdf")  # pdf, web, text, etc.
    
    # Document metadata
    page_count = Column(Integer, nullable=True)
    author = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_web_document = Column(Boolean, default=False)  # Flag for web documents
    
    # Relationships
    library = relationship("Library", back_populates="documents")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    library_id = Column(Integer, ForeignKey("libraries.id"))
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    library = relationship("Library", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    document = relationship("Document", viewonly=True)

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

# Create all tables in the database
def create_tables():
    Base.metadata.create_all(bind=engine)

# Get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()