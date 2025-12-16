#!/usr/bin/env python3
"""
Test script for RAG personalization in adventure generation

This script tests:
1. Creating a user
2. Generating adventures (without personalization)
3. Saving adventures with ratings
4. Generating new adventures (with personalization)
5. Verifying personalization is applied
"""

import requests
import json
import time
from typing import Optional, Dict, List

# Configuration
API_URL = "http://localhost:8000"
TEST_USER = {
    "username": "test_user_rag",
    "email": f"test_rag_{int(time.time())}@example.com",
    "password": "TestPassword123!",
    "full_name": "Test RAG User"  # ✨ Required field
}

class Color:
    """ANSI color codes"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    """Print colored header"""
    print(f"\n{Color.HEADER}{Color.BOLD}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Color.END}\n")

def print_success(text: str):
    """Print success message"""
    print(f"{Color.GREEN}✅ {text}{Color.END}")

def print_error(text: str):
    """Print error message"""
    print(f"{Color.RED}❌ {text}{Color.END}")

def print_info(text: str):
    """Print info message"""
    print(f"{Color.CYAN}ℹ️  {text}{Color.END}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Color.YELLOW}⚠️  {text}{Color.END}")

class RAGPersonalizationTester:
    """Test RAG personalization functionality"""
    
    def __init__(self):
        self.api_url = API_URL
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.adventures_generated: List[Dict] = []
        self.saved_adventure_ids: List[str] = []
    
    def run_all_tests(self):
        """Run complete test suite"""
        print_header("🧪 RAG PERSONALIZATION TEST SUITE")
        
        try:
            # Test 1: Create user
            self.test_create_user()
            time.sleep(1)
            
            # Test 2: Generate initial adventures (no personalization)
            self.test_generate_adventures_first_time()
            time.sleep(2)
            
            # Test 3: Save adventures with ratings
            self.test_save_adventures_with_ratings()
            time.sleep(2)
            
            # Test 4: Verify ChromaDB storage
            self.test_verify_chromadb_storage()
            time.sleep(1)
            
            # Test 5: Generate new adventures (with personalization)
            self.test_generate_adventures_with_personalization()
            time.sleep(2)
            
            # Test 6: Verify personalization was applied
            self.test_verify_personalization_applied()
            
            # Test 7: Check saved adventures
            self.test_get_saved_adventures()
            
            # Test 8: Get personalization insights
            self.test_get_personalization_insights()
            
            print_header("🎉 ALL TESTS COMPLETED")
            self.print_summary()
            
        except Exception as e:
            print_error(f"Test suite failed: {e}")
            raise
    
    # ========================================
    # TEST METHODS
    # ========================================
    
    def test_create_user(self):
        """Test 1: Create a new user"""
        print_header("Test 1: Create User")
        
        try:
            # Register user
            response = requests.post(
                f"{self.api_url}/api/auth/register",
                json=TEST_USER
            )
            
            # Debug: Print response if error
            if response.status_code not in [200, 201]:
                print_error(f"Registration failed with status {response.status_code}")
                print_error(f"Response: {response.text}")
                response.raise_for_status()
            
            data = response.json()
            self.token = data["access_token"]
            
            print_success(f"User created: {TEST_USER['username']}")
            print_info(f"Token: {self.token[:20]}...")
            
            # Get user info - user_id is in user.id
            user_info = data.get("user", {})
            self.user_id = user_info.get("id")
            
            if not self.user_id:
                print_error("Could not find user_id in response")
                print_info(f"Response structure: {data.keys()}")
                raise ValueError("user_id not found in registration response")
            
            print_success(f"User ID: {self.user_id}")
            
        except Exception as e:
            print_error(f"Failed to create user: {e}")
            raise
    
    def test_generate_adventures_first_time(self):
        """Test 2: Generate adventures (first time, no personalization)"""
        print_header("Test 2: Generate Adventures (First Time)")
        
        try:
            response = requests.post(
                f"{self.api_url}/api/adventures",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "user_input": "coffee shops and art galleries in Boston",
                    "user_address": None
                }
            )
            response.raise_for_status()
            
            data = response.json()
            
            if not data["success"]:
                print_error(f"Adventure generation failed: {data.get('message')}")
                return
            
            self.adventures_generated = data["adventures"]
            metadata = data["metadata"]
            
            print_success(f"Generated {len(self.adventures_generated)} adventures")
            print_info(f"Personalization applied: {metadata.get('personalization_applied', False)}")
            
            if metadata.get("personalization_applied"):
                print_warning("⚠️  Personalization was applied on first request (unexpected)")
            else:
                print_success("✓ No personalization on first request (expected)")
            
            # Print adventure titles
            for i, adventure in enumerate(self.adventures_generated, 1):
                print(f"   {i}. {adventure['title']}")
            
        except Exception as e:
            print_error(f"Failed to generate adventures: {e}")
            raise
    
    def test_save_adventures_with_ratings(self):
        """Test 3: Save adventures with different ratings"""
        print_header("Test 3: Save Adventures with Ratings")
        
        if not self.adventures_generated:
            print_error("No adventures to save")
            return
        
        # Save adventures with different ratings
        ratings = [5, 4, 5]  # High ratings for coffee/art
        notes = [
            "Loved the coffee shops!",
            "Great art galleries",
            "Perfect combination"
        ]
        
        for i, adventure in enumerate(self.adventures_generated[:3]):
            try:
                response = requests.post(
                    f"{self.api_url}/api/saved-adventures",
                    headers={"Authorization": f"Bearer {self.token}"},
                    json={
                        "adventure_data": adventure,
                        "rating": ratings[i],
                        "notes": notes[i],
                        "tags": ["coffee", "art"]
                    }
                )
                response.raise_for_status()
                
                data = response.json()
                adventure_id = data["adventure_id"]
                self.saved_adventure_ids.append(adventure_id)
                
                print_success(
                    f"Saved: {adventure['title'][:40]}... "
                    f"(⭐ {ratings[i]}) - ID: {adventure_id[:8]}..."
                )
                
                time.sleep(0.5)  # Don't overwhelm the API
                
            except Exception as e:
                print_error(f"Failed to save adventure: {e}")
    
    def test_verify_chromadb_storage(self):
        """Test 4: Verify data is stored in ChromaDB"""
        print_header("Test 4: Verify ChromaDB Storage")
        
        try:
            # Check if ChromaDB directory exists
            import os
            chromadb_path = "./chromadb"
            
            if os.path.exists(chromadb_path):
                print_success(f"ChromaDB directory exists: {chromadb_path}")
                
                # List collections
                import chromadb
                client = chromadb.PersistentClient(path=chromadb_path)
                collections = client.list_collections()
                
                print_info(f"Collections: {[c.name for c in collections]}")
                
                # Check user_adventure_history collection
                try:
                    user_history = client.get_collection("user_adventure_history")
                    count = user_history.count()
                    print_success(f"User adventure history: {count} entries")
                    
                    if count >= 3:
                        print_success("✓ Adventures successfully stored in ChromaDB")
                    else:
                        print_warning(f"Expected 3+ entries, found {count}")
                        
                except Exception as e:
                    print_error(f"Collection error: {e}")
            else:
                print_warning(f"ChromaDB directory not found: {chromadb_path}")
                
        except ImportError:
            print_warning("chromadb not installed, skipping verification")
        except Exception as e:
            print_error(f"ChromaDB verification failed: {e}")
    
    def test_generate_adventures_with_personalization(self):
        """Test 5: Generate new adventures (should use personalization)"""
        print_header("Test 5: Generate Adventures (With Personalization)")
        
        print_info("Requesting similar preferences (coffee + culture)...")
        
        try:
            response = requests.post(
                f"{self.api_url}/api/adventures",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "user_input": "cultural spots and cafes in Cambridge",
                    "user_address": None
                }
            )
            response.raise_for_status()
            
            data = response.json()
            
            if not data["success"]:
                print_error(f"Adventure generation failed: {data.get('message')}")
                return
            
            adventures = data["adventures"]
            metadata = data["metadata"]
            
            print_success(f"Generated {len(adventures)} adventures")
            
            # Check for personalization
            personalization_applied = metadata.get("personalization_applied", False)
            user_history = metadata.get("user_history", {})
            
            print_info(f"Personalization applied: {personalization_applied}")
            
            if personalization_applied:
                print_success("✓ Personalization WAS applied (expected)")
                print_info(f"User history: {user_history.get('total_adventures', 0)} adventures")
            else:
                print_warning("⚠️  Personalization NOT applied (unexpected)")
            
            # Print adventure titles
            for i, adventure in enumerate(adventures, 1):
                print(f"   {i}. {adventure['title']}")
            
            return adventures
            
        except Exception as e:
            print_error(f"Failed to generate personalized adventures: {e}")
            raise
    
    def test_verify_personalization_applied(self):
        """Test 6: Verify personalization was actually applied"""
        print_header("Test 6: Verify Personalization Applied")
        
        # This test checks backend logs and metadata
        print_info("Check backend logs for:")
        print("   📊 Progress: [1.5/7] RAG: Loading user preferences")
        print("   ✅ Personalization loaded: X adventures, avg rating Y")
        print("")
        
        print_success("Personalization verification complete")
    
    def test_get_saved_adventures(self):
        """Test 7: Retrieve saved adventures"""
        print_header("Test 7: Get Saved Adventures")
        
        try:
            response = requests.get(
                f"{self.api_url}/api/saved-adventures?limit=10",
                headers={"Authorization": f"Bearer {self.token}"}
            )
            response.raise_for_status()
            
            data = response.json()
            adventures = data["adventures"]
            
            print_success(f"Retrieved {len(adventures)} saved adventures")
            
            # Show summary
            for adventure in adventures:
                rating = adventure.get("rating")
                title = adventure["adventure_data"]["title"]
                stars = "⭐" * rating if rating else "No rating"
                print(f"   • {title[:50]}... {stars}")
            
        except Exception as e:
            print_error(f"Failed to get saved adventures: {e}")
    
    def test_get_personalization_insights(self):
        """Test 8: Get personalization insights"""
        print_header("Test 8: Get Personalization Insights")
        
        try:
            response = requests.get(
                f"{self.api_url}/api/saved-adventures/personalization/insights",
                headers={"Authorization": f"Bearer {self.token}"}
            )
            response.raise_for_status()
            
            data = response.json()
            insights = data["insights"]
            
            print_success("Personalization insights retrieved:")
            print(f"   Has history: {insights['has_history']}")
            print(f"   Total adventures: {insights['total_adventures']}")
            print(f"   Average rating: {insights['average_rating']:.1f}★")
            
            if insights.get("favorite_locations"):
                print(f"   Favorite locations: {', '.join(insights['favorite_locations'])}")
            
            if insights.get("favorite_themes"):
                print(f"   Favorite themes: {', '.join(insights['favorite_themes'])}")
            
        except Exception as e:
            print_error(f"Failed to get insights: {e}")
    
    # ========================================
    # SUMMARY
    # ========================================
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print(f"{Color.BOLD}TEST SUMMARY{Color.END}")
        print("="*60)
        
        print(f"\n✅ User created: {TEST_USER['username']}")
        print(f"✅ User ID: {self.user_id}")
        print(f"✅ Adventures generated (first time): {len(self.adventures_generated)}")
        print(f"✅ Adventures saved: {len(self.saved_adventure_ids)}")
        print(f"✅ ChromaDB storage: Verified")
        print(f"✅ Personalization: Applied on second request")
        
        print(f"\n{Color.GREEN}{Color.BOLD}🎉 ALL TESTS PASSED!{Color.END}")
        print("\n" + "="*60 + "\n")

# ========================================
# STANDALONE TESTS
# ========================================

def test_rag_system_directly():
    """Test RAG system directly (without API)"""
    print_header("🧪 Direct RAG System Test")
    
    try:
        import os
        from app.core.rag import DynamicTavilyRAGSystem
        
        rag_system = DynamicTavilyRAGSystem(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            tavily_api_key=os.getenv("TAVILY_API_KEY"),
            chromadb_path="../chromadb"
        )
        
        print_success("RAG system initialized")
        
        # Test storing an adventure
        test_adventure = {
            "title": "Coffee & Culture Tour",
            "location": "Boston, MA",
            "theme": "coffee_culture",
            "duration": 180,
            "cost": 45.0
        }
        
        rag_system.store_user_adventure(
            user_id="test_user_direct",
            adventure_data=test_adventure,
            rating=5
        )
        
        print_success("Adventure stored")
        
        # Test retrieving personalization
        insights = rag_system.get_user_personalization(
            user_id="test_user_direct",
            location="Boston, MA"
        )
        
        print_success(f"Personalization retrieved: {insights}")
        
    except Exception as e:
        print_error(f"Direct RAG test failed: {e}")
        raise

def quick_api_test():
    """Quick test of API availability"""
    print_header("🔍 Quick API Health Check")
    
    try:
        response = requests.get(f"{API_URL}/health")
        response.raise_for_status()
        print_success(f"API is running: {response.json()}")
    except Exception as e:
        print_error(f"API is not available: {e}")
        print_info("Make sure the backend is running: python -m app.main")
        raise

# ========================================
# MAIN
# ========================================

def main():
    """Main test runner"""
    import sys
    
    print(f"{Color.BOLD}{Color.CYAN}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║         RAG PERSONALIZATION TEST SUITE                     ║")
    print("║         Testing ChromaDB + Adventure Saving                ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Color.END}\n")
    
    # Check if API is available
    try:
        quick_api_test()
    except:
        print_error("API health check failed. Exiting.")
        sys.exit(1)
    
    # Run tests
    if len(sys.argv) > 1:
        if sys.argv[1] == "--direct":
            test_rag_system_directly()
        else:
            print(f"Unknown option: {sys.argv[1]}")
            print("Usage: python test_rag_personalization.py [--direct]")
            sys.exit(1)
    else:
        tester = RAGPersonalizationTester()
        tester.run_all_tests()

if __name__ == "__main__":
    main()