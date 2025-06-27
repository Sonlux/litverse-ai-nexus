# BookBot - RAG-Based PDF QA System

BookBot is a full-stack AI web application for semantic search and question answering over PDF books and web content. Users can upload PDFs or web pages, organize them into libraries, and chat with an LLM (Retrieval-Augmented Generation) about their content. The system uses FastAPI, LangChain, ChromaDB, and Supabase on the backend, and React (Vite, Tailwind) on the frontend.

## Features

- Upload and manage PDFs and web pages under multiple libraries
- Parse and embed PDF/web content for semantic search and RAG
- Chat interface to ask context-aware questions using LLMs (Nemotron 3.3 70B)
- Maintain and resume chat history per user and per library
- View, rename, and delete conversations and documents
- Modern, responsive, and user-friendly UI (React + Tailwind)
- Supabase authentication and storage integration
- ChromaDB vectorstore for fast semantic retrieval
- Streamed responses and source citation in answers

## Architecture

- **Frontend**: React (Vite, TailwindCSS, shadcn/ui, React Query, Supabase Auth)
- **Backend**: FastAPI (Python), LangChain for RAG, ChromaDB for vector storage, SentenceTransformers for embeddings, Supabase for auth/storage, Nemotron 3.3 70B for LLM
- **Data**: SQLite (local dev) or Supabase Postgres (production), ChromaDB for vectors, Supabase Storage for PDFs

## Project Structure

- `src/` - Frontend React app (components, pages, hooks, services)
- `backend/` - FastAPI backend, core logic, models, API routes, utils
- `backend/app/core/` - PDF and web processors, RAG logic
- `backend/app/api/` - FastAPI routers for libraries, upload, chat, history
- `backend/app/models/` - SQLAlchemy models for Library, Document, Conversation, Message
- `backend/app/utils/` - Config, Supabase client
- `backend/data/` - Uploaded files and vectorstore (local dev)
- `supabase/` - Supabase config and migrations

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Supabase account (for production)
- LLM API access (Nemotron 3.3 70B)

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Create a virtual environment:

   ```
   python -m venv venv
   venv\Scripts\activate  # On Windows
   # or
   source venv/bin/activate  # On Linux/Mac
   ```

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory with the following variables:

   ```
   # Database (local dev uses SQLite by default)
   DATABASE_URL=your_supabase_postgres_url  # Optional for production
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   # LLM API
   NEMOTRON_API_KEY=your_api_key
   NEMOTRON_API_URL=https://integrate.api.nvidia.com/v1
   ```

5. Initialize the database and data folders:

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

## API Routes (Main Endpoints)

### Libraries

- `GET    /api/libraries` - Get all libraries
- `POST   /api/libraries` - Create a new library
- `PUT    /api/libraries/{id}` - Update a library
- `DELETE /api/libraries/{id}` - Delete a library

### Documents

- `GET    /api/documents/{library_id}` - Get documents in a library
- `POST   /api/upload/{library_id}` - Upload a PDF document
- `POST   /api/upload-web/{library_id}` - Upload a web page
- `DELETE /api/documents/{document_id}` - Delete a document

### Chat

- `POST   /api/conversations/{library_id}` - Create a new conversation
- `GET    /api/conversations/{library_id}` - Get all conversations in a library
- `GET    /api/conversations/{conversation_id}/messages` - Get messages in a conversation
- `POST   /api/chat/{conversation_id}` - Send a message to a conversation
- `POST   /api/chat/{conversation_id}/stream` - Stream a message to a conversation
- `POST   /api/chat` - Simplified chat endpoint
- `DELETE /api/conversations/{conversation_id}` - Delete a conversation

## Main Scripts

- `backend/init_db.py` - Initialize database and data folders
- `backend/run.py` - Start FastAPI server
- `backend/streamlit_app.py` - (Optional) Streamlit UI for demo/testing
- `backend/check_supabase.py` - Test Supabase connection and RLS

## Environment Variables

- See `.env.example` or above for required variables
- Local dev uses SQLite by default; set `DATABASE_URL` for Postgres/Supabase
- Supabase storage bucket for PDFs: `pdfs`

## Troubleshooting

- Ensure all environment variables are set in `.env`
- For local dev, data is stored in `backend/data/`
- For production, use Supabase for DB and storage
- If LLM API fails, check `NEMOTRON_API_KEY` and `NEMOTRON_API_URL`

## Contributing

Pull requests and issues are welcome! Please open an issue for bugs or feature requests.

## License

MIT
