const { db } = require('../../config/firebase-admin');

/**
 * Firestore Service
 * @module services/firestore
 */

/**
 * Generic document fetcher with error handling
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @returns {Promise<Object|null>} Document data or null if not found
 * @throws {Error} Database operation error
 */
async function getDocument(collection, id) {
  try {
    const doc = await db.collection(collection).doc(id).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error(`Error fetching ${collection}/${id}:`, error);
    throw error;
  }
}

/**
 * Generic document creator with error handling
 * @param {string} collection - Collection name
 * @param {string} id - Document ID
 * @param {Object} data - Document data
 * @returns {Promise<void>}
 * @throws {Error} Database operation error
 */
async function createDocument(collection, id, data) {
  try {
    await db
      .collection(collection)
      .doc(id)
      .set({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  } catch (error) {
    console.error(`Error creating ${collection}/${id}:`, error);
    throw error;
  }
}

module.exports = {
  getDocument,
  createDocument,
  db, // Export raw db for advanced operations
};
