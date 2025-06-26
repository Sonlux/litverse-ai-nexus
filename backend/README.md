# BookBot - RAG PDF QA System

BookBot is a Retrieval-Augmented Generation (RAG) system for answering questions from PDF documents. It allows users to upload PDFs, organize them into libraries, and ask questions about their content.

## Features

- Upload and manage PDFs under multiple libraries
- Parse and embed PDF content for semantic search
- Ask questions about your documents using RAG
- Maintain chat history per library
- Modern, responsive UI with Streamlit

## Setup

1. Make sure you have Python 3.8+ installed
2. Install the required packages:

   ```
   pip install -r requirements.txt
   ```

3. Set up your environment variables in a `.env` file:

   ```
   # Database
   DATABASE_URL=your_supabase_postgres_url

   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key

   # LLM API
   NEMOTRON_API_KEY=your_nemotron_api_key
   NEMOTRON_API_URL=https://api.nemo.ai/v1/chat/completions
   ```

## Running the Application

### FastAPI Backend

Run the FastAPI backend server:

```
python run.py
```

The API will be available at http://localhost:8000

### Streamlit Frontend

Run the Streamlit frontend:

```
streamlit run streamlit_app.py
```

The Streamlit app will be available at http://localhost:8501

## Usage

1. Create a library or select an existing one
2. Upload PDF documents to the library
3. Create a new conversation
4. Ask questions about your documents
5. View and continue previous conversations

## API Endpoints

- `/api/libraries` - Manage libraries
- `/api/upload/{library_id}` - Upload PDFs
- `/api/documents/{library_id}` - Get documents in a library
- `/api/conversations/{library_id}` - Manage conversations
- `/api/chat/{conversation_id}` - Send messages and get responses

## Architecture

- **FastAPI**: Backend API server
- **Streamlit**: Frontend UI
- **Supabase**: Database and storage
- **PyMuPDF**: PDF parsing
- **Sentence Transformers**: Text embeddings
- **ChromaDB**: Vector storage
- **Nemotron 3.3 70B**: LLM for generating responses
