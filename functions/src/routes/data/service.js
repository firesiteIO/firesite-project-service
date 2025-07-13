/**
 * @fileoverview Service account operations
 * @module routes/data/service
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../config/firebase-admin');
const { handleError } = require('../../utils/error-handler');
const auth = require('../../middleware/auth');

router.post('/*', auth.serviceOnly, async (req, res) => {
  const pathParts = req.params[0] ? req.params[0].split('/').filter(Boolean) : [];
  console.log(`Service account operation on privateStuff, path: ${pathParts.join('/')}`);

  try {
    if (pathParts.length === 0) {
      return handleError(400, req, res);
    }

    const [docId, ...remainingParts] = pathParts;
    const docRef = db.collection('privateStuff').doc(docId);
    const data = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: 'service-account',
    };

    // For new documents, add creation metadata
    const doc = await docRef.get();
    if (!doc.exists) {
      data.createdAt = new Date();
      data.createdBy = 'service-account';
    }

    await docRef.set(data, { merge: true });
    res.json({ success: true, id: docId, data });
  } catch (error) {
    console.error('Service account operation error:', error);
    handleError(500, req, res);
  }
});

module.exports = router;
