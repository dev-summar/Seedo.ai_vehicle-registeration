/**
 * Admin routes - separate from PI-360. Uses custom admin JWT.
 * All routes under /api/admin except login are protected by adminAuthMiddleware.
 */
const express = require('express');
const { adminAuthMiddleware } = require('../middleware/adminAuth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Public
router.post('/login', adminController.login);

// Protected - require admin JWT
router.get('/me', adminAuthMiddleware, adminController.me);
router.get('/vehicles', adminAuthMiddleware, adminController.getVehicles);
router.delete('/vehicles/:id', adminAuthMiddleware, adminController.deleteVehicle);

module.exports = router;
