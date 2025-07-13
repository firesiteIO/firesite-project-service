/**
 * @fileoverview Task API routes for Firebase Functions
 * @module routes/api/tasks
 */

const express = require("express");
const router = express.Router();
const taskService = require("../../services/task-service");
const { handleError } = require("../../utils/error-handler");
const admin = require("firebase-admin");

// For now, assume all requests are authenticated - remove auth middleware

/**
 * Get all tasks
 * @route GET /api/tasks
 */
router.get("/", async (req, res) => {
  try {
    console.log("GET /tasks - Fetching tasks");
    const options = {
      projectId: req.query.projectId,
      status: req.query.status,
    };

    const tasks = await taskService.getTasks(options);
    console.log(`Found ${tasks.length} tasks`);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      error: "Error fetching tasks",
      message: error.message,
    });
  }
});

/**
 * Get a specific task by ID
 * @route GET /api/tasks/:taskId
 */
router.get("/:taskId", async (req, res) => {
  try {
    console.log(`GET /tasks/${req.params.taskId} - Fetching task`);
    const { taskId } = req.params;
    const task = await taskService.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
        message: `Task with ID ${taskId} not found`,
      });
    }

    res.json(task);
  } catch (error) {
    console.error(`Error fetching task ${req.params.taskId}:`, error);
    res.status(500).json({
      error: "Error fetching task",
      message: error.message,
    });
  }
});

/**
 * Create a new task
 * @route POST /api/tasks
 */
router.post("/", async (req, res) => {
  try {
    console.log("POST /tasks - Creating task:", req.body);
    const taskData = req.body;

    // Basic validation
    if (!taskData.title) {
      return res.status(400).json({
        error: "Validation error",
        message: "Task title is required",
      });
    }

    const createdTask = await taskService.createTask(taskData);
    console.log("Task created:", createdTask.id);
    res.status(201).json(createdTask);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({
      error: "Error creating task",
      message: error.message,
    });
  }
});

/**
 * Update a task
 * @route PUT /api/tasks/:taskId
 */
router.put("/:taskId", async (req, res) => {
  try {
    console.log(`PUT /tasks/${req.params.taskId} - Updating task`);
    const { taskId } = req.params;
    const updates = req.body;

    const updatedTask = await taskService.updateTask(taskId, updates);
    console.log("Task updated:", taskId);
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error updating task ${req.params.taskId}:`, error);
    res.status(500).json({
      error: "Error updating task",
      message: error.message,
    });
  }
});

/**
 * Delete a task
 * @route DELETE /api/tasks/:taskId
 */
router.delete("/:taskId", async (req, res) => {
  try {
    console.log(`DELETE /tasks/${req.params.taskId} - Deleting task`);
    const { taskId } = req.params;
    const result = await taskService.deleteTask(taskId);

    if (!result) {
      return res.status(404).json({
        error: "Task not found",
        message: `Task with ID ${taskId} not found`,
      });
    }

    console.log("Task deleted:", taskId);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting task ${req.params.taskId}:`, error);
    res.status(500).json({
      error: "Error deleting task",
      message: error.message,
    });
  }
});

/**
 * Move a task to a different group/column
 * @route PUT /api/tasks/:taskId/move
 */
router.put("/:taskId/move", async (req, res) => {
  try {
    console.log(`PUT /tasks/${req.params.taskId}/move - Moving task`);
    const { taskId } = req.params;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({
        error: "Validation error",
        message: "Group ID is required",
      });
    }

    const updatedTask = await taskService.moveTask(taskId, groupId);
    console.log("Task moved:", taskId, "to group:", groupId);
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error moving task ${req.params.taskId}:`, error);
    res.status(500).json({
      error: "Error moving task",
      message: error.message,
    });
  }
});

// Add a test endpoint that uses the admin SDK directly
router.get("/test-create", async (req, res) => {
  try {
    console.log("Creating a test task using admin SDK directly");

    // Create a task directly with admin SDK
    const taskData = {
      title: "Test Task via Admin SDK",
      description: "This is a test task created directly via Admin SDK",
      status: "todo",
      priority: "medium",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "server-side-app",
    };

    const docRef = await admin.firestore().collection("tasks").add(taskData);
    console.log(`Test task created with ID: ${docRef.id}`);

    res.json({
      success: true,
      message: "Test task created successfully",
      taskId: docRef.id,
    });
  } catch (error) {
    console.error("Error creating test task:", error);
    res.status(500).json({
      error: "Error creating test task",
      message: error.message,
    });
  }
});

module.exports = router;
