# backend/app/models/auth_models.py
"""Authentication models"""

from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    username: str
    full_name: str

class UserCreate(UserBase):
    """User creation model"""
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "password": "securepassword123"
            }
        }

class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }

class User(UserBase):
    """Full user model"""
    id: str
    is_active: bool
    adventure_count: int
    preferences: dict
    created_at: datetime
    updated_at: datetime

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str
    user: dict