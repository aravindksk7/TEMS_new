const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get monitoring dashboard
router.get('/dashboard', monitoringController.getMonitoringDashboard);

// Get all environment metrics
router.get('/metrics', monitoringController.getAllEnvironmentMetrics);

// Get environment metrics
router.get('/environments/:id/metrics', monitoringController.getEnvironmentMetrics);

// Get environment health
router.get('/environments/:id/health', monitoringController.getEnvironmentHealth);

// Record metric (admin/manager only)
router.post('/metrics', authorizeRoles('admin', 'manager'), monitoringController.recordMetric);

// Get paginated activities
router.get('/activities', monitoringController.getActivities);

module.exports = router;
