const { admin, db } = require('../config/firebase-admin');
const testFeatures = require('./firestore.test');

async function runTests() {
  console.log('Starting Firestore feature tests...\n');

  try {
    // Create a test user token
    const customToken = await admin.auth().createCustomToken('test-user', {
      isTest: true,
      isServiceAccount: true,
    });
    console.log('Custom token created');

    // Run tests with the custom token
    await testFeatures(customToken);
    console.log('\nTests completed successfully.');
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

// Handle any uncaught errors
process.on('unhandledRejection', error => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

runTests();
