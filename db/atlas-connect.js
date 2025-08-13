// db/atlas-connect.js - MongoDB Atlas connection for cloud deployment
const mongoose = require('mongoose');

// MongoDB Atlas connection configuration
const ATLAS_CONFIG = {
    // Connection string format: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
    uri: process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI,
    options: {
        // Modern MongoDB driver options
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        // SSL/TLS options for Atlas
        tls: true,
        tlsAllowInvalidCertificates: false,
        ssl: true,
        sslValidate: true,
        // Replica set options
        replicaSet: process.env.MONGODB_REPLICA_SET,
        // Authentication
        authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
        // Write concern
        w: 'majority',
        wtimeoutMS: 10000,
        // Read preference
        readPreference: 'primary',
        // Retry writes
        retryWrites: true
    }
};

// Connection state tracking
let connectionState = 'disconnected';

// Connect to MongoDB Atlas
async function connectToAtlas() {
    try {
        if (!ATLAS_CONFIG.uri) {
            throw new Error('MONGODB_ATLAS_URI or MONGODB_URI environment variable is required');
        }

        console.log('🌐 Connecting to MongoDB Atlas...');
        
        // Parse connection string to extract database name
        const dbName = ATLAS_CONFIG.uri.split('/').pop().split('?')[0];
        console.log(`  📊 Database: ${dbName}`);
        
        // Extract cluster info from URI
        const clusterMatch = ATLAS_CONFIG.uri.match(/@([^.]+)\.mongodb\.net/);
        if (clusterMatch) {
            console.log(`  🗂️  Cluster: ${clusterMatch[1]}`);
        }

        // Connect to MongoDB Atlas
        await mongoose.connect(ATLAS_CONFIG.uri, ATLAS_CONFIG.options);
        
        connectionState = 'connected';
        console.log('✅ Successfully connected to MongoDB Atlas');
        
        // Log connection details
        const db = mongoose.connection.db;
        const adminDb = mongoose.connection.db.admin();
        
        try {
            const serverStatus = await adminDb.serverStatus();
            console.log(`  🖥️  MongoDB Version: ${serverStatus.version}`);
            console.log(`  🔌 Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
        } catch (error) {
            console.log('  ℹ️  Server status unavailable (may not have admin privileges)');
        }
        
        return mongoose.connection;
        
    } catch (error) {
        connectionState = 'error';
        console.error('❌ Failed to connect to MongoDB Atlas:', error.message);
        
        // Provide helpful error messages for common issues
        if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 Check if your IP address is whitelisted in MongoDB Atlas');
        } else if (error.message.includes('Authentication failed')) {
            console.error('💡 Check your username and password in the connection string');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('💡 Check your cluster hostname in the connection string');
        }
        
        throw error;
    }
}

// Handle connection events
mongoose.connection.on('connected', () => {
    connectionState = 'connected';
    console.log('🔗 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    connectionState = 'error';
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    connectionState = 'disconnected';
    console.log('🔌 Mongoose disconnected from MongoDB Atlas');
});

mongoose.connection.on('reconnected', () => {
    connectionState = 'connected';
    console.log('🔄 Mongoose reconnected to MongoDB Atlas');
});

// Prevent memory leaks by setting max listeners
mongoose.connection.setMaxListeners(5);

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔄 MongoDB Atlas connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing MongoDB Atlas connection:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔄 MongoDB Atlas connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing MongoDB Atlas connection:', error);
        process.exit(1);
    }
});

// Health check function
function getConnectionHealth() {
    return {
        state: connectionState,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
    };
}

// Test connection function
async function testConnection() {
    try {
        const connection = await connectToAtlas();
        
        // Test basic operations
        const db = connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log(`\n📚 Available collections: ${collections.length}`);
        collections.forEach(col => {
            console.log(`  - ${col.name}`);
        });
        
        // Test write operation
        const testCollection = db.collection('connection_test');
        await testCollection.insertOne({ 
            test: true, 
            timestamp: new Date(),
            message: 'Connection test successful'
        });
        
        // Test read operation
        const testDoc = await testCollection.findOne({ test: true });
        if (testDoc) {
            console.log('✅ Read/Write test successful');
        }
        
        // Clean up test data
        await testCollection.deleteOne({ test: true });
        
        console.log('🎯 MongoDB Atlas connection test completed successfully!');
        
        return true;
        
    } catch (error) {
        console.error('❌ MongoDB Atlas connection test failed:', error);
        return false;
    }
}

// Export functions
module.exports = {
    connectToAtlas,
    getConnectionHealth,
    testConnection,
    mongoose
};

// Run test if called directly
if (require.main === module) {
    testConnection()
        .then((success) => {
            if (success) {
                console.log('\n🎉 Ready to use MongoDB Atlas!');
                process.exit(0);
            } else {
                console.log('\n💥 MongoDB Atlas connection failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}
