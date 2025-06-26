from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
from datetime import datetime

from app.models.database import get_db, Library, Conversation, Message
from app.core.langchain_rag import LangChainRAG
from app.utils.config import get_settings

router = APIRouter()
settings = get_settings()

# Initialize LangChain RAG system
rag_system = LangChainRAG(vectorstore_path=settings.vectorstore_dir)

# Pydantic models for request/response
class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class ConversationCreate(BaseModel):
    title: Optional[str] = None
    document_id: Optional[int] = None

class ConversationResponse(BaseModel):
    id: int
    title: str = None
    document_id: Optional[int] = None
    messages: List[MessageResponse] = []
    
    class Config:
        orm_mode = True

# Pydantic model for the simplified chat endpoint
class ChatQuery(BaseModel):
    query: str
    library_id: int
    conversation_id: Optional[int] = None

# Helper function to format chat history for the RAG system
def format_chat_history(messages):
    formatted = []
    for msg in messages:
        formatted.append({
            "role": msg.role,
            "content": msg.content
        })
    return formatted

# API endpoints
@router.post("/conversations/{library_id}", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    library_id: int,
    conversation: ConversationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new conversation in a library
    """
    # Check if library exists
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    # Create conversation
    db_conversation = Conversation(
        title=conversation.title or "New Conversation",
        library_id=library_id,
        document_id=conversation.document_id
    )
    
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    
    return db_conversation

@router.post("/chat", response_model=dict)
async def simplified_chat(
    chat_query: ChatQuery,
    db: Session = Depends(get_db)
):
    """
    Simplified chat endpoint for the Streamlit app that creates or continues a conversation
    """
    library_id = chat_query.library_id
    query = chat_query.query
    conversation_id = chat_query.conversation_id
    
    # Check if library exists
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    # Get or create conversation
    if conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation or conversation.library_id != library_id:
            # Create new conversation if the provided one doesn't exist or belongs to a different library
            conversation = Conversation(library_id=library_id, title=f"Conversation {query[:20]}...")
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            conversation_id = conversation.id
    else:
        # Create new conversation
        conversation = Conversation(library_id=library_id, title=f"Conversation {query[:20]}...")
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.id
    
    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=query
    )
    
    db.add(user_message)
    db.commit()
    
    # Get chat history
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()
    chat_history = format_chat_history(messages)
    
    # Generate answer using LangChain RAG
    try:
        response = await rag_system.generate_answer(
            query=query,
            library_name=library.name,
            chat_history=chat_history
        )
        
        # Save assistant message
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=response["answer"]
        )
        
        db.add(assistant_message)
        db.commit()
        
        # Return the response with the conversation ID
        return {
            "answer": response["answer"],
            "sources": response["sources"],
            "conversation_id": conversation_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response: {str(e)}"
        )

@router.post("/chat/{conversation_id}", response_model=MessageResponse)
async def send_message(
    conversation_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db)
):
    """
    Send a message to a conversation
    """
    # Check if conversation exists
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get library
    library = db.query(Library).filter(Library.id == conversation.library_id).first()
    if not library:
        raise HTTPException(status_code=404, detail="Library not found")

    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=message.content
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Get chat history including the new user message
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()

    # Generate response using LangChain RAG
    try:
        response = await rag_system.generate_answer(
            question=message.content,
            library_name=library.name,
            chat_history=messages,
            document_id=conversation.document_id
        )
        answer_text = response

        # Save assistant message
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=answer_text
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        # Update conversation timestamp
        conversation.updated_at = datetime.utcnow()
        db.commit()

        return assistant_message

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

@router.get("/chat/{conversation_id}/stream")
async def stream_chat(
    conversation_id: int,
    content: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Stream a chat response
    """
    # Check if conversation exists
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get library
    library = db.query(Library).filter(Library.id == conversation.library_id).first()
    if not library:
        raise HTTPException(status_code=404, detail="Library not found")
    
    # Get conversation history
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()
    history = [(msg.role, msg.content) for msg in messages]
    
    # Add user message to history
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=content
    )
    db.add(user_message)
    db.commit()
    
    # Update conversation timestamp
    conversation.updated_at = datetime.utcnow()
    db.commit()
    
    # Stream response
    async def event_generator():
        try:
            # Generate streaming response
            async for token in rag_system.stream_query(content, library.name, history):
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
            
            # Get full response for storing
            response, sources = rag_system.query(content, library.name, history)
            
            # Add assistant message to history
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=response
            )
            db.add(assistant_message)
            db.commit()
            
            # Send sources as the final event
            yield f"data: {json.dumps({'sources': sources})}\n\n"
            
            # Send end event
            yield f"data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )

@router.get("/conversations/{library_id}", response_model=List[ConversationResponse])
async def get_conversations(
    library_id: int,
    document_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get all conversations in a library
    """
    # Check if library exists
    library = db.query(Library).filter(Library.id == library_id).first()
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Library with ID {library_id} not found"
        )
    
    # Get conversations
    query = db.query(Conversation).filter(Conversation.library_id == library_id)
    if document_id is not None:
        query = query.filter(Conversation.document_id == document_id)
    conversations = query.all()
    
    return conversations

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    """
    Get all messages in a conversation
    """
    # Check if conversation exists
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with ID {conversation_id} not found"
        )
    
    # Get messages
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()
    
    return messages

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """
    Delete a conversation
    """
    # Check if conversation exists
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with ID {conversation_id} not found"
        )
    
    # Delete all messages in the conversation
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    
    # Delete the conversation
    db.delete(conversation)
    db.commit()
    
    return None

@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    conversation_update: ConversationCreate,
    db: Session = Depends(get_db)
):
    """
    Update the title of a conversation
    """
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Update title
    if conversation_update.title is not None:
        convo.title = conversation_update.title
        db.commit()
        db.refresh(convo)
    return convo