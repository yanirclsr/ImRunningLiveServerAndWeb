// db/atlas-ip-manager.js - Automatic IP detection and MongoDB Atlas whitelist management
const https = require('https');
const fs = require('fs');
const path = require('path');

class AtlasIPManager {
    constructor() {
        this.ipCacheFile = path.join(__dirname, '../.ip-cache.json');
        this.lastCheck = null;
        this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    }

    // Get current public IP address
    async getCurrentIP() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.ipify.org',
                port: 443,
                path: '/',
                method: 'GET',
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data.trim());
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('IP detection timeout'));
            });

            req.end();
        });
    }

    // Load cached IP information
    loadCachedIP() {
        try {
            if (fs.existsSync(this.ipCacheFile)) {
                const data = fs.readFileSync(this.ipCacheFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.log('⚠️  Could not load cached IP:', error.message);
        }
        return null;
    }

    // Save IP information to cache
    saveCachedIP(ip, timestamp) {
        try {
            const data = {
                ip: ip,
                timestamp: timestamp,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.ipCacheFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('⚠️  Could not save cached IP:', error.message);
        }
    }

    // Check if IP has changed
    async hasIPChanged() {
        try {
            const currentIP = await this.getCurrentIP();
            const cached = this.loadCachedIP();
            
            if (!cached || cached.ip !== currentIP) {
                console.log(`🔄 IP address changed: ${cached?.ip || 'None'} → ${currentIP}`);
                return { changed: true, newIP: currentIP, oldIP: cached?.ip };
            }
            
            return { changed: false, currentIP };
        } catch (error) {
            console.log('⚠️  Could not check IP change:', error.message);
            return { changed: false, error: error.message };
        }
    }

    // Update MongoDB Atlas whitelist via API
    async updateAtlasWhitelist(ip, description = 'Auto-updated IP') {
        const apiKey = process.env.MONGODB_ATLAS_API_KEY;
        const projectId = process.env.MONGODB_ATLAS_PROJECT_ID;
        
        if (!apiKey || !projectId) {
            console.log('⚠️  MongoDB Atlas API credentials not found. Set MONGODB_ATLAS_API_KEY and MONGODB_ATLAS_PROJECT_ID');
            return false;
        }

        try {
            console.log(`🔧 Updating MongoDB Atlas whitelist with IP: ${ip}`);
            
            // First, get current access list
            const currentList = await this.getAtlasAccessList(apiKey, projectId);
            
            // Check if IP already exists
            const existingEntry = currentList.find(entry => entry.ipAddress === ip);
            if (existingEntry) {
                console.log(`✅ IP ${ip} already in whitelist`);
                return true;
            }

            // Add new IP to whitelist
            const success = await this.addIPToAtlas(apiKey, projectId, ip, description);
            
            if (success) {
                console.log(`✅ Successfully added IP ${ip} to MongoDB Atlas whitelist`);
                this.saveCachedIP(ip, Date.now());
                return true;
            } else {
                console.log(`❌ Failed to add IP ${ip} to MongoDB Atlas whitelist`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error updating Atlas whitelist:', error.message);
            return false;
        }
    }

    // Get current Atlas access list
    async getAtlasAccessList(apiKey, projectId) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'cloud.mongodb.com',
                port: 443,
                path: `/api/atlas/v1.0/groups/${projectId}/accessList`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const response = JSON.parse(data);
                            resolve(response.results || []);
                        } catch (error) {
                            reject(new Error('Invalid JSON response'));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Atlas API timeout'));
            });

            req.end();
        });
    }

    // Add IP to Atlas access list
    async addIPToAtlas(apiKey, projectId, ip, description) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify([
                {
                    ipAddress: ip,
                    comment: description
                }
            ]);

            const options = {
                hostname: 'cloud.mongodb.com',
                port: 443,
                path: `/api/atlas/v1.0/groups/${projectId}/accessList`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 15000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        resolve(true);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Atlas API timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    // Main function to check and update IP
    async checkAndUpdateIP() {
        try {
            const ipCheck = await this.hasIPChanged();
            
            if (ipCheck.changed && ipCheck.newIP) {
                console.log(`🌐 IP address changed detected. Updating MongoDB Atlas whitelist...`);
                
                const success = await this.updateAtlasWhitelist(ipCheck.newIP, 'Auto-updated from development machine');
                
                if (success) {
                    console.log(`✅ IP whitelist updated successfully`);
                    return true;
                } else {
                    console.log(`⚠️  IP whitelist update failed, but continuing...`);
                    return false;
                }
            } else if (ipCheck.error) {
                console.log(`⚠️  IP check failed: ${ipCheck.error}`);
                return false;
            } else {
                console.log(`✅ IP address unchanged: ${ipCheck.currentIP}`);
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error in IP check and update:', error.message);
            return false;
        }
    }

    // Start automatic IP monitoring
    startMonitoring() {
        console.log('🔍 Starting automatic IP monitoring for MongoDB Atlas...');
        
        // Check immediately
        this.checkAndUpdateIP();
        
        // Set up periodic checking
        setInterval(() => {
            this.checkAndUpdateIP();
        }, this.checkInterval);
        
        console.log(`⏰ IP monitoring active (checking every ${this.checkInterval / 60000} minutes)`);
    }

    // Get current status
    getStatus() {
        const cached = this.loadCachedIP();
        return {
            currentIP: cached?.ip || 'Unknown',
            lastUpdated: cached?.lastUpdated || 'Never',
            monitoring: !!this.lastCheck,
            cacheFile: this.ipCacheFile
        };
    }
}

// Create singleton instance
const ipManager = new AtlasIPManager();

module.exports = ipManager;
