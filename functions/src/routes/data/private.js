/**
 * @fileoverview Private authenticated routes
 * @module routes/data/private
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../config/firebase-admin');
const { handleError } = require('../../utils/error-handler');
const auth = require('../../middleware/auth');

router.get('/*?', auth.required, async (req, res) => {
  const pathParts = req.params[0] ? req.params[0].split('/').filter(Boolean) : [];
  console.log(`Fetching from privateStuff, path: ${pathParts.join('/')}`);

  try {
    // Return collection (only documents owned by user)
    if (pathParts.length === 0) {
      const snapshot = await db
        .collection('privateStuff')
        .where('userId', '==', req.user.uid)
        .get();

      if (snapshot.empty) {
        return handleError(404, req, res);
      }

      const results = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return res.json(results);
    }

    // Get specific document
    const [docId, ...remainingParts] = pathParts;
    const doc = await db.collection('privateStuff').doc(docId).get();

    if (!doc.exists) {
      return handleError(404, req, res);
    }

    // Check document ownership
    const data = doc.data();
    if (data.userId !== req.user.uid) {
      return handleError(403, req, res);
    }

    // Handle nested paths
    let result = data;
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
    console.error('Error:', error);
    handleError(500, req, res);
  }
});

module.exports = router;
