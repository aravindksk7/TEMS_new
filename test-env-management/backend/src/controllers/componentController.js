const db = require('../config/database');

const componentController = {
  // Get all components
  getAllComponents: async (req, res) => {
    try {
      const { type, status } = req.query;
      
      let query = 'SELECT c.*, u.full_name as created_by_name FROM components c LEFT JOIN users u ON c.created_by = u.id WHERE 1=1';
      const params = [];

      if (type) {
        query += ' AND c.type = ?';
        params.push(type);
      }

      if (status) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      query += ' ORDER BY c.name ASC';

      const [components] = await db.query(query, params);
      res.json({ components });
    } catch (error) {
      console.error('Get components error:', error);
      res.status(500).json({ error: 'Failed to fetch components' });
    }
  },

  // Get component by ID
  getComponentById: async (req, res) => {
    try {
      const { id } = req.params;

      const [components] = await db.query(`
        SELECT c.*, u.full_name as created_by_name 
        FROM components c 
        LEFT JOIN users u ON c.created_by = u.id 
        WHERE c.id = ?
      `, [id]);

      if (components.length === 0) {
        return res.status(404).json({ error: 'Component not found' });
      }

      // Get environments where this component is deployed
      const [environments] = await db.query(`
        SELECT e.id, e.name, e.type, e.status, e.url,
               ec.deployment_status, ec.port, ec.endpoint, ec.deployed_at
        FROM environments e
        JOIN environment_components ec ON e.id = ec.environment_id
        WHERE ec.component_id = ?
        ORDER BY e.name
      `, [id]);

      res.json({ 
        component: components[0],
        environments 
      });
    } catch (error) {
      console.error('Get component error:', error);
      res.status(500).json({ error: 'Failed to fetch component' });
    }
  },

  // Create component
  createComponent: async (req, res) => {
    try {
      const { name, type, version, status, description, repository_url, documentation_url, health_check_url, configuration, metadata } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      const [result] = await db.query(
        `INSERT INTO components (name, type, version, status, description, repository_url, documentation_url, health_check_url, configuration, metadata, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, type, version, status || 'active', description, repository_url, documentation_url, health_check_url, 
         configuration ? JSON.stringify(configuration) : null, metadata ? JSON.stringify(metadata) : null, req.user.id]
      );

      const [newComponent] = await db.query('SELECT * FROM components WHERE id = ?', [result.insertId]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'component', result.insertId, 'create', `Created component: ${name}`]
      );

      res.status(201).json({ component: newComponent[0] });
    } catch (error) {
      console.error('Create component error:', error);
      res.status(500).json({ error: 'Failed to create component' });
    }
  },

  // Update component
  updateComponent: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, version, status, description, repository_url, documentation_url, health_check_url, configuration, metadata } = req.body;

      const [components] = await db.query('SELECT * FROM components WHERE id = ?', [id]);
      if (components.length === 0) {
        return res.status(404).json({ error: 'Component not found' });
      }

      const fields = [];
      const params = [];

      if (name !== undefined) { fields.push('name = ?'); params.push(name); }
      if (type !== undefined) { fields.push('type = ?'); params.push(type); }
      if (version !== undefined) { fields.push('version = ?'); params.push(version); }
      if (status !== undefined) { fields.push('status = ?'); params.push(status); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (repository_url !== undefined) { fields.push('repository_url = ?'); params.push(repository_url); }
      if (documentation_url !== undefined) { fields.push('documentation_url = ?'); params.push(documentation_url); }
      if (health_check_url !== undefined) { fields.push('health_check_url = ?'); params.push(health_check_url); }
      if (configuration !== undefined) { fields.push('configuration = ?'); params.push(JSON.stringify(configuration)); }
      if (metadata !== undefined) { fields.push('metadata = ?'); params.push(JSON.stringify(metadata)); }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);
      await db.query(`UPDATE components SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

      const [updated] = await db.query('SELECT * FROM components WHERE id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'component', id, 'update', `Updated component: ${updated[0].name}`]
      );

      res.json({ component: updated[0] });
    } catch (error) {
      console.error('Update component error:', error);
      res.status(500).json({ error: 'Failed to update component' });
    }
  },

  // Delete component
  deleteComponent: async (req, res) => {
    try {
      const { id } = req.params;

      const [components] = await db.query('SELECT * FROM components WHERE id = ?', [id]);
      if (components.length === 0) {
        return res.status(404).json({ error: 'Component not found' });
      }

      const component = components[0];

      // Check if component is deployed in any environment
      const [deployments] = await db.query('SELECT COUNT(*) as count FROM environment_components WHERE component_id = ?', [id]);
      if (deployments[0].count > 0) {
        return res.status(400).json({ error: 'Cannot delete component that is deployed in environments. Remove deployments first.' });
      }

      await db.query('DELETE FROM components WHERE id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'component', id, 'delete', `Deleted component: ${component.name}`]
      );

      res.json({ message: 'Component deleted successfully' });
    } catch (error) {
      console.error('Delete component error:', error);
      res.status(500).json({ error: 'Failed to delete component' });
    }
  },

  // Deploy component to environment
  deployComponent: async (req, res) => {
    try {
      const { environment_id, component_id, port, endpoint, configuration_override, deployment_notes } = req.body;

      if (!environment_id || !component_id) {
        return res.status(400).json({ error: 'Environment ID and Component ID are required' });
      }

      // Check if already deployed
      const [existing] = await db.query(
        'SELECT * FROM environment_components WHERE environment_id = ? AND component_id = ?',
        [environment_id, component_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Component already deployed to this environment' });
      }

      const [result] = await db.query(
        `INSERT INTO environment_components (environment_id, component_id, deployment_status, port, endpoint, configuration_override, deployment_notes, deployed_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [environment_id, component_id, 'deployed', port, endpoint, 
         configuration_override ? JSON.stringify(configuration_override) : null, deployment_notes, req.user.id]
      );

      const [deployment] = await db.query('SELECT * FROM environment_components WHERE id = ?', [result.insertId]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', environment_id, 'deploy', `Deployed component ID ${component_id}`]
      );

      res.status(201).json({ deployment: deployment[0] });
    } catch (error) {
      console.error('Deploy component error:', error);
      res.status(500).json({ error: 'Failed to deploy component' });
    }
  },

  // Remove component from environment
  removeDeployment: async (req, res) => {
    try {
      const { environment_id, component_id } = req.params;

      const [deployments] = await db.query(
        'SELECT * FROM environment_components WHERE environment_id = ? AND component_id = ?',
        [environment_id, component_id]
      );

      if (deployments.length === 0) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      await db.query('DELETE FROM environment_components WHERE environment_id = ? AND component_id = ?', [environment_id, component_id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', environment_id, 'undeploy', `Removed component ID ${component_id}`]
      );

      res.json({ message: 'Component removed from environment successfully' });
    } catch (error) {
      console.error('Remove deployment error:', error);
      res.status(500).json({ error: 'Failed to remove deployment' });
    }
  },

  // Get network topology data
  getNetworkTopology: async (req, res) => {
    try {
      // Get all environments as nodes
      const [environments] = await db.query(`
        SELECT id, name, type, status, url 
        FROM environments 
        WHERE status != 'decommissioned'
        ORDER BY name
      `);

      // Get all components as nodes
      const [components] = await db.query(`
        SELECT id, name, type, status, version 
        FROM components 
        WHERE status = 'active'
        ORDER BY name
      `);

      // Get all relationships (links)
      const [relationships] = await db.query(`
        SELECT ec.id, ec.environment_id, ec.component_id, ec.deployment_status, ec.port,
               e.name as environment_name, c.name as component_name
        FROM environment_components ec
        JOIN environments e ON ec.environment_id = e.id
        JOIN components c ON ec.component_id = c.id
        WHERE e.status != 'decommissioned' AND c.status = 'active'
      `);

      // Format for D3.js network visualization
      const nodes = [
        ...environments.map(env => ({
          id: `env-${env.id}`,
          label: env.name,
          type: 'environment',
          subtype: env.type,
          status: env.status,
          url: env.url,
          group: 1
        })),
        ...components.map(comp => ({
          id: `comp-${comp.id}`,
          label: comp.name,
          type: 'component',
          subtype: comp.type,
          status: comp.status,
          version: comp.version,
          group: 2
        }))
      ];

      const links = relationships.map(rel => ({
        id: rel.id,
        source: `env-${rel.environment_id}`,
        target: `comp-${rel.component_id}`,
        deployment_status: rel.deployment_status,
        port: rel.port,
        value: 1
      }));

      res.json({ nodes, links });
    } catch (error) {
      console.error('Get network topology error:', error);
      res.status(500).json({ error: 'Failed to fetch network topology' });
    }
  }
};

module.exports = componentController;
