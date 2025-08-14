// I'm Running Live - Live Map JavaScript
class LiveTracker {
    constructor() {
        // Extract IDs from URL
        const pathParts = window.location.pathname.split('/').filter(part => part);
        this.userId = pathParts[0];
        this.activityId = pathParts[1];

        // Configuration
        this.API_BASE_URL = window.location.origin;
        this.UPDATE_INTERVAL = 15000; // 15 seconds (delay)
        this.ANIMATION_DURATION = 10000; // 10 seconds (smooth movement)
        this.MESSAGE_CHECK_INTERVAL = 30000; // 30 seconds
        
        // Load saved visitor name from localStorage
        this.loadSavedVisitorName();

        // State
        this.map = null;
        this.runnerMarker = null;
        this.routePath = [];
        this.raceStartTime = null;
        this.isOnline = false;
        this.updateTimer = null;
        this.messageTimer = null;
        this.socket = null;
        this.stats = {
            distance: 0,
            pace: '0:00',
            heartRate: 0,
            currentTime: '00:00:00',
            remaining: 42.2
        };

        this.init();
    }

    async init() {
        console.log(`🏃‍♂️ Initializing live tracker for User: ${this.userId}, Activity: ${this.activityId}`);

        // Validate IDs
        console.log(`🔍 Validating IDs - User: ${this.userId}, Activity: ${this.activityId}`);
        if (!this.validateIds()) {
            console.error(`❌ ID validation failed for User: ${this.userId}, Activity: ${this.activityId}`);
            this.redirectToHome();
            return;
        }
        console.log(`✅ ID validation passed`);

        try {
            // Show loading screen briefly
            await this.showLoadingScreen();

            // Initialize components
            this.initializeMap();
            this.initializeSocketIO();
            this.bindEvents();

            // Load initial data
            await this.loadInitialData();

            // Hide loading screen
            this.hideLoadingScreen();

            console.log('✅ Live tracker initialized successfully');
        } catch (error) {
            console.error('❌ Error during initialization:', error);
            // Force hide loading screen even if there's an error
            this.hideLoadingScreen();
            this.showError('Failed to load tracking data. Please refresh the page.');
        }
    }

    validateIds() {
        // Support both old 20-char format and new shorter format
        const oldPattern = /^[a-zA-Z0-9]{20}$/;
        const newPattern = /^(usr|act|evt)_[a-zA-Z0-9]{8}$/;
        
        const isValidOld = oldPattern.test(this.userId) && oldPattern.test(this.activityId);
        const isValidNew = newPattern.test(this.userId) && newPattern.test(this.activityId);
        
        return isValidOld || isValidNew;
    }

    redirectToHome() {
        console.warn('❌ Invalid ID format, redirecting to home');
        window.location.href = '/';
    }

    async showLoadingScreen() {
        const progress = document.querySelector('.loading-progress');
        if (!progress) {
            console.warn('Loading progress element not found');
            return;
        }

        let width = 0;

        const interval = setInterval(() => {
            width += Math.random() * 15 + 5;
            if (width > 100) width = 100;
            progress.style.width = width + '%';

            if (width >= 100) {
                clearInterval(interval);
            }
        }, 100);

        // Wait minimum 1 second for loading experience
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');

            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        } else {
            console.warn('Loading screen element not found');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            text-align: center; z-index: 10000; max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h2>⚠️ Error</h2>
            <p>${message}</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                Reload Page
            </button>
        `;
        document.body.appendChild(errorDiv);
    }

    initializeMap() {
        // Initialize map centered on Berlin (will update with actual location)
        this.map = L.map('map', {
            zoomControl: false // Remove default zoom controls since we have custom ones
        }).setView([52.5163, 13.3777], 13);

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

        this.runnerMarker.bindPopup('<b>Runner\'s Location</b><br>Loading position...').openPopup();

        // Add zoom event handler to ensure runner stays centered
        this.map.on('zoomend', () => {
            if (this.runnerMarker) {
                const runnerPos = this.runnerMarker.getLatLng();
                this.ensureRunnerVisible(runnerPos);
            }
        });

        // Add pan event handler to ensure runner stays visible
        this.map.on('moveend', () => {
            if (this.runnerMarker) {
                const runnerPos = this.runnerMarker.getLatLng();
                this.ensureRunnerVisible(runnerPos);
            }
        });

        console.log('🗺️ Map initialized');
    }

    initializeSocketIO() {
        try {
            // Check if Socket.IO is available
            if (typeof io === 'undefined') {
                console.warn('⚠️ Socket.IO not available, real-time updates disabled');
                this.socket = null;
                return;
            }

            // Connect to Socket.IO server
            this.socket = io();

            // Join tracking room
            this.socket.emit('join-tracking', {
                runnerId: this.userId,
                activityId: this.activityId
            });

            // Listen for real-time updates
            this.socket.on('location-update', (data) => {
                console.log('📍 Real-time location update:', data);
                this.updateRunnerLocation(data.location.lat, data.location.lng, data.location.distance);
                this.updateStats({
                    distance: data.location.distance,
                    remaining: Math.max(0, 42.2 - data.location.distance)
                });
            });

            this.socket.on('new-message', (data) => {
                console.log('💬 New message received:', data);
                this.addNewMessage(data.message);
            });

            this.socket.on('activity-started', (data) => {
                console.log('🏁 Activity started:', data);
                this.raceStartTime = new Date(data.startTime);
                this.updateConnectionStatus('online', 'Live Tracking');
                this.isOnline = true;
            });

            console.log('🔌 Socket.IO initialized');
        } catch (error) {
            console.warn('⚠️ Socket.IO initialization failed:', error);
            this.socket = null;
        }
    }

    async loadInitialData() {
        try {
            console.log(`🔍 Fetching data from: ${this.API_BASE_URL}/api/runner/${this.userId}/activity/${this.activityId}`);
            
            // Load runner data and current stats
            const response = await fetch(`${this.API_BASE_URL}/api/runner/${this.userId}/activity/${this.activityId}`);
            
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Initial data loaded:', data);

            // Update runner title
            const runnerTitle = document.getElementById('runnerTitle');
            if (runnerTitle) {
                const eventName = data.event && data.event.name ? data.event.name : 'Custom Run';
                runnerTitle.textContent = `🏃‍♂️ ${data.runner.name}'s ${eventName}`;
                console.log(`🏷️ Updated title to: ${eventName}`);
            }

            // Set race start time if available
            if (data.activity.startTime) {
                this.raceStartTime = new Date(data.activity.startTime);
                this.updateConnectionStatus('online', 'Live Tracking');
                this.isOnline = true;
            } else {
                this.updateConnectionStatus('offline', 'Not Started');
                this.isOnline = false;
            }

            // Update stats
            this.updateStats(data.currentStats);

            // Update runner location if available
            console.log(`🗺️ Location data:`, { 
                lastLocation: data.lastLocation, 
                eventLocation: data.event?.location,
                currentStats: data.currentStats 
            });
            
            if (data.lastLocation) {
                console.log(`🗺️ Using last location: ${data.lastLocation.lat}, ${data.lastLocation.lng}`);
                this.updateRunnerLocation(data.lastLocation.lat, data.lastLocation.lng, data.currentStats.distance);
            } else if (data.event && data.event.location && data.event.location.coordinates) {
                // If no last location, use event location but prefer user's actual location
                const coords = data.event.location.coordinates.coordinates;
                if (coords && coords.length === 2) {
                    console.log(`🗺️ Using event location as fallback: ${coords[1]}, ${coords[0]}`);
                    this.updateRunnerLocation(coords[1], coords[0], 0);
                }
            } else {
                console.log(`⚠️ No location data available - map will show default location`);
            }

            // Load messages
            await this.loadMessages();

            // Start race time updates if race is active
            if (this.raceStartTime) {
                this.startRaceTimeUpdates();
            }

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            throw error;
        }
    }

    async loadMessages() {
        try {
            console.log(`🔍 Loading messages for activity: ${this.activityId}`);
            const response = await fetch(`${this.API_BASE_URL}/api/runner/${this.userId}/activity/${this.activityId}/messages?limit=20`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const messages = await response.json();
            console.log(`📨 Loaded ${messages.length} messages`);
            this.displayMessages(messages);

        } catch (error) {
            console.error('❌ Error loading messages:', error);
            // Don't throw here, just show empty messages
            console.log('📨 Showing empty messages due to error');
            this.displayMessages([]);
        }
    }

    bindEvents() {
        // Canned cheer buttons
        document.querySelectorAll('.cheer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCannedCheer(e));
        });

        // Name input validation and auto-save
        const nameInput = document.getElementById('senderName');
        nameInput.addEventListener('input', () => {
            this.validateCheerButtons();
            // Auto-save name to localStorage
            this.saveVisitorName(nameInput.value);
        });

        // Edit name button
        const editNameBtn = document.getElementById('editNameBtn');
        if (editNameBtn) {
            editNameBtn.addEventListener('click', () => {
                nameInput.focus();
                nameInput.select();
            });
        }

        // Cheer menu toggle
        const cheerTab = document.getElementById('cheerTab');
        if (cheerTab) {
            cheerTab.addEventListener('click', () => this.toggleCheerMenu());
        }

        // Map controls
        document.getElementById('centerMapBtn').addEventListener('click', () => this.centerMap());

        console.log('🔗 Event listeners bound');
    }

    loadSavedVisitorName() {
        const savedName = localStorage.getItem('imrunning_visitor_name');
        if (savedName) {
            const nameInput = document.getElementById('senderName');
            if (nameInput) {
                nameInput.value = savedName;
                this.validateCheerButtons();
            }
        }
    }

    saveVisitorName(name) {
        if (name && name.trim()) {
            localStorage.setItem('imrunning_visitor_name', name.trim());
        }
    }

    toggleCheerMenu() {
        const cheerMenu = document.getElementById('cheerMenu');
        const cheerTab = document.getElementById('cheerTab');
        
        if (cheerMenu && cheerTab) {
            const isClosed = cheerMenu.classList.contains('closed');
            
            if (isClosed) {
                // Open menu
                cheerMenu.classList.remove('closed');
                cheerTab.querySelector('span').textContent = 'Close';
                cheerTab.querySelector('.cheer-arrow').textContent = '〈';
            } else {
                // Close menu
                cheerMenu.classList.add('closed');
                cheerTab.querySelector('span').textContent = 'Open';
                cheerTab.querySelector('.cheer-arrow').textContent = '〉';
            }
        }
    }

    handleCannedCheer(e) {
        const senderName = document.getElementById('senderName').value.trim();

        if (!senderName) {
            this.showMessageStatus('error', '⚠️ Please enter your name first!');
            document.getElementById('senderName').focus();
            return;
        }

        const message = e.target.getAttribute('data-message');

        // Disable button temporarily
        e.target.disabled = true;
        const originalText = e.target.textContent;
        e.target.textContent = 'Sending...';

        this.sendCheerMessage(senderName, message).then(() => {
            // Reset button
            e.target.disabled = false;
            e.target.textContent = originalText;
        }).catch(() => {
            // Reset button on error
            e.target.disabled = false;
            e.target.textContent = originalText;
        });
    }

    validateCheerButtons() {
        const senderName = document.getElementById('senderName').value.trim();
        const cheerButtons = document.querySelectorAll('.cheer-btn');

        cheerButtons.forEach(btn => {
            if (senderName) {
                btn.style.opacity = '1';
                btn.disabled = false;
            } else {
                btn.style.opacity = '0.5';
                btn.disabled = true;
            }
        });
    }

    async sendCheerMessage(senderName, message) {
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
                this.showMessageStatus('success', '✅ Cheer sent! The runner will hear it soon.');

                // Message will be added via Socket.IO real-time update
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            this.showMessageStatus('error', '❌ Failed to send cheer. Please try again.');
            throw error;
        }
    }

    startRaceTimeUpdates() {
        // Update race time every second
        setInterval(() => {
            this.updateRaceTime();
        }, 1000);
    }

    updateRunnerLocation(lat, lng, distance) {
        const newPos = [lat, lng];

        // Update marker position with smooth animation
        if (this.runnerMarker) {
            this.runnerMarker.slideTo(newPos, {
                duration: this.ANIMATION_DURATION,
                keepAtCenter: false
            });
        } else {
            // Create runner marker if it doesn't exist
            this.runnerMarker = L.marker(newPos, {
                icon: L.divIcon({
                    className: 'runner-marker',
                    html: '🏃‍♂️',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                })
            }).addTo(this.map);
        }

        // Update popup with current location
        this.runnerMarker.getPopup().setContent(`
            <b>Runner's Location</b><br>
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}<br>
            Distance: ${distance.toFixed(1)} km<br>
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

        // Center map on runner with smooth animation
        this.map.panTo(newPos, { 
            animate: true, 
            duration: this.ANIMATION_DURATION / 1000 // Convert to seconds
        });
        
        // Ensure runner is always visible and centered
        this.ensureRunnerVisible(newPos);

        console.log(`📍 Location updated: ${lat}, ${lng}, Distance: ${distance} km`);
    }

    updateStats(stats) {
        // Animate stat updates
        const statElements = ['distance', 'pace', 'heartRate', 'remaining'];

        statElements.forEach(stat => {
            const element = document.getElementById(stat);
            if (stats[stat] !== undefined && element) {
                // Add animation class
                element.classList.add('stat-updating');
                setTimeout(() => element.classList.remove('stat-updating'), 500);

                // Update value
                if (stat === 'distance' || stat === 'remaining') {
                    element.textContent = parseFloat(stats[stat]).toFixed(1);
                } else {
                    element.textContent = stats[stat];
                }
            }
        });

        // Store stats
        this.stats = { ...this.stats, ...stats };
    }

    updateRaceTime() {
        if (!this.raceStartTime) return;

        const elapsed = Math.floor((Date.now() - this.raceStartTime) / 1000);
        const timeString = this.formatTime(elapsed);
        document.getElementById('currentTime').textContent = timeString;
        this.stats.currentTime = timeString;
    }

    formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateConnectionStatus(status, message) {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (statusDot && statusText) {
            statusDot.className = `status-dot ${status}`;
            statusText.textContent = message;
        }
    }

    displayMessages(messages) {
        const messagesList = document.getElementById('messagesList');
        const messageCount = document.getElementById('messageCount');

        if (!messagesList || !messageCount) return;

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
                <div class="message-sender">${this.preserveEmojis(msg.sender || 'Anonymous')}</div>
                <div class="message-text">${this.preserveEmojis(msg.message)}</div>
                <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
            </div>
        `).join('');

        // Scroll to top of messages
        messagesList.scrollTop = 0;
    }

    addNewMessage(message) {
        const messagesList = document.getElementById('messagesList');
        const messageCount = document.getElementById('messageCount');

        if (!messagesList || !messageCount) return;

        // Add new message at the top
        const newMsgHtml = `
            <div class="message-item" style="animation: messageSlideIn 0.3s ease;">
                <div class="message-sender">${this.preserveEmojis(message.sender)}</div>
                <div class="message-text">${this.preserveEmojis(message.message)}</div>
                <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
        messagesList.insertAdjacentHTML('afterbegin', newMsgHtml);

        // Update message count
        const currentCount = parseInt(messageCount.textContent.match(/\d+/)[0]) || 0;
        messageCount.textContent = `(${currentCount + 1})`;

        // Remove oldest message if we have more than 10
        const messageItems = messagesList.querySelectorAll('.message-item');
        if (messageItems.length > 10) {
            messageItems[messageItems.length - 1].remove();
        }
    }

    showMessageStatus(type, message) {
        const statusElement = document.getElementById('messageStatus');
        if (!statusElement) return;

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

    ensureRunnerVisible(runnerPosition) {
        // Get current map bounds
        const bounds = this.map.getBounds();
        const mapCenter = this.map.getCenter();
        
        // Check if runner is within current view
        const isRunnerVisible = bounds.contains(runnerPosition);
        
        if (!isRunnerVisible) {
            // Runner is outside current view, center map on runner
            console.log('🗺️ Runner outside view, centering map');
            this.map.setView(runnerPosition, this.map.getZoom(), {
                animate: true,
                duration: this.ANIMATION_DURATION / 1000
            });
        } else {
            // Runner is visible, but ensure it's reasonably centered
            const distanceFromCenter = mapCenter.distanceTo(runnerPosition);
            const maxDistance = 100; // meters
            
            if (distanceFromCenter > maxDistance) {
                console.log('🗺️ Runner far from center, recentering');
                this.map.panTo(runnerPosition, {
                    animate: true,
                    duration: 1.0
                });
            }
        }
    }
    
    preserveEmojis(text) {
        // Decode HTML entities while preserving emojis
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
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
        if (this.socket) {
            this.socket.emit('leave-tracking', {
                runnerId: this.userId,
                activityId: this.activityId
            });
            this.socket.disconnect();
        }

        console.log('🧹 Live tracker destroyed');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing LiveTracker...');

    try {
        window.liveTracker = new LiveTracker();
    } catch (error) {
        console.error('❌ Failed to initialize LiveTracker:', error);

        // Fallback: hide loading screen and show error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Add error message to body
        document.body.innerHTML += `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        text-align: center; z-index: 10000;">
                <h2>⚠️ Loading Error</h2>
                <p>Failed to load the tracking page.</p>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }

    // Failsafe timeout - force hide loading screen after 10 seconds
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            console.warn('⚠️ Forcing loading screen to hide after timeout');
            loadingScreen.style.display = 'none';
            document.body.classList.add('loaded');
        }
    }, 10000);
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
            console.log('📴 Tab hidden');
        } else {
            console.log('📱 Tab visible');
        }
    }
});
