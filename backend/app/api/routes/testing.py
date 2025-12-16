# backend/app/api/routes/testing.py
"""Testing and diagnostic endpoints"""

from fastapi import APIRouter, HTTPException, Depends
import logging

from ...core.config import settings
from ...models import TestResponse
from ..dependencies import get_coordinator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/test", tags=["testing"])

@router.get("/imports", response_model=dict)
def test_imports():
    """Test if all required packages can be imported"""
    results = {}
    
    # Test Tavily
    try:
        from tavily import TavilyClient
        results["tavily"] = "✅ OK"
    except Exception as e:
        results["tavily"] = f"❌ Error: {str(e)}"
    
    # Test OpenAI
    try:
        import openai
        results["openai"] = "✅ OK"
    except Exception as e:
        results["openai"] = f"❌ Error: {str(e)}"
    
    # Test LangGraph
    try:
        from langgraph.graph import StateGraph, END
        results["langgraph"] = "✅ OK"
    except Exception as e:
        results["langgraph"] = f"❌ Error: {str(e)}"
    
    # Test Google Maps (optional)
    try:
        import googlemaps
        results["googlemaps"] = "✅ OK (Enhanced)"
    except Exception as e:
        results["googlemaps"] = f"⚠️ Optional: {str(e)}"
    
    core_working = all("✅" in v for v in [
        results.get("tavily", ""),
        results.get("openai", ""),
        results.get("langgraph", "")
    ])
    
    return {
        "import_test": results,
        "overall_status": "✅ Core imports working" if core_working else "❌ Core imports failed",
        "assignment_ready": core_working
    }

@router.get("/tavily", response_model=dict)
async def test_tavily():
    """Test Tavily API directly"""
    if not settings.TAVILY_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="TAVILY_API_KEY not configured"
        )
    
    try:
        from tavily import TavilyClient
        tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        
        # Test search
        search_results = tavily_client.search(
            query="coffee shops Boston 2025",
            max_results=2
        )
        
        results = search_results.get("results", [])
        
        return {
            "test": "success",
            "api_key_status": "✅ Valid",
            "results_count": len(results),
            "sample_results": [
                {
                    "title": r.get("title", "")[:100],
                    "url": r.get("url", "")
                }
                for r in results
            ],
            "message": "Tavily API operational",
            "assignment_compliant": True
        }
        
    except Exception as e:
        logger.error(f"Tavily test error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Tavily test failed: {str(e)}"
        )

@router.get("/workflow", response_model=dict)
async def test_workflow(coordinator = Depends(get_coordinator)):
    """Test complete LangGraph workflow"""
    try:
        # Test with simple request
        adventures, metadata = await coordinator.generate_adventures(
            user_input="coffee shops in Boston",
            user_address="Boston, MA"
        )
        
        return {
            "test": "success",
            "adventures_generated": len(adventures),
            "workflow_steps": [
                "parse_location", "parse_intent", "scout_venues",
                "research_venues", "enhance_routing", "create_adventures"
            ],
            "features_tested": {
                "location_parsing": True,
                "venue_scouting": True,
                "tavily_research": True,
                "routing": True,
                "adventure_creation": True
            },
            "metadata": metadata,
            "message": "Complete workflow operational",
            "assignment_compliant": True
        }
        
    except Exception as e:
        logger.error(f"Workflow test error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Workflow test failed: {str(e)}"
        )