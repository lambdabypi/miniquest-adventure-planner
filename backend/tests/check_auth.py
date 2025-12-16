#!/usr/bin/env python3
"""Quick script to check auth endpoint format"""

import requests
import json

API_URL = "http://localhost:8000"

print("🔍 Checking Auth Endpoint Format")
print("="*50)

# Test 1: Check what the endpoint expects
print("\n1. Testing registration endpoint...")

test_user = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!"
}

response = requests.post(
    f"{API_URL}/api/auth/register",
    json=test_user
)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 422:
    print("\n❌ Validation Error - Check required fields")
    try:
        error_detail = response.json()
        print(json.dumps(error_detail, indent=2))
    except:
        pass
elif response.status_code == 200:
    print("\n✅ Registration successful!")
    data = response.json()
    print(f"Token: {data.get('access_token', 'N/A')[:20]}...")
else:
    print(f"\n⚠️ Unexpected status: {response.status_code}")

# Test 2: Check OpenAPI docs
print("\n2. Checking API documentation...")
try:
    docs_response = requests.get(f"{API_URL}/docs")
    if docs_response.status_code == 200:
        print("✅ OpenAPI docs available at: http://localhost:8000/docs")
    
    # Try to get OpenAPI schema
    schema_response = requests.get(f"{API_URL}/openapi.json")
    if schema_response.status_code == 200:
        schema = schema_response.json()
        
        # Find auth endpoints
        paths = schema.get("paths", {})
        if "/api/auth/register" in paths:
            print("\n📋 /api/auth/register expects:")
            register_schema = paths["/api/auth/register"]["post"]
            request_body = register_schema.get("requestBody", {})
            print(json.dumps(request_body, indent=2))
except Exception as e:
    print(f"⚠️ Could not fetch docs: {e}")

print("\n" + "="*50)
print("Check http://localhost:8000/docs for full API documentation")