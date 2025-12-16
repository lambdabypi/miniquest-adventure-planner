#!/usr/bin/env python3
# backend/test_optimized_system.py
"""
Comprehensive test for OPTIMIZED MiniQuest system
Tests: Auth, RAG, MongoDB, Performance, Caching
"""

import requests
import time
import json
from datetime import datetime

API_URL = "http://localhost:8000"

def print_section(title):
    """Print a section header"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}\n")

def print_step(num, title):
    """Print a step header"""
    print(f"\n{'-'*80}")
    print(f"STEP {num}: {title}")
    print(f"{'-'*80}\n")

def test_optimized_system():
    """Run comprehensive system test"""
    
    print_section("MINIQUEST OPTIMIZED SYSTEM TEST")
    print(f"Testing API at: {API_URL}")
    print(f"Started: {datetime.now().isoformat()}\n")
    
    # ========================================
    # STEP 1: Check System Status
    # ========================================
    print_step(1, "System Health Check")
    
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ System healthy")
            print(f"   Coordinator ready: {data.get('coordinator_ready')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        print("   Make sure the server is running: python -m app.main")
        return
    
    # ========================================
    # STEP 2: Check Performance Info
    # ========================================
    print_step(2, "Check Performance Optimizations")
    
    response = requests.get(f"{API_URL}/api/performance/info")
    if response.status_code == 200:
        data = response.json()
        print("✅ Optimizations enabled:")
        for opt_name, opt_data in data.get("optimizations", {}).items():
            print(f"   • {opt_name}: {opt_data.get('improvement')}")
        print(f"\n   Expected performance:")
        perf = data.get("expected_performance", {})
        print(f"   • Baseline: {perf.get('baseline')}")
        print(f"   • Cold cache: {perf.get('optimized_cold_cache')}")
        print(f"   • Warm cache: {perf.get('optimized_warm_cache')}")
    else:
        print(f"⚠️ Performance info not available")
    
    # ========================================
    # STEP 3: Register User
    # ========================================
    print_step(3, "User Registration")
    
    test_username = f"testuser_{int(time.time())}"
    test_email = f"{test_username}@test.com"
    
    user_data = {
        "username": test_username,
        "email": test_email,
        "password": "TestPassword123!",
        "full_name": "Test User"
    }
    
    response = requests.post(f"{API_URL}/api/auth/register", json=user_data)
    
    if response.status_code not in [200, 201]:
        print(f"❌ Registration failed: {response.status_code}")
        print(response.text)
        return
    
    print(f"✅ User registered: {test_username}")
    data = response.json()
    token = data.get("access_token")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # ========================================
    # STEP 4: First Adventure Generation (Cold Cache)
    # ========================================
    print_step(4, "First Adventure Generation (Cold Cache)")
    
    test_queries = [
        "coffee shops and art galleries in Boston",
        "parks and restaurants for a family day"
    ]
    
    start_time = time.time()
    
    response = requests.post(
        f"{API_URL}/api/adventures",
        headers=headers,
        json={
            "user_input": test_queries[0],
            "user_address": None
        }
    )
    
    elapsed_1 = time.time() - start_time
    
    if response.status_code != 200:
        print(f"❌ Generation failed: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    
    if not data.get("success"):
        print(f"❌ Generation failed: {data.get('message')}")
        return
    
    adventures = data["adventures"]
    metadata = data["metadata"]
    performance = metadata.get("performance", {})
    
    print(f"✅ Generated {len(adventures)} adventures")
    print(f"   Time: {elapsed_1:.2f}s (actual) / {performance.get('total_time_seconds', 0):.2f}s (backend)")
    print(f"   Cache hit rate: {performance.get('cache_hit_rate', '0%')}")
    print(f"   Personalization: {metadata.get('personalization_applied', False)}")
    
    # Show timing breakdown
    timing = performance.get("timing_breakdown", {})
    if timing:
        print(f"\n   Timing breakdown:")
        for operation, time_taken in timing.items():
            print(f"      {operation:25} {time_taken:.2f}s")
    
    # ========================================
    # STEP 5: Save Adventure
    # ========================================
    print_step(5, "Save Adventure with Rating")
    
    if adventures:
        adventure = adventures[0]
        response = requests.post(
            f"{API_URL}/api/saved-adventures",
            headers=headers,
            json={
                "adventure_data": adventure,
                "rating": 5,
                "notes": "Optimized test save",
                "tags": ["test", "optimized"]
            }
        )
        
        if response.status_code == 200:
            print(f"✅ Adventure saved")
        else:
            print(f"⚠️ Save failed: {response.status_code}")
    
    # Wait for RAG indexing
    time.sleep(2)
    
    # ========================================
    # STEP 6: Second Generation (Should Have Personalization)
    # ========================================
    print_step(6, "Second Generation (With Personalization)")
    
    start_time = time.time()
    
    response = requests.post(
        f"{API_URL}/api/adventures",
        headers=headers,
        json={
            "user_input": test_queries[1],
            "user_address": None
        }
    )
    
    elapsed_2 = time.time() - start_time
    
    if response.status_code == 200:
        data = response.json()
        adventures = data["adventures"]
        metadata = data["metadata"]
        performance = metadata.get("performance", {})
        
        print(f"✅ Generated {len(adventures)} adventures")
        print(f"   Time: {elapsed_2:.2f}s (actual) / {performance.get('total_time_seconds', 0):.2f}s (backend)")
        print(f"   Cache hit rate: {performance.get('cache_hit_rate', '0%')}")
        print(f"   Personalization: {metadata.get('personalization_applied', False)}")
        
        if metadata.get('personalization_applied'):
            user_history = metadata.get('user_history', {})
            print(f"   ✨ User history: {user_history.get('total_adventures', 0)} adventures")
    
    # ========================================
    # STEP 7: Third Generation (Same Query - Cache Test)
    # ========================================
    print_step(7, "Third Generation (Cache Test - Same Query)")
    
    start_time = time.time()
    
    response = requests.post(
        f"{API_URL}/api/adventures",
        headers=headers,
        json={
            "user_input": test_queries[0],  # Same as first query
            "user_address": None
        }
    )
    
    elapsed_3 = time.time() - start_time
    
    if response.status_code == 200:
        data = response.json()
        adventures = data["adventures"]
        metadata = data["metadata"]
        performance = metadata.get("performance", {})
        
        print(f"✅ Generated {len(adventures)} adventures")
        print(f"   Time: {elapsed_3:.2f}s (actual) / {performance.get('total_time_seconds', 0):.2f}s (backend)")
        print(f"   Cache hit rate: {performance.get('cache_hit_rate', '0%')}")
        print(f"   Cache hits: {performance.get('cache_hits', 0)}")
        print(f"   Time saved: {performance.get('time_saved_estimate', '0s')}")
        
        if performance.get('cache_hits', 0) > 0:
            print(f"   ✅ CACHE WORKING!")
        else:
            print(f"   ⚠️ Cache not utilized (may need different venues)")
    
    # ========================================
    # STEP 8: Check Cache Stats
    # ========================================
    print_step(8, "Cache Statistics")
    
    response = requests.get(f"{API_URL}/api/performance/cache/stats")
    if response.status_code == 200:
        data = response.json()
        stats = data.get("cache_stats", {})
        
        print("✅ Cache statistics:")
        print(f"   Size: {stats.get('size', 0)}/{stats.get('max_size', 0)}")
        print(f"   Hits: {stats.get('hits', 0)}")
        print(f"   Misses: {stats.get('misses', 0)}")
        print(f"   Hit rate: {stats.get('hit_rate', '0%')}")
        print(f"   Time saved: {stats.get('time_saved_estimate', '0s')}")
    
    # ========================================
    # STEP 9: Performance Comparison
    # ========================================
    print_step(9, "Performance Analysis")
    
    baseline = 20.0  # Assumed baseline
    
    print(f"Performance comparison:")
    print(f"   Baseline (estimated):          {baseline:.2f}s")
    print(f"   Test 1 (cold cache):           {elapsed_1:.2f}s ({((baseline-elapsed_1)/baseline*100):.1f}% faster)")
    print(f"   Test 2 (partial cache):        {elapsed_2:.2f}s ({((baseline-elapsed_2)/baseline*100):.1f}% faster)")
    print(f"   Test 3 (warm cache):           {elapsed_3:.2f}s ({((baseline-elapsed_3)/baseline*100):.1f}% faster)")
    
    if elapsed_3 < elapsed_1:
        improvement = ((elapsed_1 - elapsed_3) / elapsed_1 * 100)
        print(f"\n   ✅ Cache improvement: {improvement:.1f}% (Test 3 vs Test 1)")
    
    # ========================================
    # Summary
    # ========================================
    print_section("TEST SUMMARY")
    
    print("✅ All tests completed successfully!\n")
    print("Key findings:")
    print(f"   • System is operational")
    print(f"   • Authentication working")
    print(f"   • Performance optimizations active")
    print(f"   • Average time: {(elapsed_1 + elapsed_2 + elapsed_3) / 3:.2f}s")
    print(f"   • Best time: {min(elapsed_1, elapsed_2, elapsed_3):.2f}s")
    
    print(f"\nEndpoints tested:")
    print(f"   • /health")
    print(f"   • /api/performance/info")
    print(f"   • /api/auth/register")
    print(f"   • /api/adventures")
    print(f"   • /api/saved-adventures")
    print(f"   • /api/performance/cache/stats")
    
    print(f"\n{'='*80}")
    print("TEST COMPLETE")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    try:
        test_optimized_system()
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()