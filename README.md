# 🏃‍♂️ I'm Running Live - Marathon Tracking Platform

A real-time marathon tracking system that connects runners with their supporters through live GPS tracking, instant statistics, and voice-activated cheer messages.

## 🌟 Features

- **Real-time GPS Tracking**: Location updates every 10 seconds during races
- **Live Statistics**: Current pace, distance, heart rate, and estimated finish time
- **Interactive Map**: Beautiful map interface with real-time runner location and route
- **Voice Messages**: Supporters' cheers are instantly converted to speech and played through the runner's phone
- **Mobile App Simulator**: Test the tracking system before race day
- **Public Tracking Pages**: Unique URLs for each runner that friends and family can access
- **Socket.IO Integration**: Real-time updates without page refresh

## 🏗️ System Architecture

### 1. Web Frontend (`/public/`)
- **Homepage** (`index.html`): Main landing page with platform information
- **Setup Page** (`setup.html`): Create runner profiles and get tracking IDs
- **Live Map** (`livemap.html`): Real-time tracking interface for supporters
- **Mobile App Simulator** (`mobile-app.html`): Simulate the iOS app functionality

### 2. Backend API (`/server.js`)
- **Express.js Server**: RESTful API endpoints for all tracking functionality
- **Socket.IO**: Real-time communication for live updates
- **MongoDB Integration**: Data persistence with Mongoose ODM

### 3. Database (`/db/`)
- **MongoDB**: NoSQL database for scalable data storage
- **Mongoose Models**: Structured data schemas for runners, activities, locations, and messages
- **Geospatial Indexing**: Efficient location-based queries

### 4. Mobile App (Simulated)
- **Location Updates**: GPS coordinates sent every 10 seconds
- **Message Checking**: Retrieves new cheer messages every 30 seconds
- **Voice Announcements**: Simulates text-to-speech for incoming messages

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd imrunning.live
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   MONGODB_URI=mongodb://localhost:27017/imrunning
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Access the platform**
   - Homepage: http://localhost:3000
   - Setup: http://localhost:3000/setup.html
   - Mobile App Simulator: http://localhost:3000/mobile-app.html

## 📱 Usage Guide

### For Runners

1. **Create Your Profile**
   - Visit `/setup.html`
   - Fill out your personal and race information
   - Get your unique Runner ID and Activity ID
   - Receive your public tracking URL

2. **On Race Day**
   - Use the mobile app simulator or actual iOS app
   - Enter your Runner ID and Activity ID
   - Start your race to begin location tracking
   - Receive voice announcements of supporter messages

### For Supporters

1. **Track Your Runner**
   - Use the tracking URL shared by the runner
   - View real-time location on the interactive map
   - Monitor live statistics (pace, distance, heart rate)
   - Send encouraging messages

2. **Send Cheer Messages**
   - Enter your name in the cheer interface
   - Choose from pre-written messages or type your own
   - Messages are instantly delivered to the runner

## 🔧 API Endpoints

### Runner Management
- `POST /api/runners` - Create new runner and activity
- `GET /api/runner/:id/activity/:id` - Get runner data and current stats

### Race Tracking
- `POST /api/runner/:id/activity/:id/start` - Start race tracking
- `POST /api/runner/:id/activity/:id/location` - Update runner location

### Messaging
- `POST /api/runner/:id/activity/:id/messages` - Send cheer message
- `GET /api/runner/:id/activity/:id/messages` - Get messages for runner
- `GET /api/runner/:id/activity/:id/messages/unannounced` - Get unannounced messages
- `POST /api/runner/:id/activity/:id/messages/:id/announce` - Mark message as announced

### Public Pages
- `GET /:userId/:activityId` - Live tracking page
- `GET /runner/:id/:activity` - Runner info page

## 🗄️ Database Schema

### Runner
- Unique 20-character ID
- Personal information (name, email, phone)
- Profile details (age, city, country)
- Preferences (update frequency, voice announcements)

### Activity
- Unique 20-character ID
- Race information (name, date, type)
- Status (planned, active, paused, completed)
- Start/end times and target finish time

### Location
- GPS coordinates with timestamp
- Distance, pace, heart rate, speed
- Geospatial indexing for efficient queries

### Message
- Cheer messages from supporters
- Sender information and relationship
- Read/announced status tracking

### RaceStats
- Aggregated statistics during the race
- Current pace, average pace, splits
- Estimated finish time calculations

## 🌐 Deployment

### Local Development
```bash
npm run dev
```

### Production (Render)
1. Connect your GitHub repository to Render
2. Set environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `NODE_ENV`: production
3. Deploy automatically on push to main branch

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## 🧪 Testing

### Manual Testing
1. **Setup Flow**: Create a runner profile
2. **Mobile App**: Simulate race tracking
3. **Live Map**: View tracking from supporter perspective
4. **Messaging**: Send and receive cheer messages

### API Testing
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Create runner
curl -X POST http://localhost:3000/api/runners \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Runner","raceName":"Berlin Marathon 2025","raceDate":"2025-09-21"}'
```

## 🔒 Security Features

- **Input Sanitization**: XSS protection for user inputs
- **ID Validation**: 20-character alphanumeric ID format
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: Built-in Express.js protection

## 📱 Mobile App Features

### iOS App (Simulated)
- **Location Services**: GPS tracking with configurable frequency
- **Background Updates**: Continuous location reporting during races
- **Message Retrieval**: Periodic checking for new supporter messages
- **Voice Announcements**: Text-to-speech for incoming messages
- **Offline Support**: Local storage of tracking data

### Key Functions
- Connect to tracking system using Runner/Activity IDs
- Start/stop race tracking
- Real-time location updates
- Voice message announcements
- Race statistics monitoring

## 🚧 Future Enhancements

- [ ] Native iOS app development
- [ ] Android app support
- [ ] Advanced analytics and insights
- [ ] Integration with major race events
- [ ] Social media sharing
- [ ] Photo/video updates during races
- [ ] Team tracking for relay events
- [ ] Weather integration
- [ ] Emergency contact notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support or questions:
- Check the API documentation
- Review the mobile app simulator
- Test with the setup page
- Monitor server logs for debugging

## 🏁 Berlin Marathon 2025

This platform is specifically designed for the Berlin Marathon 2025 (September 21, 2025). The system includes:

- Berlin-specific location validation
- Marathon distance calculations (42.2 km)
- German timezone support
- Localized messaging and UI

---

**Built with ❤️ for runners and their supporters worldwide**
