# backend/app/api/dependencies.py
"""API dependencies for dependency injection"""

from fastapi import Depends, HTTPException, status
from app.core.rag import DynamicTavilyRAGSystem
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)

# ========================================
# GLOBAL SINGLETONS
# ========================================

_coordinator = None
_mongodb_client = None
_rag_system: Optional[DynamicTavilyRAGSystem] = None

# ========================================
# COORDINATOR
# ========================================

def set_coordinator(coordinator):
    """Set the global coordinator instance"""
    global _coordinator
    _coordinator = coordinator
    logger.info("✅ Coordinator set in dependencies")

def get_coordinator():
    """
    Dependency to get the coordinator instance.
    
    Returns:
        LangGraphCoordinator instance
        
    Raises:
        HTTPException: If coordinator not initialized
    """
    if _coordinator is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Multi-agent coordinator not initialized"
        )
    return _coordinator

# ========================================
# MONGODB CLIENT
# ========================================

def set_mongodb_client(client):
    """Set the global MongoDB client instance"""
    global _mongodb_client
    _mongodb_client = client
    logger.info("✅ MongoDB client set in dependencies")

def get_mongodb_client():
    """
    Dependency to get the MongoDB client instance.
    
    Returns:
        MongoDBClient instance
        
    Raises:
        HTTPException: If MongoDB not initialized
    """
    if _mongodb_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not initialized"
        )
    return _mongodb_client

# ========================================
# RAG SYSTEM (NEW)
# ========================================

def set_rag_system(rag_system: DynamicTavilyRAGSystem):
    """
    Set the global RAG system instance.
    Called by main.py during startup.
    """
    global _rag_system
    _rag_system = rag_system
    logger.info("✅ RAG system set in dependencies")

def get_rag_system() -> DynamicTavilyRAGSystem:
    """
    Dependency to get the RAG system instance.
    
    Returns:
        DynamicTavilyRAGSystem instance
        
    Raises:
        HTTPException: If RAG system not initialized
    """
    if _rag_system is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG system not initialized. Please restart the server."
        )
    return _rag_system