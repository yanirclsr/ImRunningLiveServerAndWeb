// db/init.js - Database initialization script
const { connectDB, mongoose } = require('./db');
const { User, Event, Activity, LocationPing, Cheer } = require('./models');
const { 
    generateUserId, 
    generateEventId, 
    generateActivityId, 
    generateShareToken 
} = require('./utils');

async function initializeDatabase() {
    try {
        console.log('🚀 Initializing database...');
        
        // Check if already connected
        if (mongoose.connection.readyState !== 1) {
            console.log('  - Connecting to MongoDB...');
            await connectDB();
        }
        
        // Create collections and indexes
        await createCollections();
        
        // Seed initial data
        await seedInitialData();
        
        console.log('✅ Database initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

async function createCollections() {
    console.log('📚 Creating collections and indexes...');
    
    try {
        // Force collection creation by inserting and removing a dummy document
        const collections = [User, Event, Activity, LocationPing, Cheer];
        
        for (const Collection of collections) {
            const collectionName = Collection.collection.name;
            console.log(`  - Checking collection: ${collectionName}`);
            
            try {
                // Check if collection exists
                const collectionsList = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
                
                if (collectionsList.length === 0) {
                    // Create collection if it doesn't exist
                    await mongoose.connection.createCollection(collectionName);
                    console.log(`    ✅ Created collection: ${collectionName}`);
                } else {
                    console.log(`    ℹ️  Collection ${collectionName} already exists`);
                }
                
                // Create/update indexes (safe to run multiple times)
                await Collection.createIndexes();
                console.log(`    ✅ Indexes updated for: ${collectionName}`);
                
            } catch (collectionError) {
                console.log(`    ⚠️  Collection ${collectionName} error:`, collectionError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Error creating collections:', error);
        throw error;
    }
}

async function seedInitialData() {
    console.log('🌱 Seeding initial data...');
    
    try {
        // Check if Berlin Marathon 2025 event already exists
        const existingEvent = await Event.findOne({ 
            name: 'Berlin Marathon 2025',
            date: new Date('2025-09-21')
        });
        
        if (existingEvent) {
            console.log('  - Berlin Marathon 2025 event already exists, skipping...');
            return;
        }
        
        // Create Berlin Marathon 2025 event
        const berlinEvent = new Event({
            _id: generateEventId(),
            name: 'Berlin Marathon 2025',
            date: new Date('2025-09-21T07:59:00.000Z'), // 9:59 AM Berlin time
            location: {
                city: 'Berlin',
                country: 'Germany',
                coordinates: {
                    type: 'Point',
                    coordinates: [13.3777, 52.5163] // [lng, lat] - Brandenburg Gate
                }
            },
            type: 'marathon',
            distance: 42195, // 42.195 km in meters
            route: {
                checkpoints: [
                    {
                        name: 'Start - Straße des 17. Juni',
                        distance: 0,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 1 - 5km',
                        distance: 5000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 2 - 10km',
                        distance: 10000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 3 - 15km',
                        distance: 15000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 4 - 20km',
                        distance: 20000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 5 - 25km',
                        distance: 25000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 6 - 30km',
                        distance: 30000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 7 - 35km',
                        distance: 35000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Checkpoint 8 - 40km',
                        distance: 40000,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    },
                    {
                        name: 'Finish - Brandenburg Gate',
                        distance: 42195,
                        coordinates: {
                            type: 'Point',
                            coordinates: [13.3777, 52.5163]
                        }
                    }
                ]
            },
            settings: {
                maxParticipants: 50000,
                registrationOpen: true,
                trackingEnabled: true
            }
        });
        
        await berlinEvent.save();
        console.log(`  ✅ Created event: ${berlinEvent.name} (${berlinEvent._id})`);
        
        // Create a sample user for testing
        const sampleUser = new User({
            _id: generateUserId(),
            email: 'yanir@example.com',
            displayName: 'Yanir',
            auth: {
                provider: 'apple',
                sub: 'apple-oidc-sub-sample'
            },
            preferences: {
                voice: 'en-GB',
                cheersVolume: 0.8
            }
        });
        
        await sampleUser.save();
        console.log(`  ✅ Created sample user: ${sampleUser.displayName} (${sampleUser._id})`);
        
        // Create a sample activity for the user
        const sampleActivity = new Activity({
            _id: generateActivityId(),
            runnerId: sampleUser._id,
            eventId: berlinEvent._id,
            status: 'planned',
            share: {
                public: true,
                token: generateShareToken(),
                expiresAt: null
            },
            settings: {
                pingIntervalSec: 10,
                cheersEnabled: true,
                ttsLang: 'en-US'
            }
        });
        
        await sampleActivity.save();
        console.log(`  ✅ Created sample activity: ${sampleActivity._id}`);
        
        console.log('  🌟 Sample data created successfully!');
        
    } catch (error) {
        console.error('❌ Error seeding initial data:', error);
        throw error;
    }
}

async function createSampleData() {
    console.log('🎯 Creating additional sample data...');
    
    try {
        // Create a few more sample users
        const sampleUsers = [
            {
                email: 'rachel@example.com',
                displayName: 'Rachel',
                auth: { provider: 'apple', sub: 'apple-oidc-sub-rachel' }
            },
            {
                email: 'dad@example.com',
                displayName: 'Dad',
                auth: { provider: 'apple', sub: 'apple-oidc-sub-dad' }
            }
        ];
        
        for (const userData of sampleUsers) {
            const user = new User({
                _id: generateUserId(),
                ...userData,
                preferences: {
                    voice: 'en-GB',
                    cheersVolume: 0.8
                }
            });
            
            await user.save();
            console.log(`  ✅ Created user: ${user.displayName} (${user._id})`);
        }
        
        // Create some sample cheers
        const sampleCheers = [
            {
                from: { name: 'Rachel', ip: '192.168.1.100' },
                message: 'Go Yanir! You\'re crushing it! 🔥'
            },
            {
                from: { name: 'Dad', ip: '192.168.1.101' },
                message: 'So proud of you! Keep that pace!'
            },
            {
                from: { name: 'Team Berlin', ip: '192.168.1.102' },
                message: 'Berlin loves you! Amazing run! 🇩🇪❤️'
            }
        ];
        
        // Get the sample activity to attach cheers to
        const sampleActivity = await Activity.findOne().sort({ createdAt: -1 });
        
        if (sampleActivity) {
            for (const cheerData of sampleCheers) {
                const cheer = new Cheer({
                    activityId: sampleActivity._id,
                    ...cheerData
                });
                
                await cheer.save();
                console.log(`  ✅ Created cheer from ${cheer.from.name}`);
            }
        }
        
        console.log('  🎉 Sample data creation completed!');
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
        throw error;
    }
}

async function showDatabaseStatus() {
    console.log('\n📊 Database Status:');
    
    try {
        const collections = ['users', 'events', 'activities', 'locationpings', 'cheers'];
        
        for (const collectionName of collections) {
            const count = await mongoose.connection.db.collection(collectionName).countDocuments();
            console.log(`  - ${collectionName}: ${count} documents`);
        }
        
        // Show sample tracking URL
        const sampleActivity = await Activity.findOne().populate('eventId');
        if (sampleActivity) {
            const trackingUrl = `http://localhost:3000/track/${sampleActivity.share.token}`;
            console.log(`\n🔗 Sample tracking URL: ${trackingUrl}`);
        }
        
    } catch (error) {
        console.error('❌ Error getting database status:', error);
    }
}

// Main execution
if (require.main === module) {
    initializeDatabase()
        .then(() => showDatabaseStatus())
        .then(() => {
            console.log('\n🎯 Database is ready for use!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = {
    initializeDatabase,
    createCollections,
    seedInitialData,
    createSampleData,
    showDatabaseStatus
};
