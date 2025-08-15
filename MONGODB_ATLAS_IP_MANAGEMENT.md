# MongoDB Atlas Automatic IP Management

This system automatically detects changes in your public IP address and updates your MongoDB Atlas IP whitelist accordingly, ensuring your development environment always has access to your database.

## 🚀 Features

- **Automatic IP Detection**: Checks your public IP address every 5 minutes
- **IP Change Detection**: Automatically detects when your IP address changes
- **Atlas Whitelist Updates**: Updates MongoDB Atlas IP whitelist via API
- **Development Only**: Only runs in development environments (not in production)
- **Caching**: Caches IP information to avoid unnecessary API calls
- **Error Handling**: Graceful fallback if IP management fails

## 📋 Prerequisites

1. **MongoDB Atlas Account**: You need a MongoDB Atlas account with a cluster
2. **API Key**: A Programmatic API Key with "Project Data Access Admin" role
3. **Project ID**: Your MongoDB Atlas Project ID

## 🔧 Setup

### Step 1: Get MongoDB Atlas Credentials

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign in to your account
3. Go to **Access Manager** → **API Keys**
4. Click **Create API Key**
5. Choose **Project Data Access Admin** role
6. Copy the **API Key** and **Project ID**

### Step 2: Run the Setup Script

```bash
node setup-atlas-api.js
```

This will:
- Prompt you for your API credentials
- Create a `.env` file with your configuration
- Validate the format of your credentials

### Step 3: Verify Setup

Check that your `.env` file contains:

```env
MONGODB_ATLAS_URI=your_connection_string_here
MONGODB_ATLAS_API_KEY=your_api_key_here
MONGODB_ATLAS_PROJECT_ID=your_project_id_here
NODE_ENV=development
RENDER=false
```

## 🔍 How It Works

### IP Detection
- Uses `api.ipify.org` to detect your current public IP
- Caches IP information in `.ip-cache.json`
- Checks every 5 minutes for changes

### IP Change Detection
- Compares current IP with cached IP
- Triggers update if IP has changed
- Logs all IP changes for debugging

### Atlas Whitelist Update
- Uses MongoDB Atlas REST API
- Adds new IP addresses to whitelist
- Skips if IP already exists
- Provides detailed error messages

### Automatic Monitoring
- Starts when you connect to MongoDB Atlas
- Only runs in development environments
- Stops automatically in production

## 📡 API Endpoints

### Get IP Status
```http
GET /api/status/ip
```

Response:
```json
{
  "success": true,
  "ip": "203.0.113.1",
  "lastUpdated": "2025-01-14T15:30:00.000Z",
  "monitoring": true,
  "cacheFile": "/path/to/.ip-cache.json",
  "message": "IP status retrieved successfully"
}
```

### Manual IP Check and Update
```http
POST /api/status/ip/check
```

Response:
```json
{
  "success": true,
  "message": "IP check and update completed successfully",
  "ip": "203.0.113.1",
  "lastUpdated": "2025-01-14T15:30:00.000Z"
}
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. API Key Not Found
```
⚠️ MongoDB Atlas API credentials not found. Set MONGODB_ATLAS_API_KEY and MONGODB_ATLAS_PROJECT_ID
```
**Solution**: Run `node setup-atlas-api.js` to configure credentials

#### 2. IP Detection Failed
```
⚠️ Could not check IP change: IP detection timeout
```
**Solution**: Check your internet connection and firewall settings

#### 3. Atlas API Error
```
❌ Error updating Atlas whitelist: HTTP 401: Unauthorized
```
**Solution**: Verify your API key and project ID are correct

#### 4. IP Already in Whitelist
```
✅ IP 203.0.113.1 already in whitelist
```
**Status**: This is normal - no action needed

### Debug Mode

Enable detailed logging by setting:
```env
DEBUG=atlas-ip-manager
```

### Manual IP Check

You can manually trigger an IP check:
```bash
curl -X POST http://localhost:3000/api/status/ip/check
```

## 🔒 Security Considerations

- **API Key Permissions**: Uses minimal required permissions (Project Data Access Admin)
- **IP Caching**: IP information is cached locally, not transmitted unnecessarily
- **Development Only**: System only runs in development environments
- **Error Handling**: Fails gracefully without exposing sensitive information

## 📁 File Structure

```
db/
├── atlas-ip-manager.js    # Main IP management module
├── production-config.js    # Production MongoDB configuration
├── atlas-connect.js       # Atlas connection module
├── local-connect.js       # Local MongoDB connection
└── db.js                  # Main database connection

setup-atlas-api.js         # Setup script for credentials
.env                       # Environment configuration (not in git)
.ip-cache.json            # IP cache file (not in git)
```

## 🚨 Important Notes

1. **Never commit `.env` file**: Contains sensitive API credentials
2. **IP cache is local**: Each machine maintains its own IP cache
3. **Production safety**: System is disabled in production environments
4. **Rate limiting**: Respects MongoDB Atlas API rate limits
5. **Backup whitelist**: Keep a backup of your IP whitelist

## 🔄 Updates and Maintenance

### Updating IP Cache
The system automatically updates the IP cache when:
- IP address changes
- Manual check is triggered
- System starts up

### Monitoring Logs
Watch for these log messages:
- `🔄 IP address changed: old → new`
- `✅ IP whitelist updated successfully`
- `⚠️ IP whitelist check failed, but continuing`

### Performance
- IP checks: Every 5 minutes
- API calls: Only when IP changes
- Cache updates: Real-time when needed

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your API credentials
3. Check MongoDB Atlas cluster status
4. Review server logs for detailed error messages
5. Ensure your IP is not blocked by firewalls

## 🎯 Best Practices

1. **Regular Monitoring**: Check logs periodically for IP changes
2. **Backup Credentials**: Keep a backup of your API credentials
3. **Test Connectivity**: Use the manual check endpoint to test
4. **Update Regularly**: Keep the system updated with latest changes
5. **Monitor Usage**: Check MongoDB Atlas API usage in your dashboard
