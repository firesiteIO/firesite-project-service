/**
 * @fileoverview Project service for Firebase Functions
 * @module services/project-service
 */

const admin = require("firebase-admin");

/**
 * Get all projects
 * @returns {Promise<Array>} List of projects
 */
async function getProjects() {
  try {
    const snapshot = await admin.firestore().collection("projects").get();
    const projects = [];

    snapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return projects;
  } catch (error) {
    console.error("Error getting projects:", error);
    throw error;
  }
}

/**
 * Get a specific project by ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Project object or null if not found
 */
async function getProject(projectId) {
  try {
    const doc = await admin
      .firestore()
      .collection("projects")
      .doc(projectId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error(`Error getting project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project with ID
 */
async function createProject(projectData) {
  try {
    // Add timestamps
    const now = new Date();
    const project = {
      ...projectData,
      createdAt: now,
      updatedAt: now,
    };

    // Create document with auto-generated ID
    const docRef = await admin.firestore().collection("projects").add(project);

    return {
      id: docRef.id,
      ...project,
    };
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

/**
 * Update a project
 * @param {string} projectId - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated project
 */
async function updateProject(projectId, updates) {
  try {
    // Add updated timestamp
    const updatedData = {
      ...updates,
      updatedAt: new Date(),
    };

    // Update the document
    await admin
      .firestore()
      .collection("projects")
      .doc(projectId)
      .update(updatedData);

    // Get the updated document
    return await getProject(projectId);
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Delete a project
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} Whether deletion was successful
 */
async function deleteProject(projectId) {
  try {
    await admin.firestore().collection("projects").doc(projectId).delete();
    return true;
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
}

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
};
