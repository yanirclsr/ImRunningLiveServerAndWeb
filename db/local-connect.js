// db/local-connect.js - Local MongoDB connection for development
const mongoose = require('mongoose');

// Local MongoDB connection configuration
const LOCAL_CONFIG = {
    uri: process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/imrunning',
    options: {
        // Modern MongoDB driver options
        maxPoolSize: 5, // Smaller pool for local development
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        // Local development options
        ssl: false,
        sslValidate: false,
        // Write concern
        w: 1,
        wtimeout: 5000,
        // Read preference
        readPreference: 'primary'
    }
};

// Connection state tracking
let connectionState = 'disconnected';

// Connect to local MongoDB
async function connectToLocal() {
    try {
        console.log('🏠 Connecting to local MongoDB...');
        
        // Parse connection string to extract database name
        const dbName = LOCAL_CONFIG.uri.split('/').pop().split('?')[0];
        console.log(`  📊 Database: ${dbName}`);
        console.log(`  🖥️  Host: localhost:27017`);
        
        // Check if MongoDB is running
        await checkMongoService();
        
        // Connect to MongoDB
        await mongoose.connect(LOCAL_CONFIG.uri, LOCAL_CONFIG.options);
        
        connectionState = 'connected';
        console.log('✅ Successfully connected to local MongoDB');
        
        // Log connection details
        const db = mongoose.connection.db;
        const adminDb = mongoose.connection.db.admin();
        
        try {
            const serverStatus = await adminDb.serverStatus();
            console.log(`  🖥️  MongoDB Version: ${serverStatus.version}`);
            console.log(`  🔌 Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
            console.log(`  💾 Storage Engine: ${serverStatus.storageEngine.name}`);
        } catch (error) {
            console.log('  ℹ️  Server status unavailable (may not have admin privileges)');
        }
        
        return mongoose.connection;
        
    } catch (error) {
        connectionState = 'error';
        console.error('❌ Failed to connect to local MongoDB:', error.message);
        
        // Provide helpful error messages for common issues
        if (error.message.includes('ECONNREFUSED')) {
            console.error('💡 MongoDB service is not running. Try:');
            console.error('   brew services start mongodb-community@7.0');
            console.error('   or');
            console.error('   mongod --config /usr/local/etc/mongod.conf');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('💡 Check if MongoDB is installed and running');
        } else if (error.message.includes('Authentication failed')) {
            console.error('💡 Check if authentication is enabled in mongod.conf');
        }
        
        throw error;
    }
}

// Check if MongoDB service is running
async function checkMongoService() {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        
        // Check if MongoDB process is running
        exec('pgrep mongod', (error, stdout, stderr) => {
            if (error) {
                console.log('  ⚠️  MongoDB service check failed, attempting connection anyway...');
                resolve();
            } else if (stdout.trim()) {
                console.log('  ✅ MongoDB service is running');
                resolve();
            } else {
                console.log('  ⚠️  MongoDB service not detected, attempting connection anyway...');
                resolve();
            }
        });
    });
}

// Start MongoDB service (macOS with Homebrew)
async function startMongoService() {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        
        console.log('🚀 Starting MongoDB service...');
        
        exec('brew services start mongodb-community@7.0', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Failed to start MongoDB service:', error.message);
                console.error('💡 Try starting manually:');
                console.error('   brew services start mongodb-community@7.0');
                reject(error);
            } else {
                console.log('✅ MongoDB service started');
                console.log('⏳ Waiting for service to be ready...');
                
                // Wait a bit for the service to fully start
                setTimeout(() => {
                    resolve();
                }, 3000);
            }
        });
    });
}

// Handle connection events
mongoose.connection.on('connected', () => {
    connectionState = 'connected';
    console.log('🔗 Mongoose connected to local MongoDB');
});

mongoose.connection.on('error', (err) => {
    connectionState = 'error';
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    connectionState = 'disconnected';
    console.log('🔌 Mongoose disconnected from local MongoDB');
});

mongoose.connection.on('reconnected', () => {
    connectionState = 'connected';
    console.log('🔄 Mongoose reconnected to local MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔄 Local MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing local MongoDB connection:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    try {
        await mongoose.connection.close();
        console.log('🔄 Local MongoDB connection closed through app termination');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error closing local MongoDB connection:', error);
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
        const connection = await connectToLocal();
        
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
            message: 'Local connection test successful'
        });
        
        // Test read operation
        const testDoc = await testCollection.findOne({ test: true });
        if (testDoc) {
            console.log('✅ Read/Write test successful');
        }
        
        // Clean up test data
        await testCollection.deleteOne({ test: true });
        
        console.log('🎯 Local MongoDB connection test completed successfully!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Local MongoDB connection test failed:', error);
        return false;
    }
}

// Auto-start MongoDB service and connect
async function autoConnect() {
    try {
        // Try to connect first
        await connectToLocal();
        return mongoose.connection;
    } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔄 Attempting to start MongoDB service...');
            try {
                await startMongoService();
                // Try connecting again
                await connectToLocal();
                return mongoose.connection;
            } catch (startError) {
                console.error('❌ Failed to start MongoDB service:', startError.message);
                throw startError;
            }
        } else {
            throw error;
        }
    }
}

// Export functions
module.exports = {
    connectToLocal,
    startMongoService,
    autoConnect,
    getConnectionHealth,
    testConnection,
    mongoose
};

// Run test if called directly
if (require.main === module) {
    autoConnect()
        .then((connection) => {
            console.log('\n🎉 Ready to use local MongoDB!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Local MongoDB connection failed');
            console.error('\n💡 Troubleshooting tips:');
            console.error('1. Check if MongoDB is installed: brew list mongodb-community@7.0');
            console.error('2. Start MongoDB service: brew services start mongodb-community@7.0');
            console.error('3. Check MongoDB status: brew services list | grep mongodb');
            console.error('4. View MongoDB logs: tail -f /usr/local/var/log/mongodb/mongo.log');
            process.exit(1);
        });
}
