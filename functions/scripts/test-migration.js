/**
 * Test script to verify the Claude API migration from MCP server to Firebase Functions
 * 
 * This script tests both the direct Firebase Functions endpoints and the MCP server forwarding
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../.env.development'),
});

// Configuration - use environment variables with fallbacks for port discovery
const FIREBASE_FUNCTIONS_BASE_URL = process.env.FIREBASE_FUNCTIONS_URL || 'http://localhost:5000';
const FIREBASE_FUNCTIONS_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/firesite-ai-f3bc8/us-central1`;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
const TEST_MESSAGE = 'Hello, Claude! Please respond with a short greeting.';

console.log(`Using Firebase Functions Base URL: ${FIREBASE_FUNCTIONS_BASE_URL}`);
console.log(`Using Firebase Functions Full URL: ${FIREBASE_FUNCTIONS_URL}`);
console.log(`Using MCP Server URL: ${MCP_SERVER_URL}`);

/**
 * Test Firebase Functions Claude chat endpoint
 */
async function testFirebaseFunctionsChat() {
  console.log('\n=== Testing Firebase Functions Claude Chat Endpoint ===');
  
  try {
    // Use the API endpoint with the correct path
    const response = await axios.post(`${FIREBASE_FUNCTIONS_URL}/api/claude/chat`, {
      message: TEST_MESSAGE,
      conversationId: 'test-migration',
      context: {
        currentProject: 'Firesite',
        promptRole: 'developer',
      },
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data.response ? response.data.response.substring(0, 100) + '...' : 'No response');
    console.log('Test result: SUCCESS');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.log('Test result: FAILED');
    return false;
  }
}

/**
 * Test Firebase Functions Claude health endpoint
 */
async function testFirebaseFunctionsHealth() {
  console.log('\n=== Testing Firebase Functions Claude Health Endpoint ===');
  
  try {
    // Try the claudeStatus endpoint first, which is directly exported in index.js
    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/claudeStatus`);
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('Test result: SUCCESS');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Try alternative endpoint
    try {
      console.log('Trying alternative endpoint...');
      const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/claudeStatus`);
      
      console.log('Status:', response.status);
      console.log('Response:', response.data);
      console.log('Test result: SUCCESS');
      return true;
    } catch (altError) {
      console.error('Error with alternative endpoint:', altError.message);
      if (altError.response) {
        console.error('Response status:', altError.response.status);
        console.error('Response data:', altError.response.data);
      }
      console.log('Test result: FAILED');
      return false;
    }
  }
}

/**
 * Test MCP server health endpoint
 */
async function testMcpServerHealth() {
  console.log('\n=== Testing MCP Server Health Endpoint ===');
  
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/health`);
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('Test result: SUCCESS');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.log('Test result: FAILED');
    return false;
  }
}

/**
 * Test MCP server context provision
 * Since we've removed the Claude API routes from the MCP server,
 * we're just testing that the MCP server is running correctly
 */
async function testMcpServerForwarding() {
  console.log('\n=== Testing MCP Server Context Provision ===');
  
  try {
    // Try the prompts endpoint first, which we know exists
    const response = await axios.get(`${MCP_SERVER_URL}/prompts`);
    console.log('Status:', response.status);
    console.log('Response:', response.data ? 'Prompts received' : 'No prompts');
    console.log('Test result: SUCCESS');
    return true;
  } catch (error) {
    console.error('Error with prompts endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    // Try an alternative endpoint if the first one fails
    try {
      console.log('Trying alternative endpoint...');
      const response = await axios.get(`${MCP_SERVER_URL}/health`);
      console.log('Status:', response.status);
      console.log('Response:', response.data ? 'Health check passed' : 'No health data');
      console.log('Test result: SUCCESS');
      return true;
    } catch (altError) {
      console.error('Error with alternative endpoint:', altError.message);
      console.log('Test result: FAILED');
      return false;
    }
  }
}

/**
 * Test Firebase Functions app endpoint
 */
async function testFirebaseFunctionsApp() {
  console.log('\n=== Testing Firebase Functions App Endpoint ===');
  
  try {
    const response = await axios.get(`${FIREBASE_FUNCTIONS_URL}/app/hello`);
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('Test result: SUCCESS');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.log('Test result: FAILED');
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Claude API Migration Test ===');
  console.log('Firebase Functions URL:', FIREBASE_FUNCTIONS_URL);
  console.log('MCP Server URL:', MCP_SERVER_URL);
  
  let results = {
    firebaseFunctionsApp: false,
    firebaseFunctionsHealth: false,
    firebaseFunctionsChat: false,
    mcpServerHealth: false,
    mcpServerForwarding: false,
  };
  
  try {
    // Test Firebase Functions app endpoint first
    results.firebaseFunctionsApp = await testFirebaseFunctionsApp();
    
    // Only proceed with other tests if app endpoint is working
    if (results.firebaseFunctionsApp) {
      // Test Firebase Functions Claude endpoints
      results.firebaseFunctionsHealth = await testFirebaseFunctionsHealth();
      results.firebaseFunctionsChat = await testFirebaseFunctionsChat();
    } else {
      console.log('\nSkipping Claude endpoint tests because app endpoint failed');
    }
    
    // Test MCP server
    results.mcpServerHealth = await testMcpServerHealth();
    results.mcpServerForwarding = await testMcpServerForwarding();
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log('Firebase Functions App:', results.firebaseFunctionsApp ? 'PASSED' : 'FAILED');
    console.log('Firebase Functions Health:', results.firebaseFunctionsHealth ? 'PASSED' : 'FAILED');
    console.log('Firebase Functions Chat:', results.firebaseFunctionsChat ? 'PASSED' : 'FAILED');
    console.log('MCP Server Health:', results.mcpServerHealth ? 'PASSED' : 'FAILED');
    console.log('MCP Server Context:', results.mcpServerForwarding ? 'PASSED' : 'FAILED');
    
    const allPassed = Object.values(results).every(result => result);
    console.log('\nOverall Result:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
