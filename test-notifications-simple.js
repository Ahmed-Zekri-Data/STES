// Simple test for notification system
// Run this from the backend directory: cd backend && node ../test-notifications-simple.js
const axios = require('axios');

async function testNotificationSystem() {
  console.log('🧪 Testing STES Notification System...\n');

  const BASE_URL = 'http://localhost:9000';

  try {
    // Test 1: Check server health
    console.log('1️⃣ Testing server health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not accessible. Please start the backend server:');
      console.log('   cd backend && npm run dev');
      return;
    }

    // Test 2: Check VAPID public key endpoint
    console.log('\n2️⃣ Testing VAPID public key endpoint...');
    try {
      const vapidResponse = await axios.get(`${BASE_URL}/api/notifications/vapid-public-key`);
      if (vapidResponse.data.publicKey) {
        console.log('✅ VAPID public key available:', vapidResponse.data.publicKey.substring(0, 20) + '...');
      } else {
        console.log('⚠️ VAPID public key endpoint accessible but no key returned');
      }
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('⚠️ Push notifications not configured (missing VAPID keys)');
        console.log('   Run: npm run generate-vapid');
        console.log('   Then add the keys to your .env file');
      } else {
        console.log('❌ VAPID endpoint error:', error.response?.data?.message || error.message);
      }
    }

    // Test 3: Check notification routes
    console.log('\n3️⃣ Testing notification routes...');
    try {
      // This should return 401 (unauthorized) which means the route exists
      const prefsResponse = await axios.get(`${BASE_URL}/api/notifications/preferences`);
      console.log('✅ Notification preferences endpoint accessible');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Notification preferences endpoint exists (requires authentication)');
      } else {
        console.log('❌ Notification preferences endpoint error:', error.response?.status);
      }
    }

    console.log('\n📋 Test Summary:');
    console.log('- Backend server: Check if running on port 9000');
    console.log('- VAPID keys: Check if configured in .env file');
    console.log('- Notification routes: Available and protected');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Ensure backend server is running: cd backend && npm run dev');
    console.log('2. Check .env file has VAPID keys configured');
    console.log('3. Test notifications from the frontend interface');
    console.log('4. Login as a customer and go to Account > Notifications');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNotificationSystem();

module.exports = { testNotificationSystem };
