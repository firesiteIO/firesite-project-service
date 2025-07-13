/**
 * @fileoverview Data routes main router
 * @module routes/data
 */

const express = require('express');
const router = express.Router();

// Data routes logging middleware
router.use((req, res, next) => {
  console.log('=== Data Route Hit ===');
  console.log('Full path:', req.baseUrl + req.path);
  console.log('Params:', req.params);
  next();
});

// Import route modules
const publicRoutes = require('./public');
const privateRoutes = require('./private');
const serviceRoutes = require('./service');

// Mount routes
router.use('/', publicRoutes);
router.use('/privateStuff', privateRoutes);
router.use('/privateStuff', serviceRoutes);

module.exports = router;
