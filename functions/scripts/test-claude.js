/**
 * @fileoverview Test script for Claude integration
 * This script can be run to test the Claude integration without deploying
 *
 * Run with: node src/scripts/test-claude.js
 */

// Load environment variables
require("dotenv").config({ path: ".env.development" });

// Import the Claude service
const claudeService = require("../services/claude-service");

// Simple async wrapper for testing
async function testClaude() {
  console.log("=== Claude Integration Test ===");

  try {
    // Step 1: Check connection status
    console.log("\n🔍 Testing Claude connection...");
    const status = await claudeService.checkStatus();
    console.log("Connection status:", status);

    if (!status.available) {
      console.error(
        "❌ Claude connection failed. Check your API key and network connectivity."
      );
      return;
    }

    console.log("✅ Claude connection successful!");

    // Step 2: Test sending a message
    console.log("\n🔍 Testing Claude chat...");
    const response = await claudeService.sendMessage(
      'Write a simple "Hello World" Express.js endpoint.',
      "test-session",
      { currentProject: "Firesite" }
    );

    console.log("Claude response:");
    console.log("------------------------------");
    console.log(response);
    console.log("------------------------------");
    console.log("✅ Chat test successful!");

    // Step 3: Test file operations (if enabled)
    console.log("\n🔍 Testing file operations...");
    try {
      const files = await claudeService.listFiles("./src");
      console.log(`Found ${files.length} files in ./src directory:`);
      files.slice(0, 5).forEach((file) => {
        console.log(`- ${file.isDirectory ? "📁" : "📄"} ${file.name}`);
      });
      if (files.length > 5) {
        console.log(`... and ${files.length - 5} more files`);
      }
      console.log("✅ File operations test successful!");
    } catch (error) {
      console.error("❌ File operations test failed:", error.message);
    }

    // Step 4: Test command execution (if enabled)
    console.log("\n🔍 Testing command execution...");
    try {
      const result = await claudeService.executeCommand(
        'echo "Hello from Claude!"'
      );
      console.log("Command output:", result);
      console.log("✅ Command execution test successful!");
    } catch (error) {
      console.error("❌ Command execution test failed:", error.message);
    }

    console.log("\n✅ All tests completed successfully!");
    console.log("\nYou can now integrate Claude into your Firebase Functions.");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Run the test
testClaude();
