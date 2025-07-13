/**
 * Test client for Claude with MCP integration
 *
 * This script tests the communication between Firebase Functions,
 * the MCP server, and Claude by sending a test message.
 */

const axios = require("axios");
const readline = require("readline");

// Configuration
const FUNCTIONS_URL = "http://localhost:5001/firesite-ai-f3bc8/us-central1/app"; // Adjusted for new project ID
const TEST_CLAUDE_ENDPOINT = `${FUNCTIONS_URL}/claude/test`;

// Enable detailed axios logging
axios.interceptors.request.use((request) => {
  console.log("\nRequest:", {
    method: request.method,
    url: request.url,
    data: request.data,
    headers: request.headers,
  });
  return request;
});

axios.interceptors.response.use(
  (response) => {
    console.log("Response:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.log("Error Response:", {
      message: error.message,
      response: error.response
        ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          }
        : "No response",
    });
    return Promise.reject(error);
  }
);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Skip the prompt check and go directly to message
async function simplifiedTest() {
  console.log("=== Simplified Claude Test ===");

  rl.question("\nEnter message for Claude: ", async (message) => {
    if (!message) {
      console.error("Message cannot be empty");
      rl.close();
      return;
    }

    try {
      // Send message with developer role
      console.log(`Sending message to Claude with prompt role: developer`);
      console.log(`Message: "${message}"`);

      const response = await axios.post(
        `${TEST_CLAUDE_ENDPOINT}/message`,
        {
          message,
          promptRole: "developer",
          directory: "/Users/thomasbutler/Documents/Firesite/firesite-mcp",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // Increase timeout to 30 seconds
        }
      );

      console.log("\n----- Claude Response -----");
      console.log(response.data.message);
      console.log("----- End Response -----\n");

      // Ask if user wants to send another message
      askForAnotherMessage("developer");
    } catch (error) {
      console.error(
        "\nError sending message to Claude:",
        error.response?.data?.error || error.message
      );
      rl.close();
    }
  });
}

/**
 * Check the status of Claude API
 */
async function checkClaudeStatus() {
  try {
    console.log("Checking Claude API status...");
    const response = await axios.get(`${TEST_CLAUDE_ENDPOINT}/status`, {
      timeout: 10000,
    });
    console.log("Claude API status:", response.data);
    return response.data.available;
  } catch (error) {
    console.error(
      "\nError checking Claude API status:",
      error.response?.data?.error || error.message
    );
    return false;
  }
}

/**
 * Get available prompt roles from MCP
 */
async function getPromptRoles() {
  try {
    console.log("Getting available prompt roles...");
    const response = await axios.get(`${TEST_CLAUDE_ENDPOINT}/prompts`, {
      timeout: 10000,
    });
    console.log("Available prompt roles:");
    response.data.forEach((prompt) => {
      console.log(`- ${prompt.id}: ${prompt.name}`);
    });
    return response.data;
  } catch (error) {
    console.error(
      "\nError getting prompt roles:",
      error.response?.data?.error || error.message
    );
    return [];
  }
}

/**
 * Send a message to Claude with MCP context
 */
async function sendMessageToClaude(message, promptRole = "developer") {
  try {
    console.log(`Sending message to Claude with prompt role: ${promptRole}`);
    console.log(`Message: "${message}"`);

    const response = await axios.post(
      `${TEST_CLAUDE_ENDPOINT}/message`,
      {
        message,
        promptRole,
        directory: "/Users/thomasbutler/Documents/Firesite/firesite-mcp", // Sample directory
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // Increase timeout to 30 seconds
      }
    );

    console.log("\n----- Claude Response -----");
    console.log(response.data.message);
    console.log("----- End Response -----\n");

    return response.data;
  } catch (error) {
    console.error(
      "\nError sending message to Claude:",
      error.response?.data?.error || error.message
    );
    return null;
  }
}

/**
 * Run the test flow
 */
async function runTest() {
  try {
    // Check API status
    const claudeAvailable = await checkClaudeStatus();
    if (!claudeAvailable) {
      console.log(
        "\nClaude API is not available, but we will try to continue anyway..."
      );
      console.log("Trying simplified test without status check...");

      // Run simplified test without status checks
      return simplifiedTest();
    }

    // Get prompt roles
    const promptRoles = await getPromptRoles();
    if (promptRoles.length === 0) {
      console.warn("No prompt roles available. Using default.");
    }

    // Ask for prompt role
    rl.question(
      "\nEnter prompt role (default: developer): ",
      async (promptRole) => {
        const selectedRole = promptRole || "developer";

        // Ask for message
        rl.question("\nEnter message for Claude: ", async (message) => {
          if (!message) {
            console.error("Message cannot be empty");
            rl.close();
            return;
          }

          // Send message
          await sendMessageToClaude(message, selectedRole);

          // Ask if user wants to send another message
          askForAnotherMessage(selectedRole);
        });
      }
    );
  } catch (error) {
    console.error("Test failed:", error.message);
    console.log("Trying simplified test as fallback...");
    simplifiedTest();
  }
}

/**
 * Ask if user wants to send another message
 */
function askForAnotherMessage(currentRole) {
  rl.question("\nSend another message? (y/n): ", (answer) => {
    if (answer.toLowerCase() === "y") {
      rl.question("\nEnter message for Claude: ", async (message) => {
        if (!message) {
          console.error("Message cannot be empty");
          rl.close();
          return;
        }

        // Send message
        await sendMessageToClaude(message, currentRole);

        // Ask again
        askForAnotherMessage(currentRole);
      });
    } else {
      console.log("Test completed. Goodbye!");
      rl.close();
    }
  });
}

// Run the test
console.log("=== Claude with MCP Integration Test ===");
console.log(`API Endpoint: ${TEST_CLAUDE_ENDPOINT}`);
runTest();
