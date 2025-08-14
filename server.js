const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Database imports
const { connectDB } = require('./db/db');
const { User, Event, Activity, LocationPing, Cheer } = require('./db/models');
const { 
    generateUserId, 
    generateEventId, 
    generateActivityId, 
    generateShareToken,
    validateId, 
    calculateDistance, 
    calculatePace, 
    formatTime,
    sanitizeInput,
    getBerlinMarathonBounds,
    getClientIP
} = require('./db/utils');

// Import database initialization
const { initializeDatabase } = require('./db/init');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and initialize if needed
async function startServer() {
    try {
        console.log('🚀 Starting I\'m Running Live server...');
        
        // Connect to MongoDB
        await connectDB();
        
        // Check if database needs initialization
        console.log('🔍 Checking database initialization...');
        try {
            await initializeDatabase();
            console.log('✅ Database initialization completed');
        } catch (initError) {
            console.log('⚠️  Database already initialized or initialization failed:', initError.message);
            // Continue with server startup even if initialization fails
        }
        
        // Start the server
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🏃‍♂️ I'm Running Live API is running on port ${PORT}`);
            console.log(`🌐 Platform: imrunning.live`);
            console.log(`📍 Homepage: http://localhost:${PORT}/`);
            console.log(`🔧 API Test: http://localhost:${PORT}/api/test`);
            console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🔌 Socket.IO enabled for real-time updates`);
            console.log(`🌍 Server listening on all interfaces (0.0.0.0:${PORT})`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server only if this file is run directly
if (require.main === module) {
    startServer();
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Add some branding headers
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'I\'m Running Live');
    next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard - view recent activities in browser
app.get('/dashboard', async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('runnerId', 'displayName email')
            .populate('eventId', 'name date type distance');
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>I'm Running Live - Activity Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f7; }
                .container { max-width: 1200px; margin: 0 auto; }
                h1 { color: #1d1d1f; text-align: center; margin-bottom: 30px; }
                .activity-card { background: white; border-radius: 12px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .activity-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .status { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                .status.planned { background: #e3f2fd; color: #1976d2; }
                .status.active { background: #e8f5e8; color: #2e7d32; }
                .status.finished { background: #f3e5f5; color: #7b1fa2; }
                .runner-info { margin-bottom: 10px; }
                .event-info { margin-bottom: 15px; }
                .tracking-links { display: flex; gap: 10px; flex-wrap: wrap; }
                .tracking-links a { padding: 8px 16px; background: #007aff; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; }
                .tracking-links a:hover { background: #0056b3; }
                .timestamp { color: #86868b; font-size: 12px; }
                .refresh-btn { display: block; margin: 20px auto; padding: 12px 24px; background: #007aff; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
                .refresh-btn:hover { background: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏃‍♂️ I'm Running Live - Activity Dashboard</h1>
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Activities</button>
        `;
        
        if (activities.length === 0) {
            html += '<div class="activity-card"><p>No activities found. Start an activity to see it here!</p></div>';
        } else {
            activities.forEach(activity => {
                const statusClass = activity.status || 'planned';
                const statusText = (activity.status || 'planned').toUpperCase();
                
                html += `
                <div class="activity-card">
                    <div class="activity-header">
                        <h3>Activity ${activity._id}</h3>
                        <span class="status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="runner-info">
                        <strong>Runner:</strong> ${activity.runnerId?.displayName || 'Unknown'} (${activity.runnerId?._id || 'N/A'})
                    </div>
                    <div class="event-info">
                        <strong>Event:</strong> ${activity.eventId?.name || 'Unknown'} - ${activity.eventId?.type || 'N/A'} (${activity.eventId?.distance || 'N/A'}m)
                    </div>
                    <div class="timestamp">
                        <strong>Created:</strong> ${new Date(activity.createdAt).toLocaleString()}
                        ${activity.startedAt ? `<br><strong>Started:</strong> ${new Date(activity.startedAt).toLocaleString()}` : ''}
                    </div>
                    <div class="tracking-links">
                        <a href="/runner/${activity.runnerId?._id || 'unknown'}/${activity._id}" target="_blank">👁️ View Activity</a>
                        <a href="/${activity.runnerId?._id || 'unknown'}/${activity._id}" target="_blank">👤 User View</a>
                        <a href="/api/runner/${activity.runnerId?._id || 'unknown'}/activity/${activity._id}" target="_blank">🔧 API Data</a>
                    </div>
                </div>
                `;
            });
        }
        
        html += `
            </div>
        </body>
        </html>
        `;
        
        res.send(html);
        
    } catch (error) {
        console.error('❌ Error generating dashboard:', error);
        res.status(500).send('Error generating dashboard');
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join runner tracking room
    socket.on('join-tracking', ({ runnerId, activityId }) => {
        if (validateId(runnerId) && validateId(activityId)) {
            const room = `${runnerId}-${activityId}`;
            socket.join(room);
            console.log(`📍 Client ${socket.id} joined tracking room: ${room}`);
        }
    });

    // Leave tracking room
    socket.on('leave-tracking', ({ runnerId, activityId }) => {
        const room = `${runnerId}-${activityId}`;
        socket.leave(room);
        console.log(`📍 Client ${socket.id} left tracking room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Root endpoint - Serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'I\'m Running Live API is active! 🏃‍♂️',
        timestamp: new Date().toISOString(),
        platform: 'imrunning.live',
        version: '1.0.0'
    });
});

// Test ID validation endpoint
app.get('/api/test/validation/:userId/:activityId', (req, res) => {
    const { userId, activityId } = req.params;
    
    const validation = {
        userId: {
            value: userId,
            isValid: validateId(userId),
            expectedFormat: 'usr_XXXXXXXX (8 alphanumeric characters)'
        },
        activityId: {
            value: activityId,
            isValid: validateId(activityId),
            expectedFormat: 'act_XXXXXXXX (8 alphanumeric characters)'
        },
        bothValid: validateId(userId) && validateId(activityId),
        liveMapUrl: `/usr_2758f8dd/act_a632ae7b`,
        runnerPageUrl: `/runner/usr_2758f8dd/act_a632ae7b`
    };
    
    res.json(validation);
});

// Test activity data endpoint - for testing iOS app integration
app.post('/api/test/activity', async (req, res) => {
    try {
        const { testType, runnerId, activityId, location, metrics } = req.body;
        
        console.log('🧪 Test activity data received:', {
            testType,
            runnerId,
            activityId,
            location,
            metrics
        });

        // Simulate processing the activity data
        const response = {
            success: true,
            message: 'Test activity data received successfully',
            timestamp: new Date().toISOString(),
            data: {
                testType,
                runnerId,
                activityId,
                location,
                metrics,
                processed: true
            },
            serverInfo: {
                status: 'running',
                port: PORT,
                uptime: process.uptime()
            }
        };

        // If this was a real activity, we would:
        // 1. Validate the runner and activity IDs
        // 2. Store location data
        // 3. Update activity metrics
        // 4. Emit real-time updates via Socket.IO
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error processing test activity data:', error);
        res.status(500).json({
            error: 'Failed to process test activity data',
            message: error.message
        });
    }
});

// Get recent activities with tracking links
app.get('/api/activities/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get recent activities with user and event details
        // Sort by createdAt descending, with fallback to _id for consistent ordering
        let activities = await Activity.find()
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit * 2) // Get more to filter out ones without createdAt
            .populate('runnerId', 'displayName email')
            .populate('eventId', 'name date type distance');
        
        // Filter out activities without createdAt and ensure we have the requested limit
        activities = activities
            .filter(activity => activity.createdAt)
            .slice(0, limit);
        
        console.log(`🔍 Found ${activities.length} activities with valid timestamps, latest createdAt: ${activities[0]?.createdAt || 'N/A'}`);
        
        // Format activities with tracking URLs
        const formattedActivities = activities.map(activity => {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            return {
                id: activity._id,
                status: activity.status,
                createdAt: activity.createdAt,
                startedAt: activity.startedAt,
                runner: {
                    id: activity.runnerId._id,
                    displayName: activity.runnerId.displayName,
                    email: activity.runnerId.email
                },
                event: {
                    id: activity.eventId._id,
                    name: activity.eventId.name,
                    date: activity.eventId.date,
                    type: activity.eventId.type,
                    distance: activity.eventId.distance
                },
                trackingUrls: {
                    runner: `${baseUrl}/runner/${activity.runnerId._id}/${activity._id}`,
                    user: `${baseUrl}/${activity.runnerId._id}/${activity._id}`,
                    api: `${baseUrl}/api/runner/${activity.runnerId._id}/activity/${activity._id}`
                }
            };
        });
        
        res.json({
            success: true,
            count: formattedActivities.length,
            activities: formattedActivities,
            message: `Found ${formattedActivities.length} recent activities`
        });
        
    } catch (error) {
        console.error('❌ Error fetching recent activities:', error);
        res.status(500).json({
            error: 'Failed to fetch recent activities',
            message: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    const { getConnectionHealth } = require('./db/db');
    const dbHealth = getConnectionHealth();
    
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        service: 'I\'m Running Live API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: {
            status: dbHealth.state,
            type: dbHealth.type,
            readyState: dbHealth.readyState,
            host: dbHealth.host,
            name: dbHealth.name
        }
    });
});

// Create new runner and activity
app.post('/api/runners', async (req, res) => {
    try {
        const { name, email, phone, raceName, raceDate, targetTime } = req.body;

        if (!name || !raceName || !raceDate) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'raceName', 'raceDate']
            });
        }

        // Generate unique IDs
        const { runnerId, activityId } = require('./db/utils').generateRunnerAndActivityIds();

        // Create runner
        const runner = new Runner({
            runnerId,
            name: sanitizeInput(name),
            email: email ? sanitizeInput(email) : undefined,
            phone: phone ? sanitizeInput(phone) : undefined,
            profile: {
                city: 'Berlin',
                country: 'Germany'
            }
        });

        // Create activity
        const activity = new Activity({
            activityId,
            runnerId,
            raceName: sanitizeInput(raceName),
            raceDate: new Date(raceDate),
            targetTime,
            status: 'planned'
        });

        // Create race stats
        const raceStats = new RaceStats({
            activityId,
            runnerId
        });

        // Save all documents
        await Promise.all([
            runner.save(),
            activity.save(),
            raceStats.save()
        ]);

        const trackingUrl = `${req.protocol}://${req.get('host')}/${runnerId}/${activityId}`;

        res.status(201).json({
            success: true,
            runnerId,
            activityId,
            trackingUrl,
            message: 'Runner and activity created successfully'
        });

    } catch (error) {
        console.error('❌ Error creating runner:', error);
        res.status(500).json({
            error: 'Failed to create runner',
            message: error.message
        });
    }
});

// Start activity (begin tracking)
app.post('/api/runner/:runnerId/activity/:activityId/start', async (req, res) => {
    try {
        const { runnerId, activityId } = req.params;
        const { startLocation, latitude, longitude, eventName, eventType, eventDate } = req.body;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        let user = await User.findById(runnerId);
        let activity = await Activity.findById(activityId);
        let event = null;

        // If user doesn't exist, create a new one with dummy data
        if (!user) {
            console.log(`👤 Creating new user with ID: ${runnerId}`);
            user = new User({
                _id: runnerId,
                email: `${runnerId}@example.com`,
                displayName: `Runner ${runnerId.slice(-4)}`,
                auth: {
                    provider: 'apple',
                    sub: `apple-oidc-sub-${runnerId.slice(-8)}`
                },
                preferences: {
                    voice: 'en-GB',
                    cheersVolume: 0.8
                }
            });
            await user.save();
            console.log(`✅ Created new user: ${user.displayName} (${user._id})`);
        }

        // If activity doesn't exist, create a new one
        if (!activity) {
            console.log(`🏃‍♂️ Creating new activity with ID: ${activityId}`);
            
                    // Check if we have custom event info from the request
            const { eventName, eventType, eventDate } = req.body;
            
            console.log(`🔍 Request body event info:`, { eventName, eventType, eventDate });
            console.log(`🔍 Full request body:`, req.body);
            console.log(`🔍 Event name check: "${eventName}" !== "Custom Run" = ${eventName !== 'Custom Run'}`);
            
            if (eventName && eventName !== 'Custom Run') {
                // Create a custom event based on user input
                const finalEventType = eventType || 'custom';
                console.log(`🏁 Creating custom event: ${eventName} (Type: ${finalEventType})`);
                console.log(`🔍 Event type validation: ${finalEventType} is valid: ${['marathon', 'half-marathon', '10k', '5k', 'ultra', 'other', 'custom'].includes(finalEventType)}`);
                
                event = new Event({
                    _id: generateEventId(),
                    name: eventName,
                    date: eventDate ? new Date(eventDate) : new Date(),
                    location: {
                        city: 'Tel Aviv',
                        country: 'Israel',
                        coordinates: {
                            type: 'Point',
                            coordinates: [34.7818, 32.0853] // Tel Aviv coordinates [lng, lat]
                        }
                    },
                    type: finalEventType,
                    distance: 0, // Unknown distance for custom events
                    description: `Custom running event: ${eventName}`,
                    status: 'active',
                    registration: {
                        open: false,
                        deadline: new Date(),
                        maxParticipants: 1
                    },
                    tracking: {
                        enabled: true,
                        startTime: new Date(),
                        endTime: null,
                        checkpoints: []
                    }
                });
                
                try {
                    await event.save();
                    console.log(`✅ Created custom event: ${event.name} (${event._id})`);
                } catch (saveError) {
                    console.error(`❌ Failed to save custom event: ${saveError.message}`);
                    console.error(`❌ Save error details:`, saveError);
                    throw new Error(`Failed to create custom event: ${saveError.message}`);
                }
            } else {
                // Fallback to Berlin Marathon event (or create one if it doesn't exist)
                event = await Event.findOne({ name: /berlin.*marathon/i });
                if (!event) {
                    console.log('🏁 Creating Berlin Marathon event');
                    event = new Event({
                        _id: generateEventId(),
                        name: 'Berlin Marathon 2025',
                        date: new Date('2025-09-28'),
                        location: {
                            city: 'Berlin',
                            country: 'Germany',
                            coordinates: {
                                type: 'Point',
                                coordinates: [13.4050, 52.5200] // [lng, lat]
                            }
                        },
                        type: 'marathon',
                        distance: 42195,
                        description: 'The 52nd Berlin Marathon - one of the world\'s fastest marathon courses',
                        status: 'upcoming',
                        registration: {
                            open: true,
                            deadline: new Date('2025-08-28'),
                            maxParticipants: 50000
                        },
                        tracking: {
                            enabled: true,
                            startTime: new Date('2025-09-28T08:00:00Z'),
                            endTime: new Date('2025-09-28T18:00:00Z'),
                            checkpoints: [
                                { km: 5, name: 'Brandenburg Gate' },
                                { km: 10, name: 'Potsdamer Platz' },
                                { km: 21.1, name: 'Half Marathon' },
                                { km: 30, name: 'Alexanderplatz' },
                                { km: 35, name: 'Unter den Linden' },
                                { km: 42.195, name: 'Finish Line' }
                            ]
                        }
                    });
                    await event.save();
                    console.log(`✅ Created Berlin Marathon event: ${event.name} (${event._id})`);
                }
            }

            // Create the new activity
            const now = new Date();
            activity = new Activity({
                _id: activityId,
                runnerId: user._id,
                eventId: event._id,
                status: 'planned',
                createdAt: now,
                updatedAt: now,
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
            await activity.save();
            console.log(`✅ Created new activity: ${activity._id} for user ${user.displayName}`);
        } else {
            // Get the event for existing activity
            event = await Event.findById(activity.eventId);
        }

        // Update activity status to active and set start time
        activity.status = 'active';
        activity.startedAt = new Date();
        activity.updatedAt = new Date();
        await activity.save();

        // Save initial location if provided
        if (startLocation && startLocation.lat && startLocation.lng) {
            const location = new LocationPing({
                meta: {
                    activityId: activity._id,
                    runnerId: user._id
                },
                ts: new Date(),
                loc: {
                    type: 'Point',
                    coordinates: [startLocation.lng, startLocation.lat]
                },
                accuracy: startLocation.accuracy || 10,
                elevM: startLocation.altitude,
                speedMps: startLocation.speed,
                heading: startLocation.heading
            });
            await location.save();
            console.log(`📍 Saved initial location: ${startLocation.lat}, ${startLocation.lng}`);
        }

        // Notify connected clients
        io.to(`${runnerId}-${activityId}`).emit('activity-started', {
            runnerId: user._id,
            activityId: activity._id,
            startTime: activity.startedAt
        });

        // Log what we're sending back
        console.log(`📤 Sending response with event:`, {
            eventId: event._id,
            eventName: event.name,
            eventType: event.type,
            eventLocation: event.location
        });
        
        // Return comprehensive data
        res.json({
            success: true,
            message: 'Activity started successfully',
            data: {
                user: {
                    id: user._id,
                    displayName: user.displayName,
                    email: user.email,
                    preferences: user.preferences
                },
                event: {
                    id: event._id,
                    name: event.name,
                    date: event.date,
                    location: event.location,
                    type: event.type,
                    distance: event.distance
                },
                activity: {
                    id: activity._id,
                    status: activity.status,
                    startedAt: activity.startedAt,
                    share: activity.share,
                    settings: activity.settings
                },
                startLocation: startLocation || null
            },
            startTime: activity.startedAt
        });

    } catch (error) {
        console.error('❌ Error starting activity:', error);
        res.status(500).json({
            error: 'Failed to start activity',
            message: error.message
        });
    }
});

// Update runner location (from mobile app)
app.post('/api/runner/:runnerId/activity/:activityId/location', async (req, res) => {
    try {
        const { runnerId, activityId } = req.params;
        const { lat, lng, accuracy, altitude, speed, heading, heartRate, cadence, temperature, humidity } = req.body;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        // Validate location is within Berlin Marathon bounds
        const bounds = getBerlinMarathonBounds();
        if (!require('./db/utils').isLocationWithinBounds(lat, lng, bounds)) {
            console.warn(`⚠️ Location outside Berlin bounds: ${lat}, ${lng}`);
        }

        // Get previous location to calculate distance
        const previousLocation = await LocationPing.findOne(
            { 'meta.activityId': activityId, 'meta.runnerId': runnerId },
            {},
            { sort: { ts: -1 } }
        );

        let cumulativeDistance = 0;
        if (previousLocation) {
            const prevCoords = previousLocation.loc.coordinates;
            const distance = calculateDistance(
                prevCoords[1], prevCoords[0], // lat, lng
                lat, lng
            );
            cumulativeDistance = (previousLocation.distance || 0) + distance;
        }

        // Create new location record
        const location = new LocationPing({
            meta: {
                activityId,
                runnerId
            },
            ts: new Date(),
            loc: {
                type: 'Point',
                coordinates: [lng, lat] // MongoDB expects [lng, lat]
            },
            accuracy: accuracy || 10,
            elevM: altitude,
            speedMps: speed,
            heading: heading,
            distance: cumulativeDistance,
            heartRate: heartRate,
            cadence: cadence,
            temperature: temperature,
            humidity: humidity
        });

        await location.save();

        // Update race stats
        const activity = await Activity.findById(activityId);
        if (activity && activity.startedAt) {
            const elapsedTime = Math.floor((Date.now() - activity.startedAt) / 1000);
            const currentPace = calculatePace(elapsedTime, cumulativeDistance * 1000); // Convert km to meters
            
            // Note: RaceStats model doesn't exist, so we'll skip this for now
            console.log(`📊 Race stats - Distance: ${cumulativeDistance}km, Time: ${elapsedTime}s, Pace: ${currentPace}s/km`);
        }

        // Notify connected clients
        io.to(`${runnerId}-${activityId}`).emit('location-update', {
            runnerId,
            activityId,
            location: {
                lat,
                lng,
                distance: cumulativeDistance,
                timestamp: location.ts
            }
        });

        res.json({
            success: true,
            message: 'Location updated successfully',
            distance: cumulativeDistance,
            timestamp: location.ts
        });

    } catch (error) {
        console.error('❌ Error updating location:', error);
        res.status(500).json({
            error: 'Failed to update location',
            message: error.message
        });
    }
});

// Get runner data and current location
app.get('/api/runner/:runnerId/activity/:activityId', async (req, res) => {
    try {
        const { runnerId, activityId } = req.params;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        // Get activity, user, and event info
        const activity = await Activity.findById(activityId);
        const user = await User.findById(runnerId);
        
        if (!activity || !user) {
            return res.status(404).json({ error: 'Runner or activity not found' });
        }
        
        const event = await Event.findById(activity.eventId);
        const latestLocation = await LocationPing.findOne(
            { 'meta.activityId': activityId, 'meta.runnerId': runnerId },
            {},
            { sort: { ts: -1 } }
        );

        if (!activity || !user) {
            return res.status(404).json({ error: 'Runner or activity not found' });
        }

        // Calculate current stats
        let currentStats = {
            distance: 0,
            pace: '0:00',
            heartRate: 0,
            currentTime: '00:00:00',
            remaining: 42.2
        };

        if (activity.startedAt && latestLocation) {
            const elapsedTime = Math.floor((Date.now() - activity.startedAt) / 1000);
            const distanceKm = latestLocation.distance || 0;
            currentStats = {
                distance: distanceKm,
                pace: formatTime(calculatePace(elapsedTime, distanceKm * 1000)),
                heartRate: latestLocation.heartRate || 0,
                currentTime: formatTime(elapsedTime),
                remaining: Math.max(0, 42.2 - distanceKm)
            };
        }

        res.json({
            runnerId,
            activityId,
            runner: {
                name: user.displayName || 'Unknown Runner',
                city: user.profile?.city || 'Unknown',
                country: user.profile?.country || 'Unknown'
            },
            event: event ? {
                name: event.name || 'Custom Run',
                date: event.date || new Date(),
                type: event.type || 'custom',
                location: event.location || null
            } : null,
            activity: {
                raceName: event?.name || 'Custom Run',
                raceDate: event?.date || new Date(),
                status: activity.status || 'planned',
                startTime: activity.startedAt,
                targetTime: null
            },
            currentStats,
            lastLocation: latestLocation ? {
                lat: latestLocation.loc.coordinates[1],
                lng: latestLocation.loc.coordinates[0],
                timestamp: latestLocation.ts
            } : null,
            platform: 'imrunning.live'
        });

    } catch (error) {
        console.error('❌ Error getting runner data:', error);
        res.status(500).json({
            error: 'Failed to get runner data',
            message: error.message
        });
    }
});

// Send cheer message
app.post('/api/runner/:runnerId/activity/:activityId/messages', async (req, res) => {
    try {
        const { runnerId, activityId } = req.params;
        const { sender, message, email, relationship } = req.body;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        if (!sender || !message) {
            return res.status(400).json({ error: 'Sender name and message are required' });
        }

        // Create cheer message
        const newCheer = new Cheer({
            activityId,
            from: {
                name: sanitizeInput(sender),
                ip: getClientIP(req)
            },
            message: sanitizeInput(message),
            createdAt: new Date()
        });

        await newCheer.save();

        // Notify connected clients
        io.to(`${runnerId}-${activityId}`).emit('new-message', {
            runnerId,
            activityId,
            message: {
                messageId: newCheer._id,
                sender: newCheer.from.name,
                message: newCheer.message,
                timestamp: newCheer.createdAt
            }
        });

        res.json({
            success: true,
            messageId: newCheer._id,
            sender: newCheer.from.name,
            message: newCheer.message,
            timestamp: newCheer.createdAt,
            runnerId,
            activityId,
            platform: 'imrunning.live'
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            error: 'Failed to send message',
            message: error.message
        });
    }
});

// Get messages for runner
app.get('/api/runner/:runnerId/activity/:activityId/messages', async (req, res) => {
    try {
        const { runnerId, activityId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const messages = await Cheer.find(
            { activityId },
            { from: 1, message: 1, createdAt: 1 }
        )
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

        // Transform to match expected format
        const formattedMessages = messages.map(msg => ({
            messageId: msg._id,
            sender: msg.from.name,
            message: msg.message,
            messageType: 'cheer',
            createdAt: msg.createdAt
        }));

        res.json(formattedMessages);

    } catch (error) {
        console.error('❌ Error getting messages:', error);
        res.status(500).json({
            error: 'Failed to get messages',
            message: error.message
        });
    }
});

// Mark message as announced (for mobile app)
app.post('/api/runner/:runnerId/activity/:activityId/messages/:messageId/announce', async (req, res) => {
    try {
        const { runnerId, activityId, messageId } = req.params;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const message = await Cheer.findOneAndUpdate(
            { _id: messageId, activityId },
            { 
                deliveredAt: new Date()
            },
            { new: true }
        );

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json({
            success: true,
            message: 'Message marked as announced',
            messageId: message.messageId
        });

    } catch (error) {
        console.error('❌ Error marking message as announced:', error);
        res.status(500).json({
            error: 'Failed to mark message as announced',
            message: error.message
        });
    }
});

// Get unannounced messages for mobile app
app.get('/api/runner/:runnerId/activity/:activityId/messages/unannounced', async (req, res) => {
    try {
        const { runnerId, activityId } = req.params;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const messages = await Cheer.find(
            { activityId, deliveredAt: { $exists: false } },
            { from: 1, message: 1, createdAt: 1 }
        )
        .sort({ createdAt: 1 })
        .limit(10);

        res.json(messages);

    } catch (error) {
        console.error('❌ Error getting unannounced messages:', error);
        res.status(500).json({
            error: 'Failed to get unannounced messages',
            message: error.message
        });
    }
});

// Serve individual runner tracking pages
app.get('/runner/:runnerId/:activityId', (req, res) => {
    const { runnerId, activityId } = req.params;
    
    if (!validateId(runnerId) || !validateId(activityId)) {
        return res.redirect('/');
    }

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Live Tracking - I'm Running Live</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .btn { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 10px; margin: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🏃‍♂️ Live Tracking</h1>
            <p>Tracking page for runner: ${runnerId}</p>
            <p>Activity: ${activityId}</p>
            <a href="/${runnerId}/${activityId}" class="btn">View Live Map</a>
            <a href="/" class="btn">← Back to I'm Running Live</a>
        </div>
    </body>
    </html>
    `);
});

// Serve live map for specific runner/activity
app.get('/:userId/:activityId', (req, res) => {
    const { userId, activityId } = req.params;

    console.log(`📍 Live map requested for User: ${userId}, Activity: ${activityId}`);
    console.log(`🔍 Validating IDs - User: ${validateId(userId)}, Activity: ${validateId(activityId)}`);

    if (!validateId(userId) || !validateId(activityId)) {
        console.log(`❌ Invalid ID format - User: ${userId}, Activity: ${activityId}`);
        console.log(`📝 Expected format: usr_XXXXXXXX or act_XXXXXXXX`);
        return res.redirect('/');
    }

    console.log(`✅ Valid IDs, serving live map`);
    res.sendFile(path.join(__dirname, 'public', 'livemap.html'));
});

// 404 handler for unknown routes
app.get('*', (req, res) => {
    res.status(404).json({
        error: 'Page not found',
        message: 'The requested page does not exist',
        platform: 'imrunning.live',
        availableEndpoints: [
            'GET /',
            'GET /api/test',
            'GET /api/health',
            'POST /api/runners',
            'POST /api/runner/:id/activity/:id/start',
            'POST /api/runner/:id/activity/:id/location',
            'GET /runner/:id/:activity',
            'GET /:userId/:activityId'
        ]
    });
});

// Export the startServer function for external use
module.exports = {
    startServer,
    app,
    server,
    io
};