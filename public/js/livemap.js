// I'm Running Live - Live Map JavaScript
class LiveTracker {
    constructor() {
        // Extract IDs from URL
        const pathParts = window.location.pathname.split('/').filter(part => part);
        this.userId = pathParts[0];
        this.activityId = pathParts[1];

        // Configuration
        this.API_BASE_URL = window.location.origin;
        this.UPDATE_INTERVAL = 10000; // 10 seconds
        this.MESSAGE_CHECK_INTERVAL = 30000; // 30 seconds

        // State
        this.map = null;
        this.runnerMarker = null;
        this.routePath = [];
        this.raceStartTime = null;
        this.isOnline = false;
        this.updateTimer = null;
        this.messageTimer = null;
        this.stats = {
            distance: 0,
            pace: '--:--',
            heartRate: 0,
            currentTime: '--:--:--',
            remaining: 42.2
        };

        // Milestones for marathon
        this.milestones = [
            { distance: 5, name: '5K', element: 'milestone-5', timeElement: 'time-5' },
            { distance: 10, name: '10K', element: 'milestone-10', timeElement: 'time-10' },
            { distance: 21.1, name: 'Half', element: 'milestone-21', timeElement: 'time-21' },
            { distance: 30, name: '30K', element: 'milestone-30', timeElement: 'time-30' },
            { distance: 42.2, name: 'Finish', element: 'milestone-42', timeElement: 'time-42' }
        ];

        this.init();
    }

    async init() {
        console.log(`🏃‍♂️ Initializing live tracker for User: ${this.userId}, Activity: ${this.activityId}`);

        // Validate IDs
        if (!this.validateIds()) {
            this.redirectToHome();
            return;
        }

        // Show loading screen briefly
        await this.showLoadingScreen();

        // Initialize components
        this.initializeMap();
        this.bindEvents();
        this.startDataFetching();

        // Hide loading screen
        this.hideLoadingScreen();

        console.log('✅ Live tracker initialized successfully');
    }

    validateIds() {
        const idPattern = /^[a-zA-Z0-9]{20}$/;
        return idPattern.test(this.userId) && idPattern.test(this.activityId);
    }

    redirectToHome() {
        console.warn('❌ Invalid ID format, redirecting to home');
        window.location.href = '/';
    }

    async showLoadingScreen() {
        const progress = document.querySelector('.loading-progress');
        let width = 0;

        const interval = setInterval(() => {
            width += Math.random() * 15 + 5;
            if (width > 100) width = 100;
            progress.style.width = width + '%';

            if (width >= 100) {
                clearInterval(interval);
            }
        }, 100);

        // Wait minimum 2 seconds for loading experience
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.add('hidden');

        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    initializeMap() {
        // Initialize map centered on Berlin (will update with actual location)
        this.map = L.map('map').setView([52.5163, 13.3777], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Custom runner icon
        const runnerIcon = L.divIcon({
            className: 'runner-marker',
            html: '🏃‍♂️',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Initialize runner marker
        this.runnerMarker = L.marker([52.5163, 13.3777], {
            icon: runnerIcon
        }).addTo(this.map);

        this.runnerMarker.bindPopup('<b>Runner Location</b><br>Connecting...').openPopup();

        console.log('🗺️ Map initialized');
    }

    bindEvents() {
        // Message form
        const messageForm = document.getElementById('messageForm');
        messageForm.addEventListener('submit', (e) => this.handleMessageSubmit(e));

        // Character counter
        const messageInput = document.getElementById('message');
        const charCount = document.getElementById('charCount');
        messageInput.addEventListener('input', () => {
            charCount.textContent = messageInput.value.length;
        });

        // Map controls
        document.getElementById('centerMapBtn').addEventListener('click', () => this.centerMap());
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => this.copyShareLink());

        console.log('🔗 Event listeners bound');
    }

    startDataFetching() {
        // Initial fetch
        this.fetchRunnerData();
        this.fetchMessages();

        // Set up intervals
        this.updateTimer = setInterval(() => {
            this.fetchRunnerData();
        }, this.UPDATE_INTERVAL);

        this.messageTimer = setInterval(() => {
            this.fetchMessages();
        }, this.MESSAGE_CHECK_INTERVAL);

        // Update race time every second
        setInterval(() => {
            this.updateRaceTime();
        }, 1000);

        console.log('⏰ Data fetching started');
    }

    async fetchRunnerData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/runner/${this.userId}/activity/${this.activityId}`);

            if (response.ok) {
                const data = await response.json();
                this.updateRunnerData(data);
                this.updateConnectionStatus('online', 'Live Tracking');
                this.isOnline = true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to fetch runner data:', error);
            this.updateConnectionStatus('offline', 'Connection Lost');
            this.isOnline = false;
        }

        this.updateLastUpdateTime();
    }

    updateRunnerData(data) {
        // Update location
        if (data.location) {
            this.updateRunnerLocation(data.location.lat, data.location.lng);
        }

        // Update stats
        if (data.stats) {
            this.updateStats(data.stats);
        }

        // Update race start time
        if (data.raceStartTime && !this.raceStartTime) {
            this.raceStartTime = new Date(data.raceStartTime);
            console.log('🏁 Race start time set:', this.raceStartTime);
        }

        // Update title if provided
        if (data.title) {
            document.getElementById('runnerTitle').textContent = data.title;
        }
    }

    updateRunnerLocation(lat, lng) {
        const newPos = [lat, lng];

        // Update marker position
        this.runnerMarker.setLatLng(newPos);

        // Update popup with current location name (you can enhance this with reverse geocoding)
        this.runnerMarker.getPopup().setContent(`
            <b>Current Location</b><br>
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}<br>
            <small>Last updated: ${new Date().toLocaleTimeString()}</small>
        `);

        // Add to route path
        this.routePath.push(newPos);

        // Draw route if more than one point
        if (this.routePath.length > 1) {
            if (this.routeLine) {
                this.map.removeLayer(this.routeLine);
            }
            this.routeLine = L.polyline(this.routePath, {
                color: '#667eea',
                weight: 4,
                opacity: 0.8
            }).addTo(this.map);
        }

        // Update location text
        document.getElementById('locationText').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        console.log(`📍 Location updated: ${lat}, ${lng}`);
    }

    updateStats(stats) {
        // Animate stat updates
        const statElements = ['distance', 'pace', 'heartRate'];

        statElements.forEach(stat => {
            const element = document.getElementById(stat);
            if (stats[stat] !== undefined && element) {
                // Add animation class
                element.classList.add('stat-updating');
                setTimeout(() => element.classList.remove('stat-updating'), 500);

                // Update value
                if (stat === 'distance') {
                    element.textContent = parseFloat(stats[stat]).toFixed(1);
                    // Update remaining distance
                    const remaining = Math.max(0, 42.2 - parseFloat(stats[stat]));
                    document.getElementById('remaining').textContent = remaining.toFixed(1);
                    // Update progress
                    this.updateProgress(parseFloat(stats[stat]));
                } else {
                    element.textContent = stats[stat];
                }
            }
        });

        // Store stats
        this.stats = { ...this.stats, ...stats };

        // Update milestones
        this.updateMilestones();
    }

    updateProgress(distance) {
        const percentage = Math.min(100, (distance / 42.2) * 100);
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');

        progressFill.style.width = percentage + '%';
        progressPercent.textContent = percentage.toFixed(1) + '%';
    }

    updateMilestones() {
        const currentDistance = parseFloat(this.stats.distance) || 0;

        this.milestones.forEach(milestone => {
            const statusElement = document.getElementById(milestone.element);
            const timeElement = document.getElementById(milestone.timeElement);

            if (currentDistance >= milestone.distance) {
                statusElement.textContent = 'Completed';
                statusElement.className = 'milestone-status completed';
                // You can add actual completion time here
                timeElement.textContent = this.stats.currentTime || '--:--';
            } else if (currentDistance >= milestone.distance - 1) {
                statusElement.textContent = 'Approaching';
                statusElement.className = 'milestone-status current';
            } else {
                statusElement.textContent = 'Upcoming';
                statusElement.className = 'milestone-status upcoming';
            }
        });
    }

    updateRaceTime() {
        if (!this.raceStartTime) return;

        const elapsed = Math.floor((Date.now() - this.raceStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;

        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('currentTime').textContent = timeString;
        this.stats.currentTime = timeString;
    }

    updateConnectionStatus(status, message) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        statusDot.className = `status-dot ${status}`;
        statusText.textContent = message;
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('lastUpdate').textContent = timeString;
    }

    async fetchMessages() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/runner/${this.userId}/activity/${this.activityId}/messages`);

            if (response.ok) {
                const messages = await response.json();
                this.displayMessages(messages);
            }
        } catch (error) {
            console.error('❌ Failed to fetch messages:', error);
        }
    }

    displayMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        const messageCount = document.getElementById('messageCount');

        if (messages.length === 0) {
            messagesList.innerHTML = '<div class="loading-messages">No messages yet. Be the first to send encouragement!</div>';
            messageCount.textContent = '(0)';
            return;
        }

        messageCount.textContent = `(${messages.length})`;

        // Show recent messages (latest first)
        const recentMessages = messages.slice(-10).reverse();

        messagesList.innerHTML = recentMessages.map(msg => `
            <div class="message-item">
                <div class="message-sender">${this.escapeHtml(msg.sender || 'Anonymous')}</div>
                <div class="message-text">${this.escapeHtml(msg.message)}</div>
                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `).join('');

        // Scroll to top of messages
        messagesList.scrollTop = 0;
    }

    async handleMessageSubmit(e) {
        e.preventDefault();

        const senderName = document.getElementById('senderName').value.trim();
        const message = document.getElementById('message').value.trim();
        const sendBtn = document.getElementById('sendBtn');
        const messageStatus = document.getElementById('messageStatus');

        if (!senderName || !message) return;

        // Show loading state
        sendBtn.disabled = true;
        sendBtn.classList.add('loading');

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/runner/${this.userId}/activity/${this.activityId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: senderName,
                    message: message
                })
            });

            if (response.ok) {
                // Success
                document.getElementById('messageForm').reset();
                document.getElementById('charCount').textContent = '0';
                this.showMessageStatus('success', '✅ Message sent! The runner will hear it soon.');

                // Refresh messages
                setTimeout(() => this.fetchMessages(), 1000);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.showMessageStatus('error', '❌ Failed to send message. Please try again.');
        }

        // Reset button
        sendBtn.disabled = false;
        sendBtn.classList.remove('loading');
    }

    showMessageStatus(type, message) {
        const statusElement = document.getElementById('messageStatus');
        statusElement.className = `message-status ${type}`;
        statusElement.textContent = message;
        statusElement.style.display = 'block';

        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    centerMap() {
        if (this.runnerMarker) {
            this.map.setView(this.runnerMarker.getLatLng(), 15);
        }
    }

    toggleFullscreen() {
        const mapContainer = document.querySelector('.map-container');

        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().then(() => {
                // Resize map after fullscreen
                setTimeout(() => this.map.invalidateSize(), 100);
            });
        } else {
            document.exitFullscreen();
        }
    }

    copyShareLink() {
        const currentUrl = window.location.href;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(currentUrl).then(() => {
                this.showTemporaryFeedback('📋 Link copied to clipboard!');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = currentUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showTemporaryFeedback('📋 Link copied!');
        }
    }

    showTemporaryFeedback(message) {
        const shareBtn = document.getElementById('shareBtn');
        const originalText = shareBtn.textContent;

        shareBtn.textContent = message;
        setTimeout(() => {
            shareBtn.textContent = originalText;
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Clean up timers and resources
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.messageTimer) clearInterval(this.messageTimer);

        console.log('🧹 Live tracker destroyed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.liveTracker = new LiveTracker();
});

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
    if (window.liveTracker) {
        window.liveTracker.destroy();
    }
});

// Add some global error handling
window.addEventListener('error', (e) => {
    console.error('🚨 JavaScript Error:', e.error);
});

// Add visibility change handling to pause/resume updates when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (window.liveTracker) {
        if (document.hidden) {
            console.log('📴 Tab hidden, pausing updates');
            // Could pause updates here to save resources
        } else {
            console.log('📱 Tab visible, resuming updates');
            // Resume updates and fetch latest data
            window.liveTracker.fetchRunnerData();
            window.liveTracker.fetchMessages();
        }
    }
});