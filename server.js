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
        const { startLocation } = req.body;

        if (!validateId(runnerId) || !validateId(activityId)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        // Update activity status
        const activity = await Activity.findOneAndUpdate(
            { runnerId, activityId },
            { 
                status: 'active',
                startTime: new Date()
            },
            { new: true }
        );

        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        // Save initial location if provided
        if (startLocation && startLocation.lat && startLocation.lng) {
            const location = new Location({
                activityId,
                runnerId,
                timestamp: new Date(),
                coordinates: {
                    type: 'Point',
                    coordinates: [startLocation.lng, startLocation.lat]
                },
                accuracy: startLocation.accuracy || 10,
                distance: 0
            });
            await location.save();
        }

        // Notify connected clients
        io.to(`${runnerId}-${activityId}`).emit('activity-started', {
            runnerId,
            activityId,
            startTime: activity.startTime
        });

        res.json({
            success: true,
            message: 'Activity started successfully',
            startTime: activity.startTime
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
        const previousLocation = await Location.findOne(
            { activityId, runnerId },
            {},
            { sort: { timestamp: -1 } }
        );

        let cumulativeDistance = 0;
        if (previousLocation) {
            const prevCoords = previousLocation.coordinates.coordinates;
            const distance = calculateDistance(
                prevCoords[1], prevCoords[0], // lat, lng
                lat, lng
            );
            cumulativeDistance = previousLocation.distance + distance;
        }

        // Create new location record
        const location = new Location({
            activityId,
            runnerId,
            timestamp: new Date(),
            coordinates: {
                type: 'Point',
                coordinates: [lng, lat] // MongoDB expects [lng, lat]
            },
            accuracy: accuracy || 10,
            altitude,
            speed,
            heading,
            distance: cumulativeDistance,
            heartRate,
            cadence,
            temperature,
            humidity
        });

        await location.save();

        // Update race stats
        const activity = await Activity.findOne({ runnerId, activityId });
        if (activity && activity.startTime) {
            const elapsedTime = Math.floor((Date.now() - activity.startTime) / 1000);
            const currentPace = calculatePace(elapsedTime, cumulativeDistance);
            
            await RaceStats.findOneAndUpdate(
                { activityId, runnerId },
                {
                    'currentStats.distance': cumulativeDistance,
                    'currentStats.elapsedTime': elapsedTime,
                    'currentStats.currentPace': currentPace,
                    'currentStats.remainingDistance': Math.max(0, 42.2 - cumulativeDistance),
                    'currentStats.heartRate.current': heartRate,
                    lastUpdated: new Date()
                },
                { upsert: true }
            );
        }

        // Notify connected clients
        io.to(`${runnerId}-${activityId}`).emit('location-update', {
            runnerId,
            activityId,
            location: {
                lat,
                lng,
                distance: cumulativeDistance,
                timestamp: location.timestamp
            }
        });

        res.json({
            success: true,
            message: 'Location updated successfully',
            distance: cumulativeDistance,
            timestamp: location.timestamp
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

        // Get activity and runner info
        const [activity, runner, raceStats, latestLocation] = await Promise.all([
            Activity.findOne({ runnerId, activityId }),
            Runner.findOne({ runnerId }),
            RaceStats.findOne({ activityId, runnerId }),
            Location.findOne(
                { activityId, runnerId },
                {},
                { sort: { timestamp: -1 } }
            )
        ]);

        if (!activity || !runner) {
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

        if (activity.startTime && latestLocation) {
            const elapsedTime = Math.floor((Date.now() - activity.startTime) / 1000);
            currentStats = {
                distance: latestLocation.distance || 0,
                pace: calculatePace(elapsedTime, latestLocation.distance || 0),
                heartRate: latestLocation.heartRate || 0,
                currentTime: formatTime(elapsedTime),
                remaining: Math.max(0, 42.2 - (latestLocation.distance || 0))
            };
        }

        res.json({
            runnerId,
            activityId,
            runner: {
                name: runner.name,
                city: runner.profile?.city,
                country: runner.profile?.country
            },
            activity: {
                raceName: activity.raceName,
                raceDate: activity.raceDate,
                status: activity.status,
                startTime: activity.startTime,
                targetTime: activity.targetTime
            },
            currentStats,
            lastLocation: latestLocation ? {
                lat: latestLocation.coordinates.coordinates[1],
                lng: latestLocation.coordinates.coordinates[0],
                timestamp: latestLocation.timestamp
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

        // Create message
        const newMessage = new Message({
            messageId: generateUniqueId(),
            activityId,
            runnerId,
            sender: {
                name: sanitizeInput(sender),
                email: email ? sanitizeInput(email) : undefined,
                relationship: relationship || 'supporter'
            },
            message: sanitizeInput(message),
            messageType: 'cheer'
        });

        await newMessage.save();

        // Notify connected clients
        io.to(`${runnerId}-${activityId}`).emit('new-message', {
            runnerId,
            activityId,
            message: {
                messageId: newMessage.messageId,
                sender: newMessage.sender.name,
                message: newMessage.message,
                timestamp: newMessage.createdAt
            }
        });

        res.json({
            success: true,
            messageId: newMessage.messageId,
            sender: newMessage.sender.name,
            message: newMessage.message,
            timestamp: newMessage.createdAt,
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

        const messages = await Message.find(
            { activityId, runnerId },
            { sender: 1, message: 1, messageType: 1, createdAt: 1 }
        )
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(offset));

        res.json(messages);

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

        const message = await Message.findOneAndUpdate(
            { messageId, activityId, runnerId },
            { 
                isAnnounced: true,
                announcedAt: new Date()
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

        const messages = await Message.find(
            { activityId, runnerId, isAnnounced: false },
            { sender: 1, message: 1, messageType: 1, createdAt: 1 }
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

    if (!validateId(userId) || !validateId(activityId)) {
        console.log(`Invalid ID format - User: ${userId}, Activity: ${activityId}`);
        return res.redirect('/');
    }

    console.log(`📍 Live map requested for User: ${userId}, Activity: ${activityId}`);
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