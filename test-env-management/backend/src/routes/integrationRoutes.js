const express = require('express');
const router = express.Router();
const { jiraAPI, gitlabAPI, saveIntegrationSettings, getIntegrationSettings } = require('../controllers/integrationController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Jira Cloud Routes
router.post('/jira/test', jiraAPI.testConnection);
router.post('/jira/issues', jiraAPI.createIssue);
router.get('/jira/issues', jiraAPI.getIssues);

// GitLab Routes
router.post('/gitlab/test', gitlabAPI.testConnection);
router.get('/gitlab/projects', gitlabAPI.getProjects);
router.post('/gitlab/issues', gitlabAPI.createIssue);
router.get('/gitlab/issues', gitlabAPI.getIssues);
router.post('/gitlab/merge-requests', gitlabAPI.createMergeRequest);

// Integration Settings Routes
router.post('/settings', saveIntegrationSettings);
router.get('/settings', getIntegrationSettings);

module.exports = router;
