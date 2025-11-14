const express = require('express');
const router = express.Router();
const environmentController = require('../controllers/environmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all environments
router.get('/', environmentController.getAllEnvironments);

// Get environment statistics
router.get('/statistics', environmentController.getEnvironmentStatistics);

// Get environment by ID
router.get('/:id', environmentController.getEnvironmentById);

// Get environment availability
router.get('/:id/availability', environmentController.getEnvironmentAvailability);

// Configuration management for environments
router.get('/:id/configs', environmentController.getConfigurations);
router.post('/:id/configs', authorizeRoles('admin', 'manager'), environmentController.createConfiguration);
router.put('/:id/configs/:configId', authorizeRoles('admin', 'manager'), environmentController.updateConfiguration);
router.delete('/:id/configs/:configId', authorizeRoles('admin'), environmentController.deleteConfiguration);

// Create environment (admin/manager only)
router.post('/', authorizeRoles('admin', 'manager'), environmentController.createEnvironment);

// Update environment (admin/manager only)
router.put('/:id', authorizeRoles('admin', 'manager'), environmentController.updateEnvironment);

// Delete environment (admin only)
router.delete('/:id', authorizeRoles('admin'), environmentController.deleteEnvironment);

module.exports = router;
