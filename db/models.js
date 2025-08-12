// db/models.js - Mongoose data models for marathon tracking system
const mongoose = require('mongoose');

// User Schema 123
const userSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        validate: {
            validator: function(v) {
                return /^usr_[a-zA-Z0-9]{8}$/.test(v);
            },
            message: 'User ID must start with "usr_" followed by 8 alphanumeric characters'
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    auth: {
        provider: {
            type: String,
            enum: ['apple', 'google', 'email'],
            required: true
        },
        sub: {
            type: String,
            required: true
        }
    },
    preferences: {
        voice: {
            type: String,
            default: 'en-GB',
            enum: ['en-GB', 'en-US', 'de-DE', 'fr-FR', 'es-ES']
        },
        cheersVolume: {
            type: Number,
            default: 0.8,
            min: 0.0,
            max: 1.0
        }
    }
});

// Event Schema (for shared events like Berlin Marathon)
const eventSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        validate: {
            validator: function(v) {
                return /^evt_[a-zA-Z0-9]{8}$/.test(v);
            },
            message: 'Event ID must start with "evt_" followed by 8 alphanumeric characters'
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    location: {
        city: String,
        country: String,
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number] // [lng, lat]
        }
    },
    type: {
        type: String,
        enum: ['marathon', 'half-marathon', '10k', '5k', 'ultra', 'other'],
        default: 'marathon'
    },
    distance: {
        type: Number, // in meters
        required: true
    },
    route: {
        checkpoints: [{
            name: String,
            distance: Number, // meters from start
            coordinates: {
                type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point'
                },
                coordinates: [Number] // [lng, lat]
            }
        }]
    },
    settings: {
        maxParticipants: Number,
        registrationOpen: {
            type: Boolean,
            default: true
        },
        trackingEnabled: {
            type: Boolean,
            default: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create geospatial index for event location
eventSchema.index({ 'location.coordinates': '2dsphere' });

// Activity Schema (for each runner's participation in an event)
const activitySchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        unique: true,
        index: true,
        validate: {
            validator: function(v) {
                return /^act_[a-zA-Z0-9]{8}$/.test(v);
            },
            message: 'Activity ID must start with "act_" followed by 8 alphanumeric characters'
        }
    },
    runnerId: {
        type: String,
        required: true,
        ref: 'User',
        index: true
    },
    eventId: {
        type: String,
        required: true,
        ref: 'Event',
        index: true
    },
    status: {
        type: String,
        enum: ['planned', 'active', 'finished', 'cancelled'],
        default: 'planned',
        index: true
    },
    startedAt: Date,
    endedAt: Date,
    share: {
        public: {
            type: Boolean,
            default: true
        },
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
            validate: {
                validator: function(v) {
                    return /^sh_[a-zA-Z0-9]{16}$/.test(v);
                },
                message: 'Share token must start with "sh_" followed by 16 alphanumeric characters'
            }
        },
        expiresAt: Date
    },
    settings: {
        pingIntervalSec: {
            type: Number,
            default: 10,
            min: 5,
            max: 60
        },
        cheersEnabled: {
            type: Boolean,
            default: true
        },
        ttsLang: {
            type: String,
            default: 'en-US',
            enum: ['en-GB', 'en-US', 'de-DE', 'fr-FR', 'es-ES']
        }
    },
    stats: {
        lastPingAt: Date,
        distanceMeters: {
            type: Number,
            default: 0
        },
        avgPaceSecPerKm: Number,
        maxSpeedMps: Number,
        totalTimeSec: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Location Ping Schema (GPS tracking points)
const locationPingSchema = new mongoose.Schema({
    meta: {
        activityId: {
            type: String,
            required: true,
            index: true
        },
        runnerId: {
            type: String,
            required: true,
            index: true
        }
    },
    ts: {
        type: Date,
        required: true,
        index: true
    },
    loc: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    speedMps: Number, // speed in meters per second
    elevM: Number, // elevation in meters
    battery: {
        type: Number,
        min: 0.0,
        max: 1.0
    },
    accuracy: Number, // GPS accuracy in meters
    heading: Number, // direction in degrees
    heartRate: Number,
    cadence: Number // steps per minute
});

// Create geospatial index for efficient location queries
locationPingSchema.index({ loc: '2dsphere' });
locationPingSchema.index({ 'meta.activityId': 1, ts: -1 });
locationPingSchema.index({ 'meta.runnerId': 1, ts: -1 });

// Cheer Message Schema (encouraging messages from supporters)
const cheerSchema = new mongoose.Schema({
    activityId: {
        type: String,
        required: true,
        index: true
    },
    from: {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        ip: {
            type: String,
            trim: true
        }
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    deliveredAt: Date, // when fetched by phone
    spokenAt: Date, // after TTS on device
    mod: {
        flagged: {
            type: Boolean,
            default: false
        },
        reason: String
    }
});

// Create indexes for efficient queries
cheerSchema.index({ activityId: 1, createdAt: -1 });
cheerSchema.index({ 'meta.runnerId': 1, deliveredAt: 1 });

// Create the models
const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Activity = mongoose.model('Activity', activitySchema);
const LocationPing = mongoose.model('LocationPing', locationPingSchema);
const Cheer = mongoose.model('Cheer', cheerSchema);

module.exports = {
    User,
    Event,
    Activity,
    LocationPing,
    Cheer
};
