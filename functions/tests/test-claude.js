// Load environment variables
require("dotenv").config({ path: ".env.development" });

// Import the Anthropic SDK - using the newer pattern
const { Anthropic } = require("@anthropic-ai/sdk");

// Log environment variables
console.log(
  "ANTHROPIC_API_KEY configured:",
  process.env.ANTHROPIC_API_KEY ? "Yes" : "No"
);
console.log("CLAUDE_MODEL:", process.env.CLAUDE_MODEL);

// Initialize Anthropic client using the v0.39.0 pattern
try {
  // Create the client with API key
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log("Initialized Anthropic client");

  // Simple async test function
  async function testClaude() {
    console.log("=== Claude API Connection Test ===");

    try {
      console.log("Sending test message to Claude...");

      // Using the Messages API with the latest model
      const message = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content:
              "Hello, can you confirm that you're receiving this message? Please respond briefly.",
          },
        ],
        system:
          "You are Claude, an AI assistant made by Anthropic. Please provide brief responses for testing purposes.",
      });

      console.log("\n=== Claude Response ===");
      console.log(message.content[0].text);
      console.log("\n✅ Success! Claude API is functioning correctly.");

      // Return the model info
      console.log("\nModel info:");
      console.log("- Model ID:", message.model);
      console.log("- Usage:", message.usage);

      return message;
    } catch (error) {
      console.error("\n❌ Error connecting to Claude API:");
      console.error(error);

      if (error.status) {
        console.log("\nStatus code:", error.status);
      }

      if (error.error?.error?.message) {
        console.log("\nError message:", error.error.error.message);
      }
    }
  }

  // Run the test
  testClaude();
} catch (error) {
  console.error("Error during initialization:", error);
}
