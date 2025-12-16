# backend/app/api/routes/chat.py
"""Chat conversation history routes"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List

from ..dependencies import get_mongodb_client
from ...database.mongodb_client import MongoDBClient
from ...core.auth import AuthHandler
from ...models.chat_models import (  # ✅ Import from models
    ChatMessage,
    SaveConversationRequest,
    UpdateConversationRequest,
    ConversationResponse
)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Security scheme
security = HTTPBearer()

# ==================== Dependencies ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
) -> dict:
    """
    Dependency to get current authenticated user.
    
    Args:
        credentials: HTTP Bearer credentials with JWT token
        mongodb_client: MongoDB client instance
        
    Returns:
        Dict with current user information
        
    Raises:
        HTTPException: If authentication fails
    """
    auth_handler = AuthHandler(mongodb_client)
    return await auth_handler.get_current_user(credentials)

# ==================== Routes ====================

@router.post("/conversations", response_model=ConversationResponse)
async def save_conversation(
    request: SaveConversationRequest,
    current_user: dict = Depends(get_current_user),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    Save a new chat conversation.
    
    - **messages**: List of chat messages
    - **location**: User's location during the chat
    - **query_id**: Optional link to adventure query
    """
    try:
        conversation_data = {
            "user_id": current_user["id"],
            "messages": [msg.dict() for msg in request.messages],
            "location": request.location,
            "query_id": request.query_id,
        }
        
        conversation_id = await mongodb_client.chat_repo.save_conversation(conversation_data)
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "message": "Conversation saved successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
    current_user: dict = Depends(get_current_user),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    Add new messages to an existing conversation.
    
    - **conversation_id**: ID of the conversation to update
    - **messages**: New messages to append
    """
    try:
        new_messages = [msg.dict() for msg in request.messages]
        
        success = await mongodb_client.chat_repo.update_conversation(
            conversation_id, new_messages
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {
            "success": True,
            "message": f"Added {len(new_messages)} messages to conversation"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations", response_model=ConversationResponse)
async def get_conversations(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    Get user's conversation history (metadata only, no full messages).
    
    - **limit**: Maximum number of conversations to return (default: 20)
    """
    try:
        conversations = await mongodb_client.chat_repo.get_user_conversations(
            current_user["id"], limit
        )
        
        return {
            "success": True,
            "conversations": conversations,
            "count": len(conversations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    Get a specific conversation with full message history.
    
    - **conversation_id**: ID of the conversation to retrieve
    """
    try:
        conversation = await mongodb_client.chat_repo.get_conversation(conversation_id)
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Verify ownership
        if conversation.get("user_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {
            "success": True,
            "conversation": conversation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations/{conversation_id}", response_model=ConversationResponse)
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    mongodb_client: MongoDBClient = Depends(get_mongodb_client)
):
    """
    Delete a conversation.
    
    - **conversation_id**: ID of the conversation to delete
    """
    try:
        success = await mongodb_client.chat_repo.delete_conversation(
            conversation_id, current_user["id"]
        )
        
        if not success:
            raise HTTPException(
                status_code=404, 
                detail="Conversation not found or not authorized"
            )
        
        return {
            "success": True,
            "message": "Conversation deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))