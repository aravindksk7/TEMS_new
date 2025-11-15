const express = require('express');
const router = express.Router();
const diagnosticController = require('../controllers/diagnosticController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Diagnostic endpoint (admin only for safety)
router.get('/dashboard', authenticateToken, authorizeRoles('admin', 'manager'), diagnosticController.getDashboardDiagnostic);

module.exports = router;
