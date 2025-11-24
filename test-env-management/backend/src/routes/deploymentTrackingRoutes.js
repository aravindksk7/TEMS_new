const express = require('express');
const router = express.Router();
const deploymentTracking = require('../controllers/deploymentTrackingController');
const { authenticateToken } = require('../middleware/auth');

// Deployment tracking routes
router.post('/jira/deployment', authenticateToken, deploymentTracking.sendDeploymentToJira);
router.post('/jira/transition', authenticateToken, deploymentTracking.transitionJiraIssue);
router.post('/link-jira-gitlab', authenticateToken, deploymentTracking.linkJiraToGitLab);
router.get('/deployment-status', authenticateToken, deploymentTracking.getDeploymentStatus);
router.get('/deployment-report', authenticateToken, deploymentTracking.generateDeploymentReport);

// Webhook endpoint (no auth required - uses GitLab secret token validation)
router.post('/gitlab/webhook', deploymentTracking.handleGitLabWebhook);

module.exports = router;
