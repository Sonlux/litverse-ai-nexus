from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.models.database import get_db, Conversation, Message
from app.api.chat import ConversationResponse, MessageResponse

router = APIRouter()

# API endpoints
@router.get("/history", response_model=List[ConversationResponse])
async def get_all_conversations(db: Session = Depends(get_db)):
    """
    Get all conversations across all libraries
    """
    conversations = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return conversations

@router.get("/history/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """
    Get a specific conversation by ID with all messages
    """
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with ID {conversation_id} not found"
        )
    
    # Get messages
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()
    conversation.messages = messages
    
    return conversation

@router.delete("/history/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """
    Delete a conversation by ID
    """
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with ID {conversation_id} not found"
        )
    
    # Delete conversation (will cascade delete messages)
    db.delete(conversation)
    db.commit()
    
    return None