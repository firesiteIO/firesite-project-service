/**
 * Test script using Firebase JS SDK directly (modular syntax)
 *
 * This uses the client library rather than the admin library to test Firestore access
 * Run with: node src/tests/test-firebase-direct.js
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

// Firebase configuration from your project
const firebaseConfig = {
  apiKey: "AIzaSyCzLF1qezVX6NJrpBiuDZ_HLu2iMNm3mbs",
  authDomain: "firesite-ai-f3bc8.firebaseapp.com",
  databaseURL: "https://firesite-ai-f3bc8-default-rtdb.firebaseio.com",
  projectId: "firesite-ai-f3bc8",
  storageBucket: "firesite-ai-f3bc8.firebasestorage.app",
  messagingSenderId: "735475819436",
  appId: "1:735475819436:web:f8e39b5d9e7fb251e51009",
  measurementId: "G-CBQQ8EFQGG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listTasks() {
  try {
    console.log(
      "Attempting to query tasks collection with Firebase client SDK..."
    );

    const tasksCol = collection(db, "tasks");
    const taskSnapshot = await getDocs(tasksCol);
    const taskList = taskSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Successfully retrieved ${taskList.length} tasks`);

    if (taskList.length === 0) {
      console.log("No tasks found in the collection.");
      return;
    }

    console.log("Tasks:");
    taskList.forEach((task) => {
      console.log(`- ${task.id}: ${task.title || "[No title]"}`);
    });
  } catch (error) {
    console.error("Error querying tasks:", error);
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
