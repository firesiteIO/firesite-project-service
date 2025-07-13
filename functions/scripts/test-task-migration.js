/**
 * Test script to verify the Task API migration from MCP server to Firebase Functions
 * 
 * This script tests both the direct Firebase Functions endpoints and the MCP client forwarding
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const mcpClient = require('../src/services/mcp-client');

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../.env.development'),
});

// Configuration - use environment variables with fallbacks for port discovery
const FIREBASE_FUNCTIONS_BASE_URL = process.env.FIREBASE_FUNCTIONS_URL || 'http://localhost:5000';
const FIREBASE_FUNCTIONS_URL = `${FIREBASE_FUNCTIONS_BASE_URL}/firesite-ai-f3bc8/us-central1`;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';
const TEST_TASK = {
  title: 'Test Task for Migration',
  description: 'This is a test task created during the migration test',
  status: 'todo',
  priority: 'medium',
};

console.log(`Using Firebase Functions Base URL: ${FIREBASE_FUNCTIONS_BASE_URL}`);
console.log(`Using Firebase Functions Full URL: ${FIREBASE_FUNCTIONS_URL}`);
console.log(`Using MCP Server URL: ${MCP_SERVER_URL}`);

/**
 * Test Firebase Functions task endpoints directly
 */
async function testFirebaseFunctionsTasks() {
  console.log('\n=== Testing Firebase Functions Task Endpoints Directly ===');
  
  try {
    // Test creating a task
    console.log('\nCreating a test task...');
    const createResponse = await axios.post(`${FIREBASE_FUNCTIONS_URL}/api/tasks`, TEST_TASK);
    
    console.log('Status:', createResponse.status);
    console.log('Response:', createResponse.data);
    
    if (createResponse.status !== 201 || !createResponse.data.id) {
      console.log('Test result: FAILED - Could not create task');
      return false;
    }
    
    const taskId = createResponse.data.id;
    console.log(`Task created with ID: ${taskId}`);
    
    // Test getting the task
    console.log('\nGetting the created task...');
    const getResponse = await axios.get(`${FIREBASE_FUNCTIONS_URL}/api/tasks/${taskId}`);
    
    console.log('Status:', getResponse.status);
    console.log('Response:', getResponse.data);
    
    if (getResponse.status !== 200 || getResponse.data.id !== taskId) {
      console.log('Test result: FAILED - Could not get task');
      return false;
    }
    
    // Test updating the task
    console.log('\nUpdating the task...');
    const updateResponse = await axios.put(`${FIREBASE_FUNCTIONS_URL}/api/tasks/${taskId}`, {
      description: 'Updated description during migration test',
    });
    
    console.log('Status:', updateResponse.status);
    console.log('Response:', updateResponse.data);
    
    if (updateResponse.status !== 200 || updateResponse.data.description !== 'Updated description during migration test') {
      console.log('Test result: FAILED - Could not update task');
      return false;
    }
    
    // Test deleting the task
    console.log('\nDeleting the task...');
    const deleteResponse = await axios.delete(`${FIREBASE_FUNCTIONS_URL}/api/tasks/${taskId}`);
    
    console.log('Status:', deleteResponse.status);
    
    if (deleteResponse.status !== 204) {
      console.log('Test result: FAILED - Could not delete task');
      return false;
    }
    
    console.log('Test result: SUCCESS - All direct Firebase Functions task endpoints working');
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
 * Test MCP client forwarding to Firebase Functions
 */
async function testMcpClientForwarding() {
  console.log('\n=== Testing MCP Client Forwarding to Firebase Functions ===');
  
  try {
    // Test creating a task via MCP client
    console.log('\nCreating a test task via MCP client...');
    const createdTask = await mcpClient.createTask(TEST_TASK);
    
    console.log('Response:', createdTask);
    
    if (!createdTask || !createdTask.id) {
      console.log('Test result: FAILED - Could not create task via MCP client');
      return false;
    }
    
    const taskId = createdTask.id;
    console.log(`Task created with ID: ${taskId}`);
    
    // Test getting the task via MCP client
    console.log('\nGetting the created task via MCP client...');
    const task = await mcpClient.getTask(taskId);
    
    console.log('Response:', task);
    
    if (!task || task.id !== taskId) {
      console.log('Test result: FAILED - Could not get task via MCP client');
      return false;
    }
    
    // Test updating the task via MCP client
    console.log('\nUpdating the task via MCP client...');
    const updatedTask = await mcpClient.updateTask(taskId, {
      description: 'Updated description via MCP client during migration test',
    });
    
    console.log('Response:', updatedTask);
    
    if (!updatedTask || updatedTask.description !== 'Updated description via MCP client during migration test') {
      console.log('Test result: FAILED - Could not update task via MCP client');
      return false;
    }
    
    // Test deleting the task via MCP client
    console.log('\nDeleting the task via MCP client...');
    const deleteResult = await mcpClient.deleteTask(taskId);
    
    console.log('Response:', deleteResult);
    
    if (!deleteResult) {
      console.log('Test result: FAILED - Could not delete task via MCP client');
      return false;
    }
    
    console.log('Test result: SUCCESS - All MCP client task operations working');
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Test result: FAILED');
    return false;
  }
}

/**
 * Test MCP server task routes (should be removed)
 */
async function testMcpServerTaskRoutes() {
  console.log('\n=== Testing MCP Server Task Routes (Should Be Removed) ===');
  
  try {
    // Try to access the task routes directly on the MCP server
    console.log('\nTrying to access task routes on MCP server...');
    const response = await axios.get(`${MCP_SERVER_URL}/api/tasks`);
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    console.log('Test result: FAILED - Task routes still exist on MCP server');
    return false;
  } catch (error) {
    // We expect this to fail with a 404 error
    if (error.response && error.response.status === 404) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
      console.log('Test result: SUCCESS - Task routes have been removed from MCP server');
      return true;
    } else {
      console.error('Unexpected error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      console.log('Test result: FAILED - Unexpected error');
      return false;
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Task API Migration Test ===');
  console.log('Firebase Functions URL:', FIREBASE_FUNCTIONS_URL);
  console.log('MCP Server URL:', MCP_SERVER_URL);
  
  let results = {
    firebaseFunctionsTasks: false,
    mcpClientForwarding: false,
    mcpServerTaskRoutes: false,
  };
  
  try {
    // Test Firebase Functions task endpoints directly
    results.firebaseFunctionsTasks = await testFirebaseFunctionsTasks();
    
    // Test MCP client forwarding to Firebase Functions
    results.mcpClientForwarding = await testMcpClientForwarding();
    
    // Test MCP server task routes (should be removed)
    results.mcpServerTaskRoutes = await testMcpServerTaskRoutes();
    
    // Print summary
    console.log('\n=== Test Summary ===');
    console.log('Firebase Functions Task Endpoints:', results.firebaseFunctionsTasks ? 'PASSED' : 'FAILED');
    console.log('MCP Client Forwarding:', results.mcpClientForwarding ? 'PASSED' : 'FAILED');
    console.log('MCP Server Task Routes Removed:', results.mcpServerTaskRoutes ? 'PASSED' : 'FAILED');
    
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
