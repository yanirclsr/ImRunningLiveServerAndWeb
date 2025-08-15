// db/production-config.js - Production MongoDB configuration
const mongoose = require('mongoose');

// Production MongoDB Atlas configuration
const PRODUCTION_CONFIG = {
    // Connection options optimized for production
    options: {
        // Connection pool settings
        maxPoolSize: 20, // Increased for production load
        minPoolSize: 5,
        maxIdleTimeMS: 60000, // 1 minute
        
        // Timeout settings
        serverSelectionTimeoutMS: 30000, // 30 seconds
        socketTimeoutMS: 60000, // 1 minute
        heartbeatFrequencyMS: 10000,
        
        // SSL/TLS settings for production
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
        
        // Write concern and retry settings
        w: 'majority',
        wtimeoutMS: 15000,
        retryWrites: true,
        retryReads: true,
        
        // Replica set settings
        readPreference: 'primaryPreferred',
        
        // Connection monitoring
        monitorCommands: false, // Disable in production for performance
    },
    
    // Health check settings
    healthCheck: {
        interval: 30000, // 30 seconds
        timeout: 5000,   // 5 seconds
        maxRetries: 3
    }
};

// Production connection function
async function connectToProductionDB(uri) {
    try {
        if (!uri) {
            throw new Error('MONGODB_ATLAS_URI environment variable is required for production');
        }
        
        console.log('🚀 Connecting to production MongoDB Atlas...');
        
        // Parse connection string
        const dbName = uri.split('/').pop().split('?')[0];
        const clusterMatch = uri.match(/@([^.]+)\.mongodb\.net/);
        
        console.log(`  📊 Database: ${dbName}`);
        if (clusterMatch) {
            console.log(`  🗂️  Cluster: ${clusterMatch[1]}`);
        }
        console.log(`  🌍 Environment: Production`);
        
        // Connect with production settings
        await mongoose.connect(uri, PRODUCTION_CONFIG.options);
        
        // Set max listeners to prevent memory leaks
        mongoose.connection.setMaxListeners(5);
        
        console.log('✅ Successfully connected to production MongoDB Atlas');
        
        // Log production connection details
        const db = mongoose.connection.db;
        try {
            const adminDb = db.admin();
            const serverStatus = await adminDb.serverStatus();
            console.log(`  🖥️  MongoDB Version: ${serverStatus.version}`);
            console.log(`  🔌 Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
            console.log(`  📊 Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
        } catch (error) {
            console.log('  ℹ️  Server status unavailable (may not have admin privileges)');
        }
        
        return mongoose.connection;
        
    } catch (error) {
        console.error('❌ Production MongoDB connection failed:', error.message);
        
        // Provide production-specific troubleshooting
        if (error.message.includes('IP that isn\'t whitelisted')) {
            console.error('💡 IP whitelist issue: Add Render\'s IP range to MongoDB Atlas whitelist');
            console.error('   Visit: https://www.mongodb.com/docs/atlas/security-whitelist/');
        } else if (error.message.includes('SSL routines') || error.message.includes('tlsv1 alert')) {
            console.error('💡 SSL/TLS issue: Check MongoDB Atlas cluster configuration');
            console.error('   Ensure TLS 1.2+ is enabled and certificates are valid');
        } else if (error.message.includes('Authentication failed')) {
            console.error('💡 Authentication issue: Check username/password in connection string');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('💡 Network issue: Check cluster hostname and network connectivity');
        }
        
        throw error;
    }
}

// Production health check
async function productionHealthCheck() {
    try {
        const db = mongoose.connection.db;
        const adminDb = db.admin();
        
        // Ping the database
        await adminDb.ping();
        
        // Check server status
        const serverStatus = await adminDb.serverStatus();
        
        return {
            status: 'healthy',
            uptime: serverStatus.uptime,
            connections: serverStatus.connections,
            version: serverStatus.version,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Graceful shutdown for production
async function gracefulShutdown() {
    try {
        console.log('🔄 Gracefully closing production MongoDB connection...');
        await mongoose.connection.close();
        console.log('✅ Production MongoDB connection closed gracefully');
    } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
    }
}

// Handle process signals for production
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
    connectToProductionDB,
    productionHealthCheck,
    gracefulShutdown,
    PRODUCTION_CONFIG
};
