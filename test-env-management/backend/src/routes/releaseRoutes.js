const express = require('express');
const router = express.Router();
const releaseController = require('../controllers/releaseController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Release CRUD routes
router.get('/', releaseController.getAllReleases);
router.get('/statistics', releaseController.getReleaseStatistics);
router.get('/:id', releaseController.getReleaseById);
router.post('/', releaseController.createRelease);
router.put('/:id', releaseController.updateRelease);
router.delete('/:id', releaseController.deleteRelease);

// Release-Environment association routes
router.post('/environments', releaseController.associateEnvironment);
router.put('/environments/:id', releaseController.updateReleaseEnvironment);
router.delete('/environments/:release_id/:environment_id', releaseController.removeEnvironment);

// Release-Component association routes
router.post('/components', releaseController.associateComponent);
router.delete('/components/:release_id/:component_id', releaseController.removeComponent);

module.exports = router;
