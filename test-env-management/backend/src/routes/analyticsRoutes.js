const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get analytics dashboard
router.get('/dashboard', analyticsController.getAnalyticsDashboard);

// Get environment utilization
router.get('/utilization', analyticsController.getEnvironmentUtilization);

// Get user activity report
router.get('/user-activity', authorizeRoles('admin', 'manager'), analyticsController.getUserActivityReport);

// Get conflict analysis
router.get('/conflicts', analyticsController.getConflictAnalysis);

// Get booking trends
router.get('/trends', analyticsController.getBookingTrends);

// Get environment performance
router.get('/performance', analyticsController.getEnvironmentPerformance);

// Export report
router.get('/export', authorizeRoles('admin', 'manager'), analyticsController.exportReport);

module.exports = router;
