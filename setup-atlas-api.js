#!/usr/bin/env node

// setup-atlas-api.js - Setup script for MongoDB Atlas API credentials
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 MongoDB Atlas API Setup for Automatic IP Whitelist Management');
console.log('================================================================\n');

console.log('This script will help you set up automatic IP whitelist management for MongoDB Atlas.');
console.log('You will need:');
console.log('1. MongoDB Atlas API Key (Programmatic API Key)');
console.log('2. MongoDB Atlas Project ID\n');

console.log('📋 Steps to get your credentials:');
console.log('1. Go to https://cloud.mongodb.com');
console.log('2. Sign in to your Atlas account');
console.log('3. Go to Access Manager → API Keys');
console.log('4. Create a new Programmatic API Key with "Project Data Access Admin" role');
console.log('5. Copy the API Key and Project ID\n');

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupAtlasAPI() {
    try {
        // Get API Key
        const apiKey = await question('🔑 Enter your MongoDB Atlas API Key: ');
        if (!apiKey || apiKey.trim().length === 0) {
            console.log('❌ API Key is required');
            return false;
        }

        // Get Project ID
        const projectId = await question('🆔 Enter your MongoDB Atlas Project ID: ');
        if (!projectId || projectId.trim().length === 0) {
            console.log('❌ Project ID is required');
            return false;
        }

        // Get MongoDB Atlas URI
        const atlasUri = await question('🔗 Enter your MongoDB Atlas Connection String (optional, for testing): ');
        
        // Create .env file
        const envContent = `# MongoDB Atlas Configuration
MONGODB_ATLAS_URI=${atlasUri || 'your_connection_string_here'}
MONGODB_ATLAS_API_KEY=${apiKey}
MONGODB_ATLAS_PROJECT_ID=${projectId}

# Environment
NODE_ENV=development
RENDER=false

# Optional: Local MongoDB (for development)
MONGODB_LOCAL_URI=mongodb://localhost:27017/imrunning
`;

        const envPath = path.join(__dirname, '.env');
        fs.writeFileSync(envPath, envContent);

        console.log('\n✅ Configuration saved to .env file');
        console.log(`📁 File location: ${envPath}`);
        
        // Test the configuration
        console.log('\n🧪 Testing configuration...');
        
        // Test API Key format
        if (apiKey.length < 20) {
            console.log('⚠️  API Key seems too short. Please verify it\'s correct.');
        } else {
            console.log('✅ API Key format looks good');
        }
        
        // Test Project ID format
        if (projectId.length < 10) {
            console.log('⚠️  Project ID seems too short. Please verify it\'s correct.');
        } else {
            console.log('✅ Project ID format looks good');
        }
        
        // Test Atlas URI format
        if (atlasUri && !atlasUri.includes('mongodb+srv://')) {
            console.log('⚠️  Atlas URI format doesn\'t look like a standard MongoDB Atlas connection string.');
        } else if (atlasUri) {
            console.log('✅ Atlas URI format looks good');
        }
        
        console.log('\n📝 Next steps:');
        console.log('1. Make sure your .env file is in your project root');
        console.log('2. Add .env to your .gitignore file (if not already there)');
        console.log('3. Restart your development server');
        console.log('4. The system will automatically check and update your IP whitelist');
        
        console.log('\n🔒 Security Note:');
        console.log('- Never commit your .env file to version control');
        console.log('- Keep your API key secure');
        console.log('- The API key has limited permissions (only project data access)');
        
        return true;
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        return false;
    }
}

async function main() {
    try {
        const success = await setupAtlasAPI();
        
        if (success) {
            console.log('\n🎉 Setup completed successfully!');
            console.log('Your MongoDB Atlas IP whitelist will now be automatically managed.');
        } else {
            console.log('\n💥 Setup failed. Please try again.');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { setupAtlasAPI };
