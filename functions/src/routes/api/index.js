/**
 * @fileoverview API routes for external services
 * @module routes/api
 */

const express = require("express");
const router = express.Router();
const { db } = require("../../../config/firebase-admin");

// Add a test endpoint
router.get("/test", (req, res) => {
  console.log("Test endpoint hit");
  res.json({
    message: "API test endpoint working!",
    timestamp: new Date().toISOString(),
  });
});

// Mount invite routes
const invitesRouter = require("./invites");
router.use("/invites", invitesRouter);

// Mount verify routes
const verifyRouter = require("./verify");
router.use("/verify", verifyRouter);

// Mount Anthropic API proxy routes
const anthropicRouter = require("./anthropic");
router.use("/anthropic", anthropicRouter);

// Mount Claude routes
const claudeRouter = require("../claude");
router.use("/claude", claudeRouter);

// Mount task routes
const tasksRouter = require("./tasks");
router.use("/tasks", tasksRouter);

// Mount project routes
const projectsRouter = require("./projects");
router.use("/projects", projectsRouter);

module.exports = router;
