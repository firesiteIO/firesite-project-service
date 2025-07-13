/**
 * Simple debug endpoint to verify Firebase Functions are working
 */
const functions = require("firebase-functions");

exports.helloWorld = functions.https.onRequest((req, res) => {
  console.log("hello World function called");
  res.json({
    message: "Hello from Firebase Functions!",
    timestamp: new Date().toISOString(),
  });
});
