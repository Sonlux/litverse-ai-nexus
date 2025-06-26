from fastapi.testclient import TestClient
import pytest
import os
import tempfile
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.database import Base, get_db

# Create a temporary directory for test data
TEST_DIR = tempfile.mkdtemp()
TEST_UPLOAD_DIR = os.path.join(TEST_DIR, "uploads")
TEST_VECTORSTORE_DIR = os.path.join(TEST_DIR, "vectorstore")
os.makedirs(TEST_UPLOAD_DIR, exist_ok=True)
os.makedirs(TEST_VECTORSTORE_DIR, exist_ok=True)

# Create test database
TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create test client
client = TestClient(app)

@pytest.fixture(scope="module")
def setup_and_teardown():
    # Setup - create tables
    Base.metadata.create_all(bind=engine)
    
    yield
    
    # Teardown - drop tables and remove test directory
    Base.metadata.drop_all(bind=engine)
    shutil.rmtree(TEST_DIR)

def test_root(setup_and_teardown):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to BookBot API"}

def test_create_library(setup_and_teardown):
    response = client.post(
        "/api/libraries",
        json={"name": "Test Library", "description": "A test library"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Library"
    assert data["description"] == "A test library"
    assert "id" in data

def test_get_libraries(setup_and_teardown):
    # Create a library first
    client.post(
        "/api/libraries",
        json={"name": "Another Library", "description": "Another test library"}
    )
    
    response = client.get("/api/libraries")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_create_conversation(setup_and_teardown):
    # Create a library first
    library_response = client.post(
        "/api/libraries",
        json={"name": "Chat Library", "description": "A library for testing chat"}
    )
    library_id = library_response.json()["id"]
    
    # Create a conversation
    response = client.post(
        f"/api/conversations/{library_id}",
        json={"title": "Test Conversation"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Conversation"
    assert "id" in data