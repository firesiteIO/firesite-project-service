/**
 * Background task management for Firebase Functions with MCP server integration
 * This file provides Firebase Functions that can start and monitor background tasks
 * using the MCP server while providing real-time updates via SSE.
 */

const functions = require("firebase-functions");
const { admin } = require("../../../config/firebase-admin");
const mcpClient = require("../../services/mcp-client");

// Get database reference
const db = admin.database();

/**
 * Start a background task and create a tracking record in RTDB
 */
exports.startBackgroundTask = functions.https.onCall(async (data, context) => {
  try {
    // Required authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const { taskType, params = {} } = data;

    if (!taskType) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Task type is required"
      );
    }

    // Generate a unique task ID
    const taskId = `task-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    // Create a record in RTDB
    const taskRef = db.ref(`tasks/${taskId}`);
    await taskRef.set({
      id: taskId,
      type: taskType,
      params,
      status: "starting",
      progress: 0,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      createdBy: context.auth.uid,
      updates: [
        {
          status: "starting",
          message: "Task is being initialized",
          timestamp: admin.database.ServerValue.TIMESTAMP,
        },
      ],
    });

    // Based on task type, delegate to MCP server
    let response;
    switch (taskType) {
      case "project-analysis":
        // Start project analysis in MCP via its tool
        response = await mcpClient.executeCommand("analyze-project", {
          projectId: params.projectId,
          deep: params.deep || false,
          taskId, // Pass the taskId for tracking
        });
        break;

      case "search-project":
        // Start project search in MCP
        response = await mcpClient.executeCommand("search-project", {
          projectId: params.projectId,
          query: params.query,
          fileTypes: params.fileTypes,
          taskId,
        });
        break;

      default:
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Unknown task type: ${taskType}`
        );
    }

    // Update the task with initial response
    await taskRef.update({
      status: "running",
      updates: admin.database.FieldValue.arrayUnion({
        status: "running",
        message: "Task is now running",
        timestamp: admin.database.ServerValue.TIMESTAMP,
      }),
    });

    // Return the task information to the client
    return {
      taskId,
      status: "running",
      message: "Task started successfully",
      initialResponse: response,
    };
  } catch (error) {
    console.error("Error starting background task:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Unknown error starting task"
    );
  }
});

/**
 * Update a task's progress or status
 * This is called by the MCP server to update task progress
 */
exports.updateTaskProgress = functions.https.onRequest(async (req, res) => {
  try {
    // This endpoint is intended for internal use by the MCP server
    // Add appropriate security/authentication here

    const { taskId, progress, status, message } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    // Get the task reference
    const taskRef = db.ref(`tasks/${taskId}`);
    const taskSnapshot = await taskRef.once("value");

    if (!taskSnapshot.exists()) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Build update object
    const updates = {};

    if (progress !== undefined) {
      updates.progress = progress;
    }

    if (status) {
      updates.status = status;
    }

    // Create a new update entry
    const updateEntry = {
      timestamp: admin.database.ServerValue.TIMESTAMP,
      status: status || taskSnapshot.val().status,
      message: message || "Task updated",
    };

    // Update the task
    await taskRef.update({
      ...updates,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      updates: admin.database.FieldValue.arrayUnion(updateEntry),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating task progress:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
});

/**
 * Get a specific task's details
 */
exports.getTaskDetails = functions.https.onCall(async (data, context) => {
  try {
    // Required authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const { taskId } = data;

    if (!taskId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Task ID is required"
      );
    }

    // Get the task
    const taskSnapshot = await db.ref(`tasks/${taskId}`).once("value");

    if (!taskSnapshot.exists()) {
      throw new functions.https.HttpsError("not-found", "Task not found");
    }

    return taskSnapshot.val();
  } catch (error) {
    console.error("Error getting task details:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Unknown error getting task details"
    );
  }
});

/**
 * List all tasks for the current user
 */
exports.listTasks = functions.https.onCall(async (data, context) => {
  try {
    // Required authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const { limit = 10, status } = data;

    // Get user's tasks
    let query = db
      .ref("tasks")
      .orderByChild("createdBy")
      .equalTo(context.auth.uid);

    if (status) {
      query = db.ref("tasks").orderByChild("status").equalTo(status);
    }

    const snapshot = await query.limitToLast(limit).once("value");

    const tasks = [];
    snapshot.forEach((childSnapshot) => {
      tasks.push(childSnapshot.val());
    });

    return tasks.reverse(); // Most recent first
  } catch (error) {
    console.error("Error listing tasks:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Unknown error listing tasks"
    );
  }
});
