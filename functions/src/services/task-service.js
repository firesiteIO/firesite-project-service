/**
 * @fileoverview Task service for Firebase Functions
 * @module services/task-service
 */

const admin = require("firebase-admin");
const firestoreService = require("./firestore");

/**
 * Get all tasks
 * @param {Object} options - Query options
 * @param {string} [options.projectId] - Filter by project ID
 * @param {string} [options.status] - Filter by task status
 * @returns {Promise<Array>} List of tasks
 */
async function getTasks(options = {}) {
  try {
    console.log("Task Service: Getting tasks with options:", options);
    let query = admin.firestore().collection("tasks");

    // Apply filters
    if (options.projectId) {
      console.log("Filtering by projectId:", options.projectId);
      query = query.where("projectId", "==", options.projectId);
    }

    if (options.status) {
      console.log("Filtering by status:", options.status);
      query = query.where("status", "==", options.status);
    }

    const snapshot = await query.get();
    console.log(`Retrieved ${snapshot.size} tasks from Firestore`);
    const tasks = [];

    snapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return tasks;
  } catch (error) {
    console.error("Error getting tasks in service:", error);
    throw error;
  }
}

/**
 * Get a specific task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
async function getTask(taskId) {
  try {
    console.log("Task Service: Getting task by ID:", taskId);
    const doc = await admin.firestore().collection("tasks").doc(taskId).get();

    if (!doc.exists) {
      console.log(`Task with ID ${taskId} not found`);
      return null;
    }

    console.log(`Task with ID ${taskId} found`);
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error(`Error getting task ${taskId} in service:`, error);
    throw error;
  }
}

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task with ID
 */
async function createTask(taskData) {
  try {
    console.log("Task Service: Creating new task with data:", taskData);
    // Add timestamps
    const now = new Date();
    const task = {
      ...taskData,
      createdAt: now,
      updatedAt: now,
    };

    // Create document with auto-generated ID
    const docRef = await admin.firestore().collection("tasks").add(task);
    console.log(`Task created with ID: ${docRef.id}`);

    return {
      id: docRef.id,
      ...task,
    };
  } catch (error) {
    console.error("Error creating task in service:", error);
    throw error;
  }
}

/**
 * Update a task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated task
 */
async function updateTask(taskId, updates) {
  try {
    console.log(`Task Service: Updating task ${taskId} with data:`, updates);
    // Add updated timestamp
    const updatedData = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update the document
    await admin.firestore().collection("tasks").doc(taskId).update(updatedData);
    console.log(`Task ${taskId} updated successfully`);

    // Get the updated document
    return await getTask(taskId);
  } catch (error) {
    console.error(`Error updating task ${taskId} in service:`, error);
    throw error;
  }
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @returns {Promise<boolean>} Whether deletion was successful
 */
async function deleteTask(taskId) {
  try {
    console.log(`Task Service: Deleting task ${taskId}`);
    // Check if task exists before deleting
    const taskRef = admin.firestore().collection("tasks").doc(taskId);
    const doc = await taskRef.get();

    if (!doc.exists) {
      console.log(`Task ${taskId} not found for deletion`);
      return false;
    }

    await taskRef.delete();
    console.log(`Task ${taskId} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting task ${taskId} in service:`, error);
    throw error;
  }
}

/**
 * Move a task to a different group/column
 * @param {string} taskId - Task ID
 * @param {string} groupId - Destination group ID
 * @returns {Promise<Object>} Updated task
 */
async function moveTask(taskId, groupId) {
  console.log(`Task Service: Moving task ${taskId} to group ${groupId}`);
  return await updateTask(taskId, { groupId });
}

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
};
