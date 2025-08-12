// db/db.js - MongoDB connection with automatic local/Atlas detection
const mongoose = require('mongoose');

// Import connection modules
const localConnect = require('./local-connect');
const atlasConnect = require('./atlas-connect');

// Connection configuration
const CONFIG = {
    // Priority order: Atlas first, then local
    atlas: {
        uri: process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI,
        enabled: true
    },
    local: {
        uri: process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/imrunning',
        enabled: true
    }
};

// Connection state
let connectionState = 'disconnected';
let connectionType = 'none';

// Main connection function
async function connectDB() {
    try {
        console.log('🔍 Detecting MongoDB connection...');
        
        // Try Atlas first if URI is provided
        if (CONFIG.atlas.enabled && CONFIG.atlas.uri) {
            try {
                console.log('🌐 Attempting MongoDB Atlas connection...');
                await atlasConnect.connectToAtlas();
                connectionType = 'atlas';
                connectionState = 'connected';
                console.log('✅ Connected to MongoDB Atlas');
                return;
            } catch (atlasError) {
                console.log('⚠️  Atlas connection failed, trying local...');
            }
        }
        
        // Try local MongoDB
        if (CONFIG.local.enabled) {
            try {
                console.log('🏠 Attempting local MongoDB connection...');
                await localConnect.autoConnect();
                connectionType = 'local';
                connectionState = 'connected';
                console.log('✅ Connected to local MongoDB');
                return;
            } catch (localError) {
                console.log('⚠️  Local connection failed');
            }
        }
        
        // If both failed, throw error
        throw new Error('Failed to connect to both MongoDB Atlas and local MongoDB');
        
    } catch (error) {
        connectionState = 'error';
        console.error('❌ All MongoDB connection attempts failed:', error.message);
        
        // Provide helpful troubleshooting information
        console.error('\n💡 Troubleshooting:');
        console.error('1. For Atlas: Set MONGODB_ATLAS_URI environment variable');
        console.error('2. For local: Ensure MongoDB is running (brew services start mongodb-community@7.0)');
        console.error('3. Check network connectivity and firewall settings');
        
        throw error;
    }
}

// Get connection health
function getConnectionHealth() {
    const baseHealth = {
        state: connectionState,
        type: connectionType,
        readyState: mongoose.connection.readyState
    };
    
    if (connectionType === 'atlas') {
        return { ...baseHealth, ...atlasConnect.getConnectionHealth() };
    } else if (connectionType === 'local') {
        return { ...baseHealth, ...localConnect.getConnectionHealth() };
    }
    
    return baseHealth;
}

// Test connection
async function testConnection() {
    try {
        if (connectionType === 'atlas') {
            return await atlasConnect.testConnection();
        } else if (connectionType === 'local') {
            return await localConnect.testConnection();
        } else {
            throw new Error('No active connection to test');
        }
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return false;
    }
}

// Force reconnect
async function reconnect() {
    try {
        console.log('🔄 Attempting to reconnect...');
        
        // Close existing connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        
        // Reset state
        connectionState = 'disconnected';
        connectionType = 'none';
        
        // Try to connect again
        await connectDB();
        
        console.log('✅ Reconnection successful');
        return true;
        
    } catch (error) {
        console.error('❌ Reconnection failed:', error);
        return false;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    connectionState = 'connected';
    console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    connectionState = 'error';
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    connectionState = 'disconnected';
    console.log('🔌 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
    connectionState = 'connected';
    console.log('🔄 Mongoose reconnected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔄 MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔄 MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
        process.exit(1);
    }
});

// Export functions
module.exports = { 
    connectDB, 
    mongoose,
    getConnectionHealth,
    testConnection,
    reconnect,
    connectionType,
    connectionState
};
