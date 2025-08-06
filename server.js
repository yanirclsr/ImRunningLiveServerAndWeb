const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add some branding headers
app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'I\'m Running Live');
    next();
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
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        service: 'I\'m Running Live API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Update runner title (for mobile app)
app.post('/api/runner/:runnerId/title', (req, res) => {
    const { runnerId } = req.params;
    const { title } = req.body;

    console.log(`📱 Title update for ${runnerId}: ${title}`);

    // TODO: Store in database
    res.json({
        success: true,
        runnerId,
        title,
        timestamp: new Date().toISOString(),
        platform: 'imrunning.live'
    });
});

// Get runner data
app.get('/api/runner/:runnerId/activity/:activityId', (req, res) => {
    const { runnerId, activityId } = req.params;

    console.log(`📍 Location request for runner: ${runnerId}, activity: ${activityId}`);

    // TODO: Get from database
    // For now, return mock data
    res.json({
        runnerId,
        activityId,
        location: {
            lat: 52.5163 + (Math.random() - 0.5) * 0.01,
            lng: 13.3777 + (Math.random() - 0.5) * 0.01
        },
        stats: {
            distance: Math.random() * 42.2,
            pace: `${4 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            heartRate: 140 + Math.floor(Math.random() * 40)
        },
        raceStartTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'running',
        platform: 'imrunning.live'
    });
});

// Send cheer message
app.post('/api/runner/:runnerId/activity/:activityId/messages', (req, res) => {
    const { runnerId, activityId } = req.params;
    const { sender, message } = req.body;

    console.log(`💬 New cheer for ${runnerId}: ${sender} says "${message}"`);

    // TODO: Store in database and notify mobile app
    res.json({
        success: true,
        messageId: Date.now().toString(),
        sender,
        message,
        timestamp: new Date().toISOString(),
        runnerId,
        activityId,
        platform: 'imrunning.live'
    });
});

// Get messages for runner
app.get('/api/runner/:runnerId/activity/:activityId/messages', (req, res) => {
    const { runnerId, activityId } = req.params;

    // TODO: Get from database
    // For now, return mock messages
    const mockMessages = [
        {
            sender: 'Rachel',
            message: 'Go Yanir! You\'re crushing it! 🔥',
            timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
            sender: 'Dad',
            message: 'So proud of you! Keep that pace!',
            timestamp: new Date(Date.now() - 180000).toISOString()
        },
        {
            sender: 'Team Berlin',
            message: 'Berlin loves you! Amazing run! 🇩🇪❤️',
            timestamp: new Date(Date.now() - 60000).toISOString()
        }
    ];

    res.json(mockMessages);
});

// Serve individual runner tracking pages
app.get('/runner/:runnerId/:activityId', (req, res) => {
    // This will serve your runner tracking page (the one we created earlier)
    // For now, redirect to a simple message
    res.send(`
    <h1>🏃‍♂️ Live Tracking</h1>
    <p>Tracking page for runner: ${req.params.runnerId}</p>
    <p>Activity: ${req.params.activityId}</p>
    <p><a href="/">← Back to I'm Running Live</a></p>
  `);
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
            'GET /runner/:id/:activity'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏃‍♂️ I'm Running Live API is running on port ${PORT}`);
    console.log(`🌐 Platform: imrunning.live`);
    console.log(`📍 Homepage: http://localhost:${PORT}/`);
    console.log(`🔧 API Test: http://localhost:${PORT}/api/test`);
    console.log(`💚 Health Check: http://localhost:${PORT}/api/health`);
});