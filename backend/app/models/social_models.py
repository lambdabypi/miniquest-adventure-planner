# backend/app/models/social_models.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CreatePostRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    adventure_title: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = []

class PostLikeResponse(BaseModel):
    success: bool
    liked: bool
    like_count: int

class CommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=300)

class CommentResponse(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    created_at: datetime

class PostResponse(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    adventure_title: Optional[str]
    location: Optional[str]
    tags: List[str]
    like_count: int
    liked_by_me: bool
    comment_count: int
    comments: List[CommentResponse]
    created_at: datetime

class PostListResponse(BaseModel):
    success: bool
    posts: List[PostResponse]
    total: int
    has_more: bool