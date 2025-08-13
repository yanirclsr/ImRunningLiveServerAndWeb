# 🏃‍♂️ I'm Running Live API Testing Guide

This guide explains how to test the I'm Running Live API using the provided Postman collection.

## 📥 **Import the Postman Collection**

1. **Download** the `postman_collection.json` file
2. **Open Postman**
3. **Click** "Import" button
4. **Drag & Drop** the JSON file or click "Upload Files"
5. **Import** the collection

## 🌐 **Environment Setup**

The collection includes environment variables that will be automatically set:

- **`base_url`**: `http://localhost:3000` (your local server)
- **`runner_id`**: Auto-generated test runner ID
- **`activity_id`**: Auto-generated test activity ID
- **`user_id`**: Test user ID
- **`message_id`**: Test message ID

## 🚀 **Quick Start Testing**

### 1. **Health Check** ✅
Start with the "Health Check" endpoint to verify your server is running:
```
GET {{base_url}}/api/health
```

### 2. **Test Activity Data** 🧪
Use the "Test Activity Data" endpoint to simulate your iOS app sending data:
```
POST {{base_url}}/api/test/activity
```

### 3. **Test Start Activity (Auto-Create)** 🆕
Test the new auto-creation functionality:
```
POST {{base_url}}/api/runner/usr_a1b2c3d4/activity/act_e5f6g7h8/start
```

**This endpoint automatically:**
- ✅ **Creates a new user** if the runner ID doesn't exist
- ✅ **Creates a new activity** if the activity ID doesn't exist  
- ✅ **Creates a Berlin Marathon event** if no events exist
- ✅ **Returns comprehensive data** including user, event, and activity details

**Sample Request Body:**
```json
{
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
}
```

## 📱 **iOS App Integration Testing**

### **Test Your iOS App Connection**

1. **Start your server** using the shell script:
   ```bash
   npm run dev:all
   ```

2. **Update your iOS app** to use the correct server URL:
   ```swift
   // Change from localhost to your Mac's IP
   let serverURL = "http://10.60.3.174:3000"  // Your Mac's IP
   ```

3. **Test the connection** using the "Test Activity Data" endpoint in Postman

4. **Verify the response** shows your data was received

## 🔧 **Available Endpoints**

### **Health & Status**
- `GET /api/health` - Server health check
- `GET /api/test` - Basic API test
- `GET /` - Homepage

### **Runner Management**
- `POST /api/runners` - Create new runner

### **Activity Management**
- `POST /api/runner/:runnerId/activity/:activityId/start` - Start activity (auto-creates user/activity if missing)
- `POST /api/runner/:runnerId/activity/:activityId/location` - Update location
- `GET /api/runner/:runnerId/activity/:activityId` - Get activity status

### **Messaging & Cheers**
- `POST /api/runner/:runnerId/activity/:activityId/messages` - Send message
- `GET /api/runner/:runnerId/activity/:activityId/messages` - Get messages
- `POST /api/runner/:runnerId/activity/:activityId/messages/:messageId/announce` - Announce message
- `GET /api/runner/:runnerId/activity/:activityId/messages/unannounced` - Get unannounced messages

### **Public Views**
- `GET /runner/:runnerId/:activityId` - Runner activity view
- `GET /:userId/:activityId` - User activity view

### **Test Endpoints**
- `POST /api/test/activity` - Test activity data (NEW!)

## 🧪 **Testing Workflow**

### **Step 1: Verify Server Health**
```bash
# Test the health endpoint
curl http://localhost:3000/api/health
```

### **Step 2: Test Activity Data Endpoint**
```bash
# Test sending activity data
curl -X POST http://localhost:3000/api/test/activity \
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
  }'
```

### **Step 3: Test iOS App Integration**
1. **Update your iOS app** with the correct server URL
2. **Click "Start Activity"** in your app
3. **Check the server logs** for incoming requests
4. **Verify the response** in your iOS app

## 🔍 **Debugging Tips**

### **Server Not Responding?**
- Check if the server is running: `lsof -i :3000`
- Verify MongoDB is running: `brew services list | grep mongodb`
- Check server logs for errors

### **iOS App Can't Connect?**
- **Use your Mac's IP address** instead of `localhost`
- **Check your Mac's IP**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Verify the server is accessible** from the simulator

### **Port Conflicts?**
- The shell script now automatically cleans up port 3000
- Run `./run_imrunning_live_app.sh` to start fresh

## 📊 **Expected Responses**

### **Health Check Response:**
```json
{
  "status": "OK",
  "uptime": 123.45,
  "service": "I'm Running Live API",
  "version": "1.0.0",
  "timestamp": "2025-01-13T10:30:00.000Z",
  "database": {
    "status": "connected",
    "type": "local",
    "readyState": 1,
    "host": "127.0.0.1",
    "name": "imrunning"
  }
}
```

### **Test Activity Response:**
```json
{
  "success": true,
  "message": "Test activity data received successfully",
  "timestamp": "2025-01-13T10:30:00.000Z",
  "data": {
    "testType": "activity_data",
    "runnerId": "usr_test123",
    "activityId": "act_test456",
    "location": {
      "lat": 52.52,
      "lng": 13.405,
      "accuracy": 10
    },
    "metrics": {
      "heartRate": 140,
      "speed": 2.5,
      "cadence": 160
    },
    "processed": true
  },
  "serverInfo": {
    "status": "running",
    "port": 3000,
    "uptime": 123.45
  }
}
```

### **Start Activity Response (Auto-Create):**
```json
{
  "success": true,
  "message": "Activity started successfully",
  "data": {
    "user": {
      "id": "usr_auto123",
      "displayName": "Runner 123",
      "email": "usr_auto123@example.com",
      "preferences": {
        "voice": "en-GB",
        "cheersVolume": 0.8
      }
    },
    "event": {
      "id": "evt_2a9c0305",
      "name": "Berlin Marathon 2025",
      "date": "2025-09-21T07:59:00.000Z",
      "location": {
        "coordinates": {
          "type": "Point",
          "coordinates": [13.3777, 52.5163]
        },
        "city": "Berlin",
        "country": "Germany"
      },
      "type": "marathon",
      "distance": 42195
    },
    "activity": {
      "id": "act_auto456",
      "status": "active",
      "startedAt": "2025-08-13T14:44:57.650Z",
      "share": {
        "public": true,
        "token": "sh_0efd1b0291a33bf3",
        "expiresAt": null
      },
      "settings": {
        "pingIntervalSec": 10,
        "cheersEnabled": true,
        "ttsLang": "en-US"
      }
    },
    "startLocation": {
      "lat": 52.52,
      "lng": 13.405,
      "accuracy": 10
    }
  },
  "startTime": "2025-08-13T14:44:57.650Z"
}
```

## 🎯 **Next Steps**

1. **Import the Postman collection**
2. **Test the health endpoint**
3. **Test the activity data endpoint**
4. **Update your iOS app** with the correct server URL
5. **Test the full integration**

Happy testing! 🚀
