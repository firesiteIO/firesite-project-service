/**
 * @fileoverview Public data access routes
 * @module routes/data/public
 */

const express = require("express");
const router = express.Router();
const firestoreService = require("../../services/firestore");
const { handleError } = require("../../utils/error-handler");
const admin = require("firebase-admin");

// Legal document route MUST come before the catch-all route
router.get("/legal/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;
    console.log("Legal document request:", {
      documentId,
      url: req.url,
      path: req.path,
    });

    const storage = admin.storage();
    const bucket = storage.bucket();
    const file = bucket.file(`docs/legal/${documentId}.html`);

    const [exists] = await file.exists();
    if (!exists) {
      console.log(`Document not found: docs/legal/${documentId}.html`);
      return res.status(404).send("Document not found");
    }

    console.log("Serving legal document:", documentId);
    const [content] = await file.download();
    res.set("Content-Type", "text/html");
    res.send(content);
  } catch (error) {
    console.error("Error serving legal document:", error);
    res.status(500).send("Error serving document");
  }
});

/**
 * Get collection or document by path
 * @route GET /:collection/*
 */
router.get(["/:collection", "/:collection/*"], async (req, res) => {
  const { collection } = req.params;

  // Block access to privateStuff through public route
  if (collection === "privateStuff") {
    return handleError(403, req, res);
  }

  // Handle path parts, accounting for both with and without trailing slash
  const pathParts = req.params[0]
    ? req.params[0].split("/").filter(Boolean)
    : [];

  try {
    // If no path parts, return entire collection
    if (pathParts.length === 0) {
      const snapshot = await firestoreService.db.collection(collection).get();
      if (snapshot.empty) {
        return handleError(404, req, res);
      }
      const results = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return res.json(results);
    }

    // If we have path parts, handle document and nested fields
    const [docId, ...remainingParts] = pathParts;
    const doc = await firestoreService.db
      .collection(collection)
      .doc(docId)
      .get();

    if (!doc.exists) {
      return handleError(404, req, res);
    }

    let result = doc.data();
    if (remainingParts.length > 0) {
      for (const key of remainingParts) {
        result = result[key];
        if (result === undefined) {
          return handleError(404, req, res);
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    handleError(500, req, res);
  }
});

module.exports = router;
