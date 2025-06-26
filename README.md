# BookBot - RAG-Based PDF QA System

BookBot is a full-stack AI web application that allows users to upload PDF books, organize them into libraries, and ask questions based on their content using Retrieval-Augmented Generation (RAG).

## Features

- Upload and manage PDFs under multiple libraries
- Parse and embed PDF content for semantic search and RAG
- Chat interface to ask context-aware questions using LLMs
- Maintain and resume chat history per user and per library
- Modern, responsive, and user-friendly UI

## Tech Stack

### Frontend

- React with Vite
- TailwindCSS for styling
- React Query for data fetching
- Supabase for authentication and storage

### Backend

- FastAPI for the API
- LangChain for RAG pipeline
- ChromaDB for vector storage
- SentenceTransformers for embeddings
- Nemotron 3.3 70B for LLM

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Supabase account
- LLM API access (Nemotron 3.3 70B)

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Create a virtual environment:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with the following variables:

   ```
   NEMOTRON_API_KEY=your_api_key
   NEMOTRON_API_URL=https://integrate.api.nvidia.com/v1
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

5. Initialize the database:

   ```
   python init_db.py
   ```

6. Run the FastAPI server:
   ```
   python run.py
   ```

The API will be available at http://localhost:8000/api.

### Frontend Setup

1. From the project root directory:

   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

The frontend will be available at http://localhost:8080.

## API Routes

### Libraries

- GET `/api/libraries` - Get all libraries
- POST `/api/libraries` - Create a new library
- PUT `/api/libraries/{id}` - Update a library
- DELETE `/api/libraries/{id}` - Delete a library

### Documents

- GET `/api/documents/{library_id}` - Get documents in a library
- POST `/api/upload/{library_id}` - Upload a PDF document
- POST `/api/upload-web/{library_id}` - Upload a web page
- DELETE `/api/documents/{document_id}` - Delete a document

### Chat

- POST `/api/conversations/{library_id}` - Create a new conversation
- GET `/api/conversations/{library_id}` - Get all conversations in a library
- GET `/api/conversation/{conversation_id}/messages` - Get messages in a conversation
- POST `/api/chat/{conversation_id}` - Send a message to a conversation
- POST `/api/chat/{conversation_id}/stream` - Stream a message to a conversation
- POST `/api/chat` - Simplified chat endpoint
- DELETE `/api/conversations/{conversation_id}` - Delete a conversation

## License

MIT
