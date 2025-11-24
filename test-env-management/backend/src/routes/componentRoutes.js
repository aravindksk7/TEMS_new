const express = require('express');
const router = express.Router();
const componentController = require('../controllers/componentController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Component CRUD routes
router.get('/', componentController.getAllComponents);
router.get('/network-topology', componentController.getNetworkTopology);
router.get('/:id', componentController.getComponentById);
router.post('/', componentController.createComponent);
router.put('/:id', componentController.updateComponent);
router.delete('/:id', componentController.deleteComponent);

// Deployment routes
router.post('/deploy', componentController.deployComponent);
router.delete('/deploy/:environment_id/:component_id', componentController.removeDeployment);

module.exports = router;
