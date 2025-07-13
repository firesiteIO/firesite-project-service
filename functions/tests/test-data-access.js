/**
 * Test script to verify Firestore data access patterns used by data routes
 */

const { admin, db } = require('./config/firebase-admin');

// Test data access patterns
async function testDataAccess() {
  try {
    console.log('=== Testing Firestore Data Access Patterns ===');
    
    // First, create a test document to ensure we have data to retrieve
    console.log('\nCreating test document in Firestore...');
    const testDocRef = db.collection('test_data_access').doc('test1');
    await testDocRef.set({
      name: 'Test Document',
      description: 'This is a test document for data access',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nested: {
        field1: 'Nested value 1',
        field2: 'Nested value 2'
      },
      tags: ['test', 'data', 'access']
    });
    console.log('Test document created successfully');
    
    // Test 1: Get all documents in a collection
    console.log('\nTest 1: Get all documents in a collection');
    try {
      const snapshot = await db.collection('test_data_access').get();
      console.log(`Found ${snapshot.size} documents`);
      
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('Results:', JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('Error in Test 1:', error);
    }
    
    // Test 2: Get a specific document
    console.log('\nTest 2: Get a specific document');
    try {
      const doc = await db.collection('test_data_access').doc('test1').get();
      
      if (doc.exists) {
        console.log('Document found:', JSON.stringify(doc.data(), null, 2));
      } else {
        console.log('Document not found');
      }
    } catch (error) {
      console.error('Error in Test 2:', error);
    }
    
    // Test 3: Access a nested field
    console.log('\nTest 3: Access a nested field');
    try {
      const doc = await db.collection('test_data_access').doc('test1').get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log('Nested field:', JSON.stringify(data.nested, null, 2));
      } else {
        console.log('Document not found');
      }
    } catch (error) {
      console.error('Error in Test 3:', error);
    }
    
    // Test 4: Query with filters
    console.log('\nTest 4: Query with filters');
    try {
      // Create another document for testing queries
      await db.collection('test_data_access').doc('test2').set({
        name: 'Another Test Document',
        description: 'This is another test document',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        priority: 'high',
        tags: ['important', 'test']
      });
      
      // Query documents with a specific tag
      const snapshot = await db.collection('test_data_access')
        .where('tags', 'array-contains', 'test')
        .get();
      
      console.log(`Found ${snapshot.size} documents with tag 'test'`);
      
      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('Results:', JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('Error in Test 4:', error);
    }
    
    // Test 5: Try to access a non-existent document
    console.log('\nTest 5: Try to access a non-existent document');
    try {
      const doc = await db.collection('test_data_access').doc('nonexistent').get();
      
      if (doc.exists) {
        console.log('Document found (unexpected):', JSON.stringify(doc.data(), null, 2));
      } else {
        console.log('Document not found (expected)');
      }
    } catch (error) {
      console.error('Error in Test 5:', error);
    }
    
    console.log('\nData access testing completed!');
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

// Run the tests
testDataAccess()
  .then(() => console.log('All tests completed.'))
  .catch(error => console.error('Tests failed with error:', error));
