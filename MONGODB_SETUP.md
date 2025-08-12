# 🗄️ MongoDB Setup Guide

This guide covers setting up MongoDB for both local development and cloud deployment with MongoDB Atlas.

## 🏠 Local MongoDB Setup (macOS with Homebrew)

### 1. Install MongoDB Community Edition

```bash
# Install MongoDB Community 7.0
brew tap mongodb/brew
brew install mongodb-community@7.0

# Verify installation
brew list mongodb-community@7.0
```

### 2. Start MongoDB Service

```bash
# Start MongoDB as a service
brew services start mongodb-community@7.0

# Check service status
brew services list | grep mongodb

# View logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

### 3. Test Local Connection

```bash
# Test connection
npm run db:local

# Or manually test
mongosh mongodb://localhost:27017/imrunning
```

### 4. Manual MongoDB Start (Alternative)

```bash
# Start MongoDB manually
mongod --config /usr/local/etc/mongod.conf

# Or with custom data directory
mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log
```

## 🌐 MongoDB Atlas Setup (Cloud)

### 1. Create Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project

### 2. Create Cluster

1. **Build a Database**
   - Choose "FREE" tier (M0)
   - Select cloud provider (AWS, Google Cloud, or Azure)
   - Choose region closest to you
   - Click "Create"

2. **Security Setup**
   - Create database user with username/password
   - Add your IP address to IP Access List
   - For development: Add `0.0.0.0/0` (allows all IPs)

3. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

### 3. Configure Environment Variables

```bash
# Create .env file
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/imrunning?retryWrites=true&w=majority
MONGODB_ATLAS_URI=mongodb+srv://yanir:yourpassword@cluster0.abc123.mongodb.net/imrunning?retryWrites=true&w=majority
```

### 4. Test Atlas Connection

```bash
# Test Atlas connection
npm run db:atlas

# Or test with environment variable
MONGODB_ATLAS_URI="your-connection-string" node db/atlas-connect.js
```

## 🚀 Database Initialization

### 1. Initialize Database (Creates Collections & Sample Data)

```bash
# Initialize database with collections and sample data
npm run db:init
```

This will:
- Create all required collections
- Set up proper indexes
- Seed Berlin Marathon 2025 event
- Create sample user and activity
- Generate sample cheer messages

### 2. Check Database Status

```bash
# Check connection and collection status
npm run db:status
```

### 3. View Sample Data

```bash
# Connect to MongoDB shell
mongosh mongodb://localhost:27017/imrunning

# Or for Atlas
mongosh "mongodb+srv://username:password@cluster.mongodb.net/imrunning"

# View collections
show collections

# View sample data
db.events.find()
db.users.find()
db.activities.find()
```

## 🔧 Environment Configuration

### Local Development (.env)

```bash
# Local MongoDB
MONGODB_LOCAL_URI=mongodb://localhost:27017/imrunning

# Or Atlas (if preferred)
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/imrunning?retryWrites=true&w=majority

# Server configuration
PORT=3000
NODE_ENV=development
```

### Production (.env)

```bash
# MongoDB Atlas (recommended for production)
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/imrunning?retryWrites=true&w=majority

# Server configuration
PORT=10000
NODE_ENV=production
```

## 📊 Database Collections

The system automatically creates these collections:

### 1. `users` Collection
```javascript
{
  "_id": "usr_8pG7...",           // usr_ + 8 chars
  "email": "yanir@...",
  "displayName": "Yanir",
  "createdAt": ISODate("2025-08-11T14:00:00Z"),
  "auth": { 
    "provider": "apple", 
    "sub": "apple-oidc-sub" 
  },
  "preferences": { 
    "voice": "en-GB", 
    "cheersVolume": 0.8 
  }
}
```

### 2. `events` Collection
```javascript
{
  "_id": "evt_7XcQ...",           // evt_ + 8 chars
  "name": "Berlin Marathon 2025",
  "date": ISODate("2025-09-21T07:59:00Z"),
  "location": {
    "city": "Berlin",
    "country": "Germany",
    "coordinates": { "type": "Point", "coordinates": [13.3777, 52.5163] }
  },
  "type": "marathon",
  "distance": 42195,               // meters
  "route": { "checkpoints": [...] },
  "settings": { "maxParticipants": 50000, "trackingEnabled": true }
}
```

### 3. `activities` Collection
```javascript
{
  "_id": "act_7XcQ...",           // act_ + 8 chars
  "runnerId": "usr_8pG7...",
  "eventId": "evt_7XcQ...",
  "status": "planned",             // planned | active | finished | cancelled
  "startedAt": ISODate("2025-09-21T07:59:30Z"),
  "endedAt": null,
  "share": {
    "public": true,
    "token": "sh_7LrZ...",        // sh_ + 16 chars
    "expiresAt": null
  },
  "settings": {
    "pingIntervalSec": 10,
    "cheersEnabled": true,
    "ttsLang": "en-US"
  },
  "stats": {
    "lastPingAt": ISODate("2025-09-21T08:31:20Z"),
    "distanceMeters": 11650,
    "avgPaceSecPerKm": 305
  }
}
```

### 4. `locationPings` Collection
```javascript
{
  "meta": { 
    "activityId": "act_7XcQ...", 
    "runnerId": "usr_8pG7..." 
  },
  "ts": ISODate("2025-09-21T08:31:20Z"),
  "loc": { 
    "type": "Point", 
    "coordinates": [13.3777, 52.5163]  // [lng, lat]
  },
  "speedMps": 3.3,                 // meters per second
  "elevM": 34,                     // elevation in meters
  "battery": 0.76,
  "accuracy": 10,                   // GPS accuracy in meters
  "heartRate": 165,
  "cadence": 180                    // steps per minute
}
```

### 5. `cheers` Collection
```javascript
{
  "activityId": "act_7XcQ...",
  "from": { 
    "name": "Dad", 
    "ip": "1.2.3.4" 
  },
  "message": "Go Yanir! 🥳",
  "createdAt": ISODate("2025-09-21T08:31:25Z"),
  "deliveredAt": null,             // when fetched by phone
  "spokenAt": null,                // after TTS on device
  "mod": { 
    "flagged": false, 
    "reason": null 
  }
}
```

## 🗂️ Database Indexes

The system automatically creates these indexes for optimal performance:

### Geospatial Indexes
- `events.location.coordinates`: 2dsphere
- `locationPings.loc`: 2dsphere

### Compound Indexes
- `locationPings.meta.activityId + ts`: For activity timeline queries
- `locationPings.meta.runnerId + ts`: For runner timeline queries
- `cheers.activityId + createdAt`: For activity message queries
- `cheers.meta.runnerId + deliveredAt`: For undelivered message queries

### Single Field Indexes
- All `_id` fields (automatic)
- `users.email`: For user lookups
- `activities.share.token`: For public tracking URLs
- `events.date`: For event date queries

## 🧪 Testing Database

### 1. Test Local Connection
```bash
npm run db:local
```

### 2. Test Atlas Connection
```bash
npm run db:atlas
```

### 3. Test Full System
```bash
# Start server
npm run dev

# In another terminal, test API
curl http://localhost:3000/api/health
```

### 4. Manual Database Testing
```bash
# Connect to MongoDB shell
mongosh

# Switch to database
use imrunning

# View collections
show collections

# Query sample data
db.events.find({ name: "Berlin Marathon 2025" })
db.users.find({ displayName: "Yanir" })
```

## 🚨 Troubleshooting

### Local MongoDB Issues

**Service won't start:**
```bash
# Check service status
brew services list | grep mongodb

# View logs
tail -f /usr/local/var/log/mongodb/mongo.log

# Check data directory permissions
ls -la /usr/local/var/mongodb

# Reset service
brew services stop mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Connection refused:**
```bash
# Check if MongoDB is running
pgrep mongod

# Start manually
mongod --config /usr/local/etc/mongod.conf
```

### Atlas Connection Issues

**Authentication failed:**
- Check username/password in connection string
- Verify database user exists in Atlas
- Check if user has correct permissions

**IP not whitelisted:**
- Add your current IP to Atlas IP Access List
- For development: Add `0.0.0.0/0` (allows all IPs)

**Network issues:**
- Check firewall settings
- Verify cluster is accessible from your location
- Try different network (mobile hotspot, etc.)

## 🔄 Database Migration

### From Old Schema to New Schema

If you have existing data with the old schema:

```bash
# 1. Backup existing data
mongodump --db imrunning --out backup/

# 2. Initialize new schema
npm run db:init

# 3. Migrate data (custom script needed)
node scripts/migrate-old-data.js
```

## 📈 Performance Optimization

### For Production Use

1. **Connection Pooling**: Already configured for optimal performance
2. **Index Optimization**: All necessary indexes are created automatically
3. **Read Preferences**: Configured for primary reads with fallback
4. **Write Concerns**: Optimized for durability vs performance balance

### Monitoring

```bash
# Check connection status
npm run db:status

# Monitor MongoDB performance
mongosh --eval "db.serverStatus()"
```

## 🎯 Next Steps

1. **Choose your setup**: Local for development, Atlas for production
2. **Initialize database**: `npm run db:init`
3. **Test connection**: `npm run db:local` or `npm run db:atlas`
4. **Start development**: `npm run dev`
5. **Create your profile**: Visit `/setup.html`

Your database will be ready with:
- ✅ All required collections
- ✅ Proper indexes for performance
- ✅ Berlin Marathon 2025 event data
- ✅ Sample user and activity
- ✅ Sample cheer messages

Happy coding! 🏃‍♂️
