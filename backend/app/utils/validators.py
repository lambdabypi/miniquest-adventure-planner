# backend/app/utils/validators.py
"""Validation utilities"""

import re
from typing import Optional

def validate_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email string to validate
        
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_location(location: str) -> bool:
    """
    Validate location string.
    
    Args:
        location: Location string to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not location or len(location.strip()) < 3:
        return False
    
    # Should contain at least city name
    return len(location.strip().split()) >= 1

def sanitize_input(text: str, max_length: int = 500) -> str:
    """
    Sanitize user input.
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return ""
    
    # Remove excessive whitespace
    sanitized = ' '.join(text.strip().split())
    
    # Truncate to max length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized

def validate_api_key(api_key: Optional[str], key_name: str) -> bool:
    """
    Validate API key presence and format.
    
    Args:
        api_key: API key to validate
        key_name: Name of the API key (for logging)
        
    Returns:
        True if valid, False otherwise
    """
    if not api_key:
        return False
    
    if len(api_key.strip()) < 10:
        return False
    
    return True