const db = require('../config/database');
const axios = require('axios');

// Deployment tracking and visibility integration
const deploymentTracking = {
  // Send deployment information to Jira
  sendDeploymentToJira: async (req, res) => {
    try {
      const {
        environment_id,
        release_id,
        deployment_status,
        issue_keys,
        jira_url,
        jira_email,
        jira_token
      } = req.body;

      if (!environment_id || !release_id || !issue_keys || !jira_url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get environment and release details
      const [envRows] = await db.query('SELECT * FROM environments WHERE id = ?', [environment_id]);
      const [releaseRows] = await db.query('SELECT * FROM releases WHERE id = ?', [release_id]);

      if (envRows.length === 0 || releaseRows.length === 0) {
        return res.status(404).json({ error: 'Environment or release not found' });
      }

      const environment = envRows[0];
      const release = releaseRows[0];
      const auth = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');

      // Jira Deployment API payload
      const deploymentData = {
        deployments: [
          {
            schemaVersion: '1.0',
            deploymentSequenceNumber: Date.now(),
            updateSequenceNumber: Date.now(),
            issueKeys: Array.isArray(issue_keys) ? issue_keys : [issue_keys],
            displayName: `${release.name} v${release.version}`,
            url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/environments/${environment_id}`,
            description: `Deployed ${release.name} v${release.version} to ${environment.name} (${environment.type})`,
            lastUpdated: new Date().toISOString(),
            state: deployment_status === 'deployed' ? 'successful' : 
                   deployment_status === 'failed' ? 'failed' : 
                   deployment_status === 'pending' ? 'pending' : 'unknown',
            pipeline: {
              id: `pipeline-${release_id}`,
              displayName: `Release Pipeline - ${release.name}`,
              url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/releases/${release_id}`
            },
            environment: {
              id: `env-${environment_id}`,
              displayName: environment.name,
              type: environment.type.toLowerCase()
            }
          }
        ]
      };

      // Send to Jira Deployments API
      await axios.post(
        `${jira_url}/rest/deployments/0.1/bulk`,
        deploymentData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log deployment activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'release', release_id, 'deployment_tracked', 
         `Deployment tracked in Jira: ${release.name} v${release.version} to ${environment.name}`]
      );

      res.json({
        success: true,
        message: 'Deployment information sent to Jira successfully',
        deployment: deploymentData.deployments[0]
      });
    } catch (error) {
      console.error('Send deployment to Jira error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Failed to send deployment to Jira',
        details: error.response?.data?.errorMessages || error.message
      });
    }
  },

  // Link Jira issues to GitLab commits/MRs
  linkJiraToGitLab: async (req, res) => {
    try {
      const {
        gitlab_url,
        gitlab_token,
        project_id,
        merge_request_iid,
        jira_url,
        jira_email,
        jira_token,
        issue_key
      } = req.body;

      if (!gitlab_url || !gitlab_token || !project_id || !merge_request_iid || !issue_key) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get GitLab MR details
      const gitlabResponse = await axios.get(
        `${gitlab_url}/api/v4/projects/${project_id}/merge_requests/${merge_request_iid}`,
        { headers: { 'PRIVATE-TOKEN': gitlab_token } }
      );

      const mr = gitlabResponse.data;
      const jiraAuth = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');

      // Create remote link in Jira
      await axios.post(
        `${jira_url}/rest/api/3/issue/${issue_key}/remotelink`,
        {
          object: {
            url: mr.web_url,
            title: `GitLab MR !${mr.iid}: ${mr.title}`,
            icon: {
              url16x16: 'https://about.gitlab.com/images/press/logo/png/gitlab-icon-rgb.png'
            },
            status: {
              resolved: mr.state === 'merged'
            }
          }
        },
        {
          headers: {
            'Authorization': `Basic ${jiraAuth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', null, 'jira_gitlab_link', 
         `Linked Jira ${issue_key} to GitLab MR !${mr.iid}`]
      );

      res.json({
        success: true,
        message: 'Jira issue linked to GitLab MR successfully',
        link: {
          jira_issue: issue_key,
          gitlab_mr: `!${mr.iid}`,
          mr_url: mr.web_url
        }
      });
    } catch (error) {
      console.error('Link Jira to GitLab error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Failed to link Jira to GitLab',
        details: error.response?.data?.errorMessages || error.message
      });
    }
  },

  // Transition Jira issue status based on deployment/CI events
  transitionJiraIssue: async (req, res) => {
    try {
      const {
        jira_url,
        jira_email,
        jira_token,
        issue_key,
        transition_name,
        comment
      } = req.body;

      if (!jira_url || !jira_email || !jira_token || !issue_key || !transition_name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const auth = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');

      // Get available transitions for the issue
      const transitionsResponse = await axios.get(
        `${jira_url}/rest/api/3/issue/${issue_key}/transitions`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Find matching transition
      const transition = transitionsResponse.data.transitions.find(
        t => t.name.toLowerCase() === transition_name.toLowerCase()
      );

      if (!transition) {
        return res.status(404).json({ 
          error: `Transition '${transition_name}' not found`,
          available_transitions: transitionsResponse.data.transitions.map(t => t.name)
        });
      }

      // Perform transition
      await axios.post(
        `${jira_url}/rest/api/3/issue/${issue_key}/transitions`,
        {
          transition: { id: transition.id }
        },
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Add comment if provided
      if (comment) {
        await axios.post(
          `${jira_url}/rest/api/3/issue/${issue_key}/comment`,
          {
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: comment }]
                }
              ]
            }
          },
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', null, 'jira_transition', 
         `Transitioned Jira ${issue_key} to '${transition_name}'`]
      );

      res.json({
        success: true,
        message: `Issue ${issue_key} transitioned to '${transition_name}' successfully`,
        transition: {
          from: transition.from?.name || 'unknown',
          to: transition.name
        }
      });
    } catch (error) {
      console.error('Transition Jira issue error:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Failed to transition Jira issue',
        details: error.response?.data?.errorMessages || error.message
      });
    }
  },

  // Get deployment status for environments
  getDeploymentStatus: async (req, res) => {
    try {
      const { environment_id, release_id } = req.query;

      let query = `
        SELECT 
          e.id as environment_id,
          e.name as environment_name,
          e.type as environment_type,
          r.id as release_id,
          r.name as release_name,
          r.version,
          r.status as release_status,
          re.deployment_status,
          re.deployed_at,
          re.deployed_by,
          u.full_name as deployed_by_name
        FROM release_environments re
        JOIN environments e ON re.environment_id = e.id
        JOIN releases r ON re.release_id = r.id
        LEFT JOIN users u ON re.deployed_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (environment_id) {
        query += ' AND e.id = ?';
        params.push(environment_id);
      }
      
      if (release_id) {
        query += ' AND r.id = ?';
        params.push(release_id);
      }
      
      query += ' ORDER BY re.deployed_at DESC';

      const [deployments] = await db.query(query, params);

      res.json({
        success: true,
        deployments: deployments.map(d => ({
          environment: {
            id: d.environment_id,
            name: d.environment_name,
            type: d.environment_type
          },
          release: {
            id: d.release_id,
            name: d.release_name,
            version: d.version,
            status: d.release_status
          },
          deployment: {
            status: d.deployment_status,
            deployed_at: d.deployed_at,
            deployed_by: {
              id: d.deployed_by,
              name: d.deployed_by_name
            }
          }
        }))
      });
    } catch (error) {
      console.error('Get deployment status error:', error);
      res.status(500).json({ error: 'Failed to get deployment status' });
    }
  },

  // Webhook handler for GitLab CI/CD events
  handleGitLabWebhook: async (req, res) => {
    try {
      const event = req.headers['x-gitlab-event'];
      const payload = req.body;

      // Handle pipeline events
      if (event === 'Pipeline Hook') {
        const pipeline = payload.object_attributes;
        const project = payload.project;

        // Extract Jira issue keys from commit messages
        const issueKeys = [];
        if (payload.commits) {
          payload.commits.forEach(commit => {
            const matches = commit.message.match(/[A-Z]+-\d+/g);
            if (matches) issueKeys.push(...matches);
          });
        }

        // If pipeline succeeded, update Jira issues
        if (pipeline.status === 'success' && issueKeys.length > 0) {
          // Get integration settings for project
          const [settings] = await db.query(
            'SELECT settings FROM integration_settings WHERE integration_type = ? LIMIT 1',
            ['jira']
          );

          if (settings.length > 0) {
            const jiraSettings = typeof settings[0].settings === 'string' 
              ? JSON.parse(settings[0].settings) 
              : settings[0].settings;

            const auth = Buffer.from(`${jiraSettings.jira_email}:${jiraSettings.jira_token}`).toString('base64');

            // Add comment to each issue
            for (const issueKey of [...new Set(issueKeys)]) {
              try {
                await axios.post(
                  `${jiraSettings.jira_url}/rest/api/3/issue/${issueKey}/comment`,
                  {
                    body: {
                      type: 'doc',
                      version: 1,
                      content: [
                        {
                          type: 'paragraph',
                          content: [
                            { type: 'text', text: `✓ Pipeline ` },
                            { type: 'text', text: `#${pipeline.id}`, marks: [{ type: 'strong' }] },
                            { type: 'text', text: ` completed successfully in project ${project.name}` }
                          ]
                        }
                      ]
                    }
                  },
                  {
                    headers: {
                      'Authorization': `Basic ${auth}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
              } catch (err) {
                console.error(`Failed to update Jira issue ${issueKey}:`, err.message);
              }
            }
          }
        }

        // Log webhook activity
        await db.query(
          'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
          [null, 'system', null, 'gitlab_webhook', 
           `GitLab pipeline ${pipeline.id} ${pipeline.status} - ${project.name}`]
        );
      }

      // Handle deployment events
      if (event === 'Deployment Hook') {
        const deployment = payload.deployment;
        // Process deployment information
        // This can trigger Jira deployment API calls
      }

      res.json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('GitLab webhook error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  },

  // Generate deployment report
  generateDeploymentReport: async (req, res) => {
    try {
      const { start_date, end_date, environment_type } = req.query;

      let query = `
        SELECT 
          DATE(re.deployed_at) as deployment_date,
          COUNT(*) as total_deployments,
          COUNT(CASE WHEN re.deployment_status = 'successful' THEN 1 END) as successful,
          COUNT(CASE WHEN re.deployment_status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN re.deployment_status = 'pending' THEN 1 END) as pending,
          e.type as environment_type,
          GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ') as releases
        FROM release_environments re
        JOIN environments e ON re.environment_id = e.id
        JOIN releases r ON re.release_id = r.id
        WHERE 1=1
      `;

      const params = [];

      if (start_date) {
        query += ' AND re.deployed_at >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND re.deployed_at <= ?';
        params.push(end_date);
      }

      if (environment_type) {
        query += ' AND e.type = ?';
        params.push(environment_type);
      }

      query += ' GROUP BY DATE(re.deployed_at), e.type ORDER BY deployment_date DESC';

      const [report] = await db.query(query, params);

      // Calculate summary statistics
      const summary = {
        total_deployments: report.reduce((sum, r) => sum + r.total_deployments, 0),
        successful_deployments: report.reduce((sum, r) => sum + r.successful, 0),
        failed_deployments: report.reduce((sum, r) => sum + r.failed, 0),
        success_rate: 0
      };

      if (summary.total_deployments > 0) {
        summary.success_rate = ((summary.successful_deployments / summary.total_deployments) * 100).toFixed(2);
      }

      res.json({
        success: true,
        summary,
        daily_report: report
      });
    } catch (error) {
      console.error('Generate deployment report error:', error);
      res.status(500).json({ error: 'Failed to generate deployment report' });
    }
  }
};

module.exports = deploymentTracking;
