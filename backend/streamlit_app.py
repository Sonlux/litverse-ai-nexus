import streamlit as st
import requests
import os
import json
from dotenv import load_dotenv
from io import BytesIO
import time
from sseclient import SSEClient
import threading

# Load environment variables
load_dotenv()

# API URLs
API_URL = "http://localhost:8000/api"
SIMPLE_API_URL = "http://localhost:8001"

# Page title and configuration
st.set_page_config(
    page_title="BookBot - RAG PDF QA System",
    page_icon="📚",
    layout="wide"
)

# Custom CSS for better UI
st.markdown("""
<style>
    .source-box {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 10px;
    }
    .source-title {
        font-weight: bold;
        color: #0068c9;
    }
    .source-text {
        font-size: 0.9em;
        color: #424242;
    }
    .chat-message {
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
    }
    .user-message {
        background-color: #e6f3ff;
        border-left: 5px solid #2e86de;
    }
    .assistant-message {
        background-color: #f0f7ff;
        border-left: 5px solid #26de81;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state for conversation history
if "conversations" not in st.session_state:
    st.session_state.conversations = {}
if "current_conversation_id" not in st.session_state:
    st.session_state.current_conversation_id = None
if "current_library_id" not in st.session_state:
    st.session_state.current_library_id = None
if "messages" not in st.session_state:
    st.session_state.messages = []
if "sources" not in st.session_state:
    st.session_state.sources = []

# Function to get all libraries
def get_libraries():
    try:
        response = requests.get(f"{API_URL}/libraries")
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Error fetching libraries: {response.text}")
            return []
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return []

# Function to create a new library
def create_library(name, description=""):
    try:
        response = requests.post(
            f"{API_URL}/libraries",
            json={"name": name, "description": description}
        )
        if response.status_code == 201:
            return response.json()
        else:
            st.error(f"Error creating library: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return None

# Function to get documents in a library
def get_documents(library_id):
    try:
        response = requests.get(f"{API_URL}/documents/{library_id}")
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Error fetching documents: {response.text}")
            return []
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return []

# Function to upload a PDF
def upload_pdf(library_id, file):
    try:
        files = {"file": (file.name, file, "application/pdf")}
        response = requests.post(
            f"{API_URL}/upload/{library_id}",
            files=files
        )
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Error uploading PDF: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return None

# Function to get conversations for a library
def get_conversations(library_id):
    try:
        response = requests.get(f"{API_URL}/conversations/{library_id}")
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Error fetching conversations: {response.text}")
            return []
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return []

# Function to create a new conversation
def create_conversation(library_id, title=None):
    try:
        data = {}
        if title:
            data["title"] = title
        response = requests.post(
            f"{API_URL}/conversations/{library_id}",
            json=data
        )
        if response.status_code == 201:
            return response.json()
        else:
            st.error(f"Error creating conversation: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return None

# Function to get messages for a conversation
def get_messages(conversation_id):
    try:
        response = requests.get(f"{API_URL}/conversations/{conversation_id}/messages")
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Error fetching messages: {response.text}")
            return []
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return []

# Function to send a message and get a response (non-streaming)
def send_message(conversation_id, message):
    try:
        response = requests.post(
            f"{API_URL}/chat/{conversation_id}",
            json={"content": message}
        )
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Error sending message: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return None

# Function to send a message and get a streaming response
def send_message_streaming(conversation_id, message):
    try:
        response = requests.post(
            f"{API_URL}/chat/{conversation_id}/stream",
            json={"content": message},
            stream=True
        )
        
        if response.status_code == 200:
            # Instead of using SSEClient directly, we'll manually process the response
            # to avoid the 'SSEClient object is not iterable' error
            return response
        else:
            st.error(f"Error sending message: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        return None

# Manual function to parse SSE events
def parse_sse(response):
    buffer = ""
    for chunk in response.iter_content(chunk_size=1024):
        if not chunk:
            continue
        
        buffer += chunk.decode('utf-8')
        while '\n\n' in buffer:
            line, buffer = buffer.split('\n\n', 1)
            line = line.strip()
            if line.startswith('data: '):
                data = line[6:]  # Remove 'data: ' prefix
                if data == "[DONE]":
                    yield {"done": True}
                else:
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue

# Main application layout
st.title("📚 BookBot - RAG PDF QA System")

# Sidebar for library selection and document management
with st.sidebar:
    st.header("Libraries")
    
    # Get all libraries
    libraries = get_libraries()
    
    # Library selection
    library_options = ["Create New Library"] + [f"{lib['name']} (ID: {lib['id']})" for lib in libraries]
    selected_library = st.selectbox("Select Library", library_options)
    
    # Create new library
    if selected_library == "Create New Library":
        with st.form("create_library_form"):
            library_name = st.text_input("Library Name")
            library_description = st.text_area("Description (Optional)")
            submit_button = st.form_submit_button("Create Library")
            
            if submit_button and library_name:
                new_library = create_library(library_name, library_description)
                if new_library:
                    st.success(f"Library '{library_name}' created successfully!")
                    st.session_state.current_library_id = new_library["id"]
                    st.rerun()
    else:
        # Extract library ID from selection
        library_id = int(selected_library.split("ID: ")[1].rstrip(")"))
        st.session_state.current_library_id = library_id
        
        # Upload PDF section
        st.header("Upload PDF")
        uploaded_file = st.file_uploader("Choose a PDF file", type="pdf")
        if uploaded_file is not None:
            if st.button("Upload PDF"):
                with st.spinner("Uploading and processing PDF..."):
                    result = upload_pdf(library_id, uploaded_file)
                    if result:
                        st.success(f"PDF '{uploaded_file.name}' uploaded successfully!")
        
        # Show documents in the library
        st.header("Documents")
        documents = get_documents(library_id)
        if documents:
            for doc in documents:
                st.write(f"📄 {doc['filename']} ({doc['num_pages']} pages)")
        else:
            st.info("No documents in this library yet.")
        
        # Conversation management
        st.header("Conversations")
        conversations = get_conversations(library_id)
        
        # Create new conversation
        if st.button("New Conversation"):
            new_conversation = create_conversation(library_id)
            if new_conversation:
                st.session_state.current_conversation_id = new_conversation["id"]
                st.session_state.messages = []
                st.session_state.sources = []
                st.rerun()
        
        # List existing conversations
        if conversations:
            conversation_options = [f"{conv['title']} (ID: {conv['id']})" for conv in conversations]
            selected_conversation = st.selectbox("Select Conversation", conversation_options)
            
            # Extract conversation ID from selection
            conversation_id = int(selected_conversation.split("ID: ")[1].rstrip(")"))
            
            if conversation_id != st.session_state.current_conversation_id:
                st.session_state.current_conversation_id = conversation_id
                # Load messages for this conversation
                messages = get_messages(conversation_id)
                st.session_state.messages = messages
                st.session_state.sources = []  # Reset sources for new conversation
                st.rerun()
        else:
            st.info("No conversations in this library yet.")

# Main content area with columns for chat and sources
if st.session_state.current_library_id and st.session_state.current_conversation_id:
    # Create two columns: chat and sources
    chat_col, sources_col = st.columns([3, 1])
    
    with chat_col:
        # Display chat messages
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.write(message["content"])
        
        # Chat input
        user_input = st.chat_input("Ask a question about your documents...")
        if user_input:
            # Add user message to chat
            with st.chat_message("user"):
                st.write(user_input)
            
            # Add user message to session state
            st.session_state.messages.append({"role": "user", "content": user_input})
            
            # Create a placeholder for the assistant's response
            with st.chat_message("assistant"):
                response_placeholder = st.empty()
                full_response = ""
                
                # Try to use streaming response
                try:
                    response = send_message_streaming(st.session_state.current_conversation_id, user_input)
                    
                    if response:
                        # Process streaming response using our custom parser
                        for data in parse_sse(response):
                            if data.get("done", False):
                                break
                                
                            if data.get("type") == "sources":
                                # Store sources for display in sidebar
                                st.session_state.sources = data.get("content", [])
                            elif data.get("type") == "answer":
                                # Update the response text
                                content = data.get("content", "")
                                full_response += content
                                response_placeholder.markdown(full_response)
                    else:
                        # Fallback to non-streaming response
                        response = send_message(st.session_state.current_conversation_id, user_input)
                        if response:
                            full_response = response["content"]
                            response_placeholder.markdown(full_response)
                            if "sources" in response:
                                st.session_state.sources = response["sources"]
                except Exception as e:
                    # Fallback to non-streaming response
                    st.warning(f"Streaming error: {str(e)}. Falling back to standard response.")
                    response = send_message(st.session_state.current_conversation_id, user_input)
                    if response:
                        full_response = response["content"]
                        response_placeholder.markdown(full_response)
                        if "sources" in response:
                            st.session_state.sources = response["sources"]
            
            # Add AI response to session state if we got a response
            if full_response:
                st.session_state.messages.append({"role": "assistant", "content": full_response})
    
    with sources_col:
        # Display sources if available
        st.header("Sources")
        if st.session_state.sources:
            for i, source in enumerate(st.session_state.sources):
                with st.expander(f"Source {i+1} - Page {source.get('page_num', 'unknown')}"):
                    st.markdown(f"**Document ID:** {source.get('document_id', 'unknown')}")
                    st.markdown(f"**Page:** {source.get('page_num', 'unknown')}")
                    st.markdown("**Text Preview:**")
                    st.markdown(f"```\n{source.get('text_preview', '')}\n```")
        else:
            st.info("No sources available for this response.")

elif st.session_state.current_library_id:
    st.info("Create or select a conversation to start chatting.")
else:
    st.info("Select or create a library to get started.")

# Footer
st.markdown("---")
st.caption("BookBot - RAG PDF QA System | Built with Streamlit, FastAPI, and Supabase") 