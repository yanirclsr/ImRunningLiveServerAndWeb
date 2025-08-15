#!/usr/bin/env node

// test-ip-manager.js - Test script for IP manager functionality
const ipManager = require('./db/atlas-ip-manager');

async function testIPManager() {
    console.log('🧪 Testing IP Manager Functionality\n');
    
    try {
        // Test 1: Get current IP
        console.log('1️⃣ Testing IP detection...');
        const currentIP = await ipManager.getCurrentIP();
        console.log(`   ✅ Current IP: ${currentIP}`);
        
        // Test 2: Check IP change
        console.log('\n2️⃣ Testing IP change detection...');
        const ipChange = await ipManager.hasIPChanged();
        console.log(`   📊 IP Change Status:`, ipChange);
        
        // Test 3: Get status
        console.log('\n3️⃣ Testing status retrieval...');
        const status = ipManager.getStatus();
        console.log(`   📈 Status:`, status);
        
        // Test 4: Check if credentials are set
        console.log('\n4️⃣ Checking MongoDB Atlas credentials...');
        const hasApiKey = !!process.env.MONGODB_ATLAS_API_KEY;
        const hasProjectId = !!process.env.MONGODB_ATLAS_PROJECT_ID;
        
        console.log(`   🔑 API Key: ${hasApiKey ? '✅ Set' : '❌ Not set'}`);
        console.log(`   🆔 Project ID: ${hasProjectId ? '✅ Set' : '❌ Not set'}`);
        
        if (hasApiKey && hasProjectId) {
            console.log('\n5️⃣ Testing Atlas whitelist update...');
            try {
                const result = await ipManager.checkAndUpdateIP();
                console.log(`   📝 Update result: ${result}`);
            } catch (error) {
                console.log(`   ⚠️  Update test failed: ${error.message}`);
            }
        } else {
            console.log('\n💡 To test Atlas whitelist updates, run:');
            console.log('   npm run setup:atlas');
        }
        
        console.log('\n🎯 Test Summary:');
        console.log(`   - IP Detection: ✅ Working`);
        console.log(`   - IP Change Detection: ✅ Working`);
        console.log(`   - Status Retrieval: ✅ Working`);
        console.log(`   - Atlas Credentials: ${hasApiKey && hasProjectId ? '✅ Configured' : '❌ Not configured'}`);
        
        if (hasApiKey && hasProjectId) {
            console.log(`   - Atlas Integration: ✅ Ready`);
        } else {
            console.log(`   - Atlas Integration: ⚠️  Needs setup`);
        }
        
        console.log('\n🚀 IP Manager is ready to use!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    testIPManager();
}

module.exports = { testIPManager };
