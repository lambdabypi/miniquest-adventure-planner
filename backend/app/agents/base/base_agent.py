# backend/app/agents/base/base_agent.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Base class for all MiniQuest agents with common functionality"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"agents.{name.lower()}")
        self.initialized_at = datetime.now()
        self.logger.info(f"✅ {name} Agent initialized")
    
    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process input and return results"""
        pass
    
    def validate_input(self, input_data: Dict[str, Any], required_fields: List[str]) -> bool:
        """Validate that input contains required fields"""
        missing_fields = [field for field in required_fields if field not in input_data]
        if missing_fields:
            self.log_error(f"Missing required fields: {missing_fields}")
            return False
        return True
    
    def log_processing(self, step: str, details: str = ""):
        """Log processing step with standardized format"""
        self.logger.info(f"🔄 {self.name}: {step}" + (f" - {details}" if details else ""))
    
    def log_success(self, result_summary: str):
        """Log successful completion"""
        self.logger.info(f"✅ {self.name}: {result_summary}")
    
    def log_warning(self, warning: str):
        """Log warning"""
        self.logger.warning(f"⚠️ {self.name}: {warning}")
    
    def log_error(self, error: str):
        """Log error"""
        self.logger.error(f"❌ {self.name}: {error}")
    
    def create_response(self, success: bool, data: Dict[str, Any] = None, 
                       error: str = None, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create standardized agent response"""
        response = {
            "success": success,
            "agent": self.name,
            "timestamp": datetime.now().isoformat()
        }
        
        if data:
            response["data"] = data
        if error:
            response["error"] = error
        if metadata:
            response["metadata"] = metadata
            
        return response

class AgentError(Exception):
    """Custom exception for agent errors"""
    def __init__(self, agent_name: str, message: str):
        self.agent_name = agent_name
        self.message = message
        super().__init__(f"{agent_name}: {message}")

class ValidationError(AgentError):
    """Exception for input validation errors"""
    pass

class ProcessingError(AgentError):
    """Exception for processing errors"""
    pass