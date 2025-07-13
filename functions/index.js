/**
 * Main entry point for Firebase Functions
 */

// Import the app and debug functions
const app = require("./src/index");
const debug = require("./src/debug");

// Export our functions
module.exports = {
  ...app, // Export all functions from src/index.js
  ...debug, // Spread the debug exports (helloWorld)
};
