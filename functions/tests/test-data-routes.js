/**
 * Test script to verify data routes are working
 */

const axios = require('axios');
const { admin, db } = require('./config/firebase-admin');

// Base URL for local testing
const BASE_URL = 'http://localhost:5001/firesite-ai-f3bc8/us-central1/app';

// Test data routes
async function testDataRoutes() {
  try {
    console.log('=== Testing Data Routes ===');
    
    // First, create a test document to ensure we have data to retrieve
    console.log('\nCreating test document in Firestore...');
    const testDocRef = db.collection('test_data_routes').doc('test1');
    await testDocRef.set({
      name: 'Test Document',
      description: 'This is a test document for data routes',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nested: {
        field1: 'Nested value 1',
        field2: 'Nested value 2'
      }
    });
    console.log('Test document created successfully');
    
    // Test 1: Get all documents in a collection
    console.log('\nTest 1: Get all documents in a collection');
    try {
      const response = await axios.get(`${BASE_URL}/data/test_data_routes`);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error in Test 1:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    // Test 2: Get a specific document
    console.log('\nTest 2: Get a specific document');
    try {
      const response = await axios.get(`${BASE_URL}/data/test_data_routes/test1`);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error in Test 2:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    // Test 3: Get a nested field
    console.log('\nTest 3: Get a nested field');
    try {
      const response = await axios.get(`${BASE_URL}/data/test_data_routes/test1/nested`);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error in Test 3:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    // Test 4: Try to access a non-existent document
    console.log('\nTest 4: Try to access a non-existent document');
    try {
      const response = await axios.get(`${BASE_URL}/data/test_data_routes/nonexistent`);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('Error in Test 4:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    
    console.log('\nData routes testing completed!');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the tests
testDataRoutes()
  .then(() => console.log('All tests completed.'))
  .catch(error => console.error('Tests failed with error:', error));
