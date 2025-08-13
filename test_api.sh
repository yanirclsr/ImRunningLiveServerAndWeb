#!/bin/bash

# Quick API testing script for I'm Running Live API
# Usage: ./test_api.sh

BASE_URL="http://localhost:3000"

echo "🧪 Testing I'm Running Live API..."
echo "📍 Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
curl -s "$BASE_URL/api/health" | jq '.status' 2>/dev/null || echo "❌ Health check failed"
echo ""

# Test 2: API Test
echo "2️⃣ Testing API Test endpoint..."
curl -s "$BASE_URL/api/test" | jq '.message' 2>/dev/null || echo "❌ API test failed"
echo ""

# Test 3: Test Activity Data
echo "3️⃣ Testing Activity Data endpoint..."
curl -s -X POST "$BASE_URL/api/test/activity" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "activity_data",
    "runnerId": "usr_test123",
    "activityId": "act_test456",
    "location": {
      "lat": 52.5200,
      "lng": 13.4050,
      "accuracy": 10
    },
    "metrics": {
      "heartRate": 140,
      "speed": 2.5,
      "cadence": 160
    }
  }' | jq '.success' 2>/dev/null || echo "❌ Activity data test failed"
echo ""

# Test 4: Test Start Activity (Auto-Create)
echo "4️⃣ Testing Start Activity with Auto-Create..."
curl -s -X POST "$BASE_URL/api/runner/usr_a1b2c3d4/activity/act_e5f6g7h8/start" \
  -H "Content-Type: application/json" \
  -d '{
    "startLocation": {
      "lat": 52.5200,
      "lng": 13.4050,
      "accuracy": 10
    }
  }' | jq '.success' 2>/dev/null || echo "❌ Start activity test failed"
echo ""

echo "✅ API testing completed!"
echo ""
echo "📱 To test your iOS app:"
echo "   - Update server URL to: http://10.60.3.174:3000"
echo "   - Click 'Start Activity' in your app"
echo "   - Check server logs for incoming requests"
