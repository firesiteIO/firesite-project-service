/**
 * @fileoverview Project API routes for Firebase Functions
 * @module routes/api/projects
 */

const express = require("express");
const router = express.Router();
const projectService = require("../../services/project-service");
const { handleError } = require("../../utils/error-handler");
const auth = require("../../middleware/auth");

/**
 * Get all projects
 * @route GET /api/projects
 */
router.get("/", auth.optional, async (req, res) => {
  try {
    const projects = await projectService.getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    handleError(500, req, res, "Failed to get projects");
  }
});

/**
 * Get a specific project by ID
 * @route GET /api/projects/:projectId
 */
router.get("/:projectId", auth.optional, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await projectService.getProject(projectId);

    if (!project) {
      return handleError(
        404,
        req,
        res,
        `Project with ID ${projectId} not found`
      );
    }

    res.json(project);
  } catch (error) {
    console.error(`Error fetching project ${req.params.projectId}:`, error);
    handleError(500, req, res, "Failed to get project");
  }
});

/**
 * Create a new project
 * @route POST /api/projects
 */
router.post("/", auth.optional, async (req, res) => {
  try {
    const projectData = req.body;

    // Add user ID if authenticated
    if (req.user && req.user.uid) {
      projectData.createdBy = req.user.uid;
    }

    // Basic validation
    if (!projectData.name) {
      return handleError(400, req, res, "Project name is required");
    }

    const createdProject = await projectService.createProject(projectData);
    res.status(201).json(createdProject);
  } catch (error) {
    console.error("Error creating project:", error);
    handleError(500, req, res, "Failed to create project");
  }
});

/**
 * Update a project
 * @route PUT /api/projects/:projectId
 */
router.put("/:projectId", auth.optional, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    // Add user ID if authenticated
    if (req.user && req.user.uid) {
      updates.updatedBy = req.user.uid;
    }

    const updatedProject = await projectService.updateProject(
      projectId,
      updates
    );
    res.json(updatedProject);
  } catch (error) {
    console.error(`Error updating project ${req.params.projectId}:`, error);
    handleError(500, req, res, "Failed to update project");
  }
});

/**
 * Delete a project
 * @route DELETE /api/projects/:projectId
 */
router.delete("/:projectId", auth.optional, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await projectService.deleteProject(projectId);

    if (!result) {
      return handleError(
        404,
        req,
        res,
        `Project with ID ${projectId} not found`
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting project ${req.params.projectId}:`, error);
    handleError(500, req, res, "Failed to delete project");
  }
});

module.exports = router;
