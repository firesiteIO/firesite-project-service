/**
 * Very simple test to verify Firestore write access using the Admin SDK
 * Run with: node src/tests/test-firestore-direct.js
 */

// Import Admin SDK
const admin = require("firebase-admin");

// Initialize the Admin SDK with credential from the service account file
const serviceAccount = require("../config/service-accounts/dev.json");

console.log("Service Account Project ID:", serviceAccount.project_id);

// Initialize the app with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

// Get Firestore instance
const db = admin.firestore();

// Test collection name
const TEST_COLLECTION = "test_collection";

// Create a test document
async function createTestDocument() {
  try {
    console.log(`Creating a test document in collection: ${TEST_COLLECTION}`);

    const data = {
      message: "Hello from test script",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(TEST_COLLECTION).add(data);

    console.log(`Document created successfully with ID: ${docRef.id}`);

    // Fetch the document to verify
    const doc = await docRef.get();

    if (doc.exists) {
      console.log("Document data:", doc.data());
      return true;
    } else {
      console.log("Document does not exist!");
      return false;
    }
  } catch (error) {
    console.error("Error creating/accessing test document:", error);
    return false;
  }
}

// Run the test
createTestDocument()
  .then((success) => {
    console.log("Test completed with", success ? "success" : "failure");
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed with error:", error);
    process.exit(1);
  });
