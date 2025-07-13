/**
 * Simple test to verify Firestore access using the Admin SDK
 * Run with: node src/tests/test-firestore.js
 */

// Load environmental variables
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env.development"),
});

// Import Admin SDK
const admin = require("firebase-admin");

// Initialize the Admin SDK with credential from the service account file
const serviceAccount = require("../config/service-accounts/dev.json");

// Initialize the app with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

// Get Firestore instance
const db = admin.firestore();

// Log info about the service account
console.log("===============================");
console.log("Service Account Info:");
console.log("Project ID:", serviceAccount.project_id);
console.log("Client Email:", serviceAccount.client_email);
console.log("===============================");

// Test function to list tasks
async function listTasks() {
  try {
    console.log("Attempting to query tasks collection...");

    const snapshot = await db.collection("tasks").get();

    console.log(`Successfully retrieved ${snapshot.size} tasks`);

    if (snapshot.empty) {
      console.log("No tasks found in the collection. Creating a test task...");
      return createTestTask();
    }

    console.log("Tasks:");
    snapshot.forEach((doc) => {
      console.log(`- ${doc.id}: ${doc.data().title || "[No title]"}`);
    });
  } catch (error) {
    console.error("Error querying tasks:", error);
  }
}

// Create a test task
async function createTestTask() {
  try {
    console.log("Creating a test task...");

    const taskData = {
      title: "Test Task",
      description: "This is a test task created via the Admin SDK",
      status: "todo",
      priority: "medium",
      groupId: "todo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "test-script",
    };

    const docRef = await db.collection("tasks").add(taskData);
    console.log(`Test task created with ID: ${docRef.id}`);

    // Fetch and log the new task
    const docSnapshot = await docRef.get();
    console.log("New task:", docSnapshot.id, docSnapshot.data());

    return docSnapshot;
  } catch (error) {
    console.error("Error creating test task:", error);
    throw error;
  }
}

// Run the test
listTasks()
  .then(() => {
    console.log("Test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
