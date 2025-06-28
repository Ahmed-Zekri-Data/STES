const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys for push notifications...\n');

try {
  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('📋 Copy these keys to your .env file:\n');
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
  console.log('VAPID_SUBJECT=mailto:contact@stes.tn\n');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '../../.env');
  const envExamplePath = path.join(__dirname, '../../.env.example');
  
  if (fs.existsSync(envPath)) {
    console.log('📝 .env file found. You can manually update it with the keys above.');
  } else if (fs.existsSync(envExamplePath)) {
    console.log('📝 .env file not found, but .env.example exists.');
    console.log('💡 Copy .env.example to .env and update with the keys above.');
  } else {
    console.log('📝 No .env file found. Create one with the keys above.');
  }
  
  console.log('\n🔒 Keep these keys secure and never commit them to version control!');
  console.log('📖 For more information about VAPID keys, visit: https://web.dev/push-notifications-web-push-protocol/');
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}
