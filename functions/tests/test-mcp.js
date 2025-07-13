/**
 * MCP Server Integration Test Script
 *
 * Tests the connection between Firebase Functions and the MCP server.
 * Verifies that MCP endpoints are accessible and returning expected data.
 */

// Load environment variables if needed
require("dotenv").config({ path: ".env.development" });

const axios = require("axios");
const chalk = require("chalk") || {
  green: (t) => t,
  red: (t) => t,
  yellow: (t) => t,
  blue: (t) => t,
  gray: (t) => t,
};

// Get MCP server URL from environment or use default
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
console.log(`Using MCP server URL: ${MCP_SERVER_URL}`);

// Create axios instance for MCP server
const mcpClient = axios.create({
  baseURL: MCP_SERVER_URL,
  timeout: 5000,
});

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Test 1: Health Check
    console.log(chalk.blue("Checking MCP server health..."));
    const healthResponse = await mcpClient.get("/health");
    console.log(
      chalk.green("MCP server health check response:"),
      healthResponse.data
    );

    // Test 2: Get Available Prompts
    console.log(chalk.blue("\nFetching available prompts..."));
    const promptsResponse = await mcpClient.get("/prompts");
    console.log(chalk.green(`Found ${promptsResponse.data.length} prompts:`));
    promptsResponse.data.forEach((prompt) => {
      console.log(`- ${prompt.id}: ${prompt.name}`);
    });

    // Test 3: Get Developer Prompt
    console.log(chalk.blue("\nFetching developer prompt..."));
    const devPromptResponse = await mcpClient.get("/prompts/developer");
    console.log(
      chalk.green("Developer prompt name:"),
      devPromptResponse.data.name
    );
    console.log(
      chalk.green("Developer prompt description:"),
      devPromptResponse.data.description
    );

    // Test 4: Get Context
    console.log(chalk.blue("\nFetching context..."));
    const contextResponse = await mcpClient.get("/context", {
      params: { format: "markdown" },
    });

    // Display first 200 characters of context
    const contextExcerpt = contextResponse.data.substring(0, 200) + "...";
    console.log(chalk.green("Context excerpt (first 200 chars):"));
    console.log(contextExcerpt);

    // Test 5: Test File Access (Optional)
    try {
      console.log(chalk.blue("\nTesting file access..."));
      const fileResponse = await mcpClient.get("/file", {
        params: { path: "package.json" },
      });
      console.log(
        chalk.green("File access successful. File type:"),
        fileResponse.data.type || "unknown"
      );
    } catch (error) {
      console.log(
        chalk.yellow("File access test skipped or failed:"),
        error.response?.data?.message || error.message
      );
    }

    // Test 6: Test Command Execution (Optional - be careful)
    try {
      console.log(chalk.blue('\nTesting command execution with "pwd"...'));
      const cmdResponse = await mcpClient.post("/execute", {
        command: "pwd",
      });
      console.log(
        chalk.green("Command execution successful:"),
        cmdResponse.data
      );
    } catch (error) {
      console.log(
        chalk.yellow("Command execution test skipped or failed:"),
        error.response?.data?.message || error.message
      );
    }

    console.log(chalk.green("\nMCP integration test completed successfully!"));
  } catch (error) {
    console.error(chalk.red("MCP integration test failed:"), error.message);

    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(
        chalk.red("Server responded with status:"),
        error.response.status
      );
      console.error(chalk.red("Response data:"), error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error(
        chalk.red(
          "No response received from server. Is the MCP server running?"
        )
      );
    } else {
      // Something happened in setting up the request
      console.error(chalk.red("Error setting up request:"), error.message);
    }

    process.exit(1);
  }
}

// Run the tests
runTests();
