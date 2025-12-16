#!/usr/bin/env python3
"""
Quick test - manually step through each part
"""

import requests
import json
import time

API_URL = "http://localhost:8000"

def print_step(num, title):
    print(f"\n{'='*60}")
    print(f"Step {num}: {title}")
    print('='*60)

def test_api():
    """Quick test flow"""
    
    print("\n🧪 Quick RAG Test")
    print("="*60)
    
    # Step 1: Health check
    print_step(1, "Health Check")
    response = requests.get(f"{API_URL}/health")
    print(f"✅ API Status: {response.json()['status']}")
    
    # Step 2: Register (try different formats)
    print_step(2, "Register User")
    
    # Correct format with full_name
    user_data = {
        "username": "testuser",
        "email": f"test_{int(time.time())}@example.com",
        "password": "TestPassword123!",
        "full_name": "Test User"  # ✨ Required field
    }
    
    print("Registering user...")
    response = requests.post(
        f"{API_URL}/api/auth/register",
        json=user_data
    )
    
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.status_code}")
        print(response.text)
        return
    
    print(f"✅ User registered!")
    data = response.json()
    token = data.get("access_token")
    print(f"Token: {token[:20]}...")
    
    # Step 3: Generate adventures (first time)
    print_step(3, "Generate Adventures (First Time)")
    
    response = requests.post(
        f"{API_URL}/api/adventures",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "user_input": "coffee shops and art galleries in Boston",
            "user_address": None
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Adventure generation failed: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    if not data.get("success"):
        print(f"❌ Generation failed: {data.get('message')}")
        return
    
    adventures = data["adventures"]
    metadata = data["metadata"]
    
    print(f"✅ Generated {len(adventures)} adventures")
    print(f"   Personalization applied: {metadata.get('personalization_applied', False)}")
    
    if metadata.get('personalization_applied'):
        print("   ⚠️ Unexpected - personalization on first request")
    else:
        print("   ✅ Expected - no personalization yet")
    
    # Step 4: Save an adventure
    print_step(4, "Save Adventure with Rating")
    
    if adventures:
        adventure = adventures[0]
        response = requests.post(
            f"{API_URL}/api/saved-adventures",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "adventure_data": adventure,
                "rating": 5,
                "notes": "Test save",
                "tags": ["test"]
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Save failed: {response.status_code}")
            print(response.text)
            return
        
        data = response.json()
        print(f"✅ Adventure saved!")
        print(f"   ID: {data.get('adventure_id', 'N/A')}")
    
    # Step 5: Generate again (should have personalization)
    print_step(5, "Generate Adventures (Second Time)")
    
    time.sleep(2)  # Give ChromaDB time to index
    
    response = requests.post(
        f"{API_URL}/api/adventures",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "user_input": "cafes and cultural spots in Cambridge",
            "user_address": None
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Adventure generation failed: {response.status_code}")
        return
    
    data = response.json()
    if not data.get("success"):
        print(f"❌ Generation failed: {data.get('message')}")
        return
    
    adventures = data["adventures"]
    metadata = data["metadata"]
    
    print(f"✅ Generated {len(adventures)} adventures")
    print(f"   Personalization applied: {metadata.get('personalization_applied', False)}")
    
    if metadata.get('personalization_applied'):
        print("   ✅ SUCCESS - Personalization working!")
        user_history = metadata.get('user_history', {})
        print(f"   User history: {user_history.get('total_adventures', 0)} adventures")
    else:
        print("   ⚠️ WARNING - Personalization not applied")
        print("   Check backend logs for RAG initialization")
    
    # Step 6: Get insights
    print_step(6, "Get Personalization Insights")
    
    response = requests.get(
        f"{API_URL}/api/saved-adventures/personalization/insights",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        insights = data.get("insights", {})
        print(f"✅ Insights retrieved")
        print(f"   Has history: {insights.get('has_history', False)}")
        print(f"   Total adventures: {insights.get('total_adventures', 0)}")
        print(f"   Average rating: {insights.get('average_rating', 0):.1f}")
    else:
        print(f"⚠️ Insights failed: {response.status_code}")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    try:
        test_api()
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()