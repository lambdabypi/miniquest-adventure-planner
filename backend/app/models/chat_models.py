# backend/app/models/chat_models.py
"""Chat-related Pydantic models"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    """Single chat message"""
    id: str
    type: str = Field(..., description="Message type: 'user' or 'assistant'")
    content: str
    timestamp: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "msg_123",
                "type": "user",
                "content": "Coffee shops in Boston",
                "timestamp": "2025-01-01T12:00:00Z"
            }
        }

class SaveConversationRequest(BaseModel):
    """Request to save a new conversation"""
    messages: List[ChatMessage]
    location: str = Field(..., description="User's location during chat")
    query_id: Optional[str] = Field(None, description="Optional link to adventure query")
    
    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {
                        "id": "1",
                        "type": "assistant",
                        "content": "Hi! What would you like to explore?",
                        "timestamp": "2025-01-01T12:00:00Z"
                    },
                    {
                        "id": "2",
                        "type": "user",
                        "content": "Coffee shops in Boston",
                        "timestamp": "2025-01-01T12:01:00Z"
                    }
                ],
                "location": "Boston, MA",
                "query_id": "abc123"
            }
        }

class UpdateConversationRequest(BaseModel):
    """Request to add messages to existing conversation"""
    messages: List[ChatMessage]
    
    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {
                        "id": "3",
                        "type": "assistant",
                        "content": "Here are some great options!",
                        "timestamp": "2025-01-01T12:02:00Z"
                    }
                ]
            }
        }

class ConversationMetadata(BaseModel):
    """Conversation metadata (for list view)"""
    id: str = Field(..., alias="_id")
    user_id: str
    location: str
    preview: str
    message_count: int
    query_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "conv_123",
                "user_id": "user_456",
                "location": "Boston, MA",
                "preview": "Coffee shops in Boston",
                "message_count": 5,
                "query_id": "query_789",
                "created_at": "2025-01-01T12:00:00Z",
                "updated_at": "2025-01-01T12:05:00Z"
            }
        }

class Conversation(BaseModel):
    """Full conversation with all messages"""
    id: str = Field(..., alias="_id")
    user_id: str
    messages: List[ChatMessage]
    location: str
    message_count: int
    query_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True

class ConversationResponse(BaseModel):
    """Response wrapper for conversation operations"""
    success: bool
    conversation_id: Optional[str] = None
    conversation: Optional[Conversation] = None
    conversations: Optional[List[ConversationMetadata]] = None
    count: Optional[int] = None
    message: Optional[str] = None