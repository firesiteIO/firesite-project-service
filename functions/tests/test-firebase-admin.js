/**
 * Enhanced test script to verify Firebase Admin initialization and Firestore access
 */

// Import the Firebase Admin instance from the central source
const { admin, db, adminApp } = require('./config/firebase-admin');
const path = require('path');

console.log('=== Firebase Admin Test ===');
console.log('Current working directory:', process.cwd());
console.log('Script path:', __filename);
console.log('Firebase Admin initialized:', admin ? 'Yes' : 'No');
console.log('Admin app name:', adminApp.name);
console.log('Admin app options:', JSON.stringify(adminApp.options, null, 2));

// Test Firestore access with multiple approaches
async function testFirestore() {
  try {
    console.log('\n=== Testing Firestore Access ===');
    
    // Approach 1: Using the db instance from firebase-admin.js
    console.log('\nApproach 1: Using imported db instance');
    console.log('DB instance type:', typeof db);
    console.log('DB instance:', db ? 'Exists' : 'Does not exist');
    
    try {
      // Try to access the tasks collection
      const tasksRef = db.collection('tasks');
      console.log('Tasks collection reference created:', tasksRef.path);
      
      // Try to get a document
      const testDocId = 'uPuZ0dLheCjdRlqTcc7h'; // ID used in routes/index.js
      const docRef = tasksRef.doc(testDocId);
      console.log('Document reference created:', docRef.path);
      
      console.log('Attempting to get document...');
      const doc = await docRef.get();
      console.log('Document get() completed');
      
      if (doc.exists) {
        console.log('Document found!');
        console.log('Document data:', doc.data());
      } else {
        console.log('Document not found. This is expected if the document does not exist.');
        
        // Try to list all documents in the collection
        console.log('Listing all documents in tasks collection...');
        const snapshot = await tasksRef.get();
        
        if (snapshot.empty) {
          console.log('No documents found in tasks collection.');
        } else {
          console.log(`Found ${snapshot.size} documents in tasks collection.`);
          snapshot.forEach(doc => {
            console.log('Document ID:', doc.id);
          });
        }
      }
    } catch (error) {
      console.error('Error in Approach 1:', error);
    }
    
    // Approach 2: Getting a fresh Firestore instance
    console.log('\nApproach 2: Getting a fresh Firestore instance');
    try {
      const freshDb = admin.firestore();
      console.log('Fresh Firestore instance created');
      
      // Try a simple operation
      const testCollection = freshDb.collection('test');
      console.log('Test collection reference created:', testCollection.path);
      
      // Try to write a test document
      console.log('Attempting to write a test document...');
      const writeResult = await testCollection.add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        test: true,
        message: 'Test document created by test-firebase-admin.js'
      });
      
      console.log('Test document written successfully with ID:', writeResult.id);
      
      // Read it back
      const testDoc = await writeResult.get();
      console.log('Test document read successfully:', testDoc.exists);
      if (testDoc.exists) {
        console.log('Test document data:', testDoc.data());
      }
    } catch (error) {
      console.error('Error in Approach 2:', error);
    }
    
    // Approach 3: Try with a different collection
    console.log('\nApproach 3: Trying with a different collection');
    try {
      const usersCollection = db.collection('users');
      console.log('Users collection reference created:', usersCollection.path);
      
      // List all documents
      const snapshot = await usersCollection.limit(5).get();
      if (snapshot.empty) {
        console.log('No documents found in users collection.');
      } else {
        console.log(`Found ${snapshot.size} documents in users collection.`);
        snapshot.forEach(doc => {
          console.log('User document ID:', doc.id);
        });
      }
    } catch (error) {
      console.error('Error in Approach 3:', error);
    }
    
    console.log('\nFirestore access testing completed!');
  } catch (error) {
    console.error('Error in main test function:', error);
  }
}

// Run the test
console.log('\nStarting Firestore tests...');
testFirestore()
  .then(() => console.log('\nAll tests completed.'))
  .catch(error => console.error('\nTests failed with error:', error));
