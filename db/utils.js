// db/utils.js - Utility functions for marathon tracking system
const crypto = require('crypto');

/**
 * Generate a unique 8-character alphanumeric ID
 * @returns {string} Unique ID
 */
function generateShortId() {
    return crypto.randomBytes(4).toString('hex');
}

/**
 * Generate user ID with usr_ prefix
 * @returns {string} User ID in format usr_XXXXXXXX
 */
function generateUserId() {
    return `usr_${generateShortId()}`;
}

/**
 * Generate event ID with evt_ prefix
 * @returns {string} Event ID in format evt_XXXXXXXX
 */
function generateEventId() {
    return `evt_${generateShortId()}`;
}

/**
 * Generate activity ID with act_ prefix
 * @returns {string} Activity ID in format act_XXXXXXXX
 */
function generateActivityId() {
    return `act_${generateShortId()}`;
}

/**
 * Generate share token with sh_ prefix
 * @returns {string} Share token in format sh_XXXXXXXXXXXXXXXX
 */
function generateShareToken() {
    return `sh_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate runner ID and activity ID pair (legacy compatibility)
 * @returns {Object} Object with runnerId and activityId
 */
function generateRunnerAndActivityIds() {
    return {
        runnerId: generateUserId(),
        activityId: generateActivityId()
    };
}

/**
 * Validate ID format
 * @param {string} id - ID to validate
 * @param {string} type - Type of ID (user, event, activity, share)
 * @returns {boolean} True if valid
 */
function validateId(id, type = 'any') {
    const patterns = {
        user: /^usr_[a-zA-Z0-9]{8}$/,
        event: /^evt_[a-zA-Z0-9]{8}$/,
        activity: /^act_[a-zA-Z0-9]{8}$/,
        share: /^sh_[a-zA-Z0-9]{16}$/
    };

    if (type === 'any') {
        return Object.values(patterns).some(pattern => pattern.test(id));
    }

    return patterns[type] ? patterns[type].test(id) : false;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Calculate pace from time and distance
 * @param {number} timeSeconds - Time in seconds
 * @param {number} distanceMeters - Distance in meters
 * @returns {number} Pace in seconds per kilometer
 */
function calculatePace(timeSeconds, distanceMeters) {
    if (distanceMeters <= 0) return 0;
    
    const distanceKm = distanceMeters / 1000;
    return timeSeconds / distanceKm;
}

/**
 * Format time from seconds to HH:MM:SS
 * @param {number} totalSeconds - Total seconds
 * @returns {string} Formatted time string
 */
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

/**
 * Estimate finish time based on current pace and remaining distance
 * @param {number} currentPaceSeconds - Current pace in seconds per km
 * @param {number} remainingDistanceMeters - Remaining distance in meters
 * @param {Date} startTime - Race start time
 * @returns {Object} Estimated finish time and string
 */
function estimateFinishTime(currentPaceSeconds, remainingDistanceMeters, startTime) {
    const now = new Date();
    const elapsedTime = (now - startTime) / 1000; // seconds
    const remainingDistanceKm = remainingDistanceMeters / 1000;
    const estimatedRemainingTime = remainingDistanceKm * currentPaceSeconds;
    const estimatedTotalTime = elapsedTime + estimatedRemainingTime;
    
    const estimatedFinishTime = new Date(startTime.getTime() + (estimatedTotalTime * 1000));
    
    return {
        estimatedFinishTime,
        estimatedFinishTimeString: formatTime(estimatedTotalTime)
    };
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Generate a shareable tracking URL
 * @param {string} shareToken - Share token
 * @param {string} baseUrl - Base URL of the application
 * @returns {string} Shareable tracking URL
 */
function generateTrackingUrl(shareToken, baseUrl) {
    return `${baseUrl}/track/${shareToken}`;
}

/**
 * Check if a location is within reasonable bounds for a marathon
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} bounds - Bounds object with min/max lat/lng
 * @returns {boolean} True if within bounds
 */
function isLocationWithinBounds(lat, lng, bounds) {
    return lat >= bounds.minLat && 
           lat <= bounds.maxLat && 
           lng >= bounds.minLng && 
           lng <= bounds.maxLng;
}

/**
 * Get Berlin Marathon bounds (approximate)
 * @returns {Object} Bounds object
 */
function getBerlinMarathonBounds() {
    return {
        minLat: 52.48,
        maxLat: 52.55,
        minLng: 13.25,
        maxLng: 13.45
    };
}

/**
 * Convert meters to kilometers
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in kilometers
 */
function metersToKm(meters) {
    return meters / 1000;
}

/**
 * Convert kilometers to meters
 * @param {number} km - Distance in kilometers
 * @returns {number} Distance in meters
 */
function kmToMeters(km) {
    return km * 1000;
}

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
}

module.exports = {
    generateShortId,
    generateUserId,
    generateEventId,
    generateActivityId,
    generateShareToken,
    generateRunnerAndActivityIds,
    validateId,
    calculateDistance,
    calculatePace,
    formatTime,
    estimateFinishTime,
    sanitizeInput,
    generateTrackingUrl,
    isLocationWithinBounds,
    getBerlinMarathonBounds,
    metersToKm,
    kmToMeters,
    getClientIP
};
