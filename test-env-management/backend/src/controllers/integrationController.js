const db = require('../config/database');
const axios = require('axios');

// Jira Cloud Integration
const jiraAPI = {
  createIssue: async (req, res) => {
    try {
      const { jira_url, jira_email, jira_token, project_key, summary, description, issue_type } = req.body;

      if (!jira_url || !jira_email || !jira_token || !project_key || !summary) {
        return res.status(400).json({ error: 'Missing required Jira fields' });
      }

      const auth = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');
      
      const response = await axios.post(
        `${jira_url}/rest/api/3/issue`,
        {
          fields: {
            project: { key: project_key },
            summary: summary,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: description || summary }]
                }
              ]
            },
            issuetype: { name: issue_type || 'Task' }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', null, 'jira_create', `Created Jira issue: ${response.data.key}`]
      );

      res.json({
        success: true,
        issue_key: response.data.key,
        issue_id: response.data.id,
        issue_url: `${jira_url}/browse/${response.data.key}`
      });
    } catch (error) {
      console.error('Jira create issue error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to create Jira issue',
        details: error.response?.data?.errors || error.message
      });
    }
  },

  getIssues: async (req, res) => {
    try {
      const { jira_url, jira_email, jira_token, project_key } = req.query;

      if (!jira_url || !jira_email || !jira_token) {
        return res.status(400).json({ error: 'Missing Jira credentials' });
      }

      const auth = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');
      const jql = project_key ? `project=${project_key} ORDER BY created DESC` : 'ORDER BY created DESC';
      
      const response = await axios.get(
        `${jira_url}/rest/api/3/search`,
        {
          params: { jql, maxResults: 50 },
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        issues: response.data.issues.map(issue => ({
          key: issue.key,
          id: issue.id,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          type: issue.fields.issuetype.name,
          created: issue.fields.created,
          updated: issue.fields.updated,
          url: `${jira_url}/browse/${issue.key}`
        }))
      });
    } catch (error) {
      console.error('Jira get issues error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to fetch Jira issues',
        details: error.response?.data?.errorMessages || error.message
      });
    }
  },

  testConnection: async (req, res) => {
    try {
      const { jira_url, jira_email, jira_token } = req.body;

      if (!jira_url || !jira_email || !jira_token) {
        return res.status(400).json({ error: 'Missing Jira credentials' });
      }

      const auth = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');
      
      const response = await axios.get(
        `${jira_url}/rest/api/3/myself`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        success: true,
        user: {
          name: response.data.displayName,
          email: response.data.emailAddress
        }
      });
    } catch (error) {
      console.error('Jira test connection error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to connect to Jira',
        details: error.response?.data?.errorMessages || error.message
      });
    }
  }
};

// GitLab Integration
const gitlabAPI = {
  createIssue: async (req, res) => {
    try {
      const { gitlab_url, gitlab_token, project_id, title, description, labels } = req.body;

      if (!gitlab_url || !gitlab_token || !project_id || !title) {
        return res.status(400).json({ error: 'Missing required GitLab fields' });
      }

      const response = await axios.post(
        `${gitlab_url}/api/v4/projects/${project_id}/issues`,
        {
          title,
          description: description || title,
          labels: labels || ''
        },
        {
          headers: {
            'PRIVATE-TOKEN': gitlab_token,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', null, 'gitlab_create', `Created GitLab issue #${response.data.iid}`]
      );

      res.json({
        success: true,
        issue_iid: response.data.iid,
        issue_id: response.data.id,
        issue_url: response.data.web_url
      });
    } catch (error) {
      console.error('GitLab create issue error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to create GitLab issue',
        details: error.response?.data?.message || error.message
      });
    }
  },

  getIssues: async (req, res) => {
    try {
      const { gitlab_url, gitlab_token, project_id } = req.query;

      if (!gitlab_url || !gitlab_token || !project_id) {
        return res.status(400).json({ error: 'Missing GitLab credentials' });
      }

      const response = await axios.get(
        `${gitlab_url}/api/v4/projects/${project_id}/issues`,
        {
          params: { per_page: 50, order_by: 'created_at', sort: 'desc' },
          headers: {
            'PRIVATE-TOKEN': gitlab_token,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        issues: response.data.map(issue => ({
          iid: issue.iid,
          id: issue.id,
          title: issue.title,
          state: issue.state,
          labels: issue.labels,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          url: issue.web_url
        }))
      });
    } catch (error) {
      console.error('GitLab get issues error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to fetch GitLab issues',
        details: error.response?.data?.message || error.message
      });
    }
  },

  createMergeRequest: async (req, res) => {
    try {
      const { gitlab_url, gitlab_token, project_id, source_branch, target_branch, title, description } = req.body;

      if (!gitlab_url || !gitlab_token || !project_id || !source_branch || !target_branch || !title) {
        return res.status(400).json({ error: 'Missing required GitLab fields' });
      }

      const response = await axios.post(
        `${gitlab_url}/api/v4/projects/${project_id}/merge_requests`,
        {
          source_branch,
          target_branch,
          title,
          description: description || title
        },
        {
          headers: {
            'PRIVATE-TOKEN': gitlab_token,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', null, 'gitlab_mr', `Created GitLab MR !${response.data.iid}`]
      );

      res.json({
        success: true,
        mr_iid: response.data.iid,
        mr_id: response.data.id,
        mr_url: response.data.web_url
      });
    } catch (error) {
      console.error('GitLab create MR error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to create GitLab merge request',
        details: error.response?.data?.message || error.message
      });
    }
  },

  testConnection: async (req, res) => {
    try {
      const { gitlab_url, gitlab_token } = req.body;

      if (!gitlab_url || !gitlab_token) {
        return res.status(400).json({ error: 'Missing GitLab credentials' });
      }

      const response = await axios.get(
        `${gitlab_url}/api/v4/user`,
        {
          headers: {
            'PRIVATE-TOKEN': gitlab_token,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        success: true,
        user: {
          name: response.data.name,
          username: response.data.username,
          email: response.data.email
        }
      });
    } catch (error) {
      console.error('GitLab test connection error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to connect to GitLab',
        details: error.response?.data?.message || error.message
      });
    }
  },

  getProjects: async (req, res) => {
    try {
      const { gitlab_url, gitlab_token } = req.query;

      if (!gitlab_url || !gitlab_token) {
        return res.status(400).json({ error: 'Missing GitLab credentials' });
      }

      const response = await axios.get(
        `${gitlab_url}/api/v4/projects`,
        {
          params: { membership: true, per_page: 100 },
          headers: {
            'PRIVATE-TOKEN': gitlab_token,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        projects: response.data.map(project => ({
          id: project.id,
          name: project.name,
          path: project.path_with_namespace,
          url: project.web_url
        }))
      });
    } catch (error) {
      console.error('GitLab get projects error:', error.response?.data || error);
      res.status(500).json({ 
        error: 'Failed to fetch GitLab projects',
        details: error.response?.data?.message || error.message
      });
    }
  }
};

// Integration Settings Management
const saveIntegrationSettings = async (req, res) => {
  try {
    const { integration_type, settings } = req.body;
    const userId = req.user.id;

    if (!integration_type || !settings) {
      return res.status(400).json({ error: 'Missing integration type or settings' });
    }

    // Store encrypted settings in database (you may want to encrypt sensitive data)
    const [result] = await db.query(
      `INSERT INTO integration_settings (user_id, integration_type, settings, updated_at) 
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE settings = ?, updated_at = NOW()`,
      [userId, integration_type, JSON.stringify(settings), JSON.stringify(settings)]
    );

    res.json({ message: 'Integration settings saved successfully' });
  } catch (error) {
    console.error('Save integration settings error:', error);
    res.status(500).json({ error: 'Failed to save integration settings' });
  }
};

const getIntegrationSettings = async (req, res) => {
  try {
    const { integration_type } = req.query;
    const userId = req.user.id;

    if (!integration_type) {
      return res.status(400).json({ error: 'Missing integration type' });
    }

    const [rows] = await db.query(
      'SELECT settings FROM integration_settings WHERE user_id = ? AND integration_type = ?',
      [userId, integration_type]
    );

    if (rows.length === 0) {
      return res.json({ settings: null });
    }

    // Parse if string, otherwise return as-is (MySQL might auto-parse JSON)
    const settings = typeof rows[0].settings === 'string' 
      ? JSON.parse(rows[0].settings) 
      : rows[0].settings;

    res.json({ settings });
  } catch (error) {
    console.error('Get integration settings error:', error);
    res.status(500).json({ error: 'Failed to get integration settings' });
  }
};

module.exports = {
  jiraAPI,
  gitlabAPI,
  saveIntegrationSettings,
  getIntegrationSettings
};
