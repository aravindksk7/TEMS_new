const db = require('../config/database');

const environmentController = {
  // Get all environments
  getAllEnvironments: async (req, res) => {
    try {
      const { status, type, search } = req.query;
      
      let query = `
        SELECT e.*, u.full_name as created_by_name,
        (SELECT COUNT(*) FROM bookings b WHERE b.environment_id = e.id AND b.status = 'active') as active_bookings
        FROM environments e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND e.status = ?';
        params.push(status);
      }

      if (type) {
        query += ' AND e.type = ?';
        params.push(type);
      }

      if (search) {
        query += ' AND (e.name LIKE ? OR e.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY e.created_at DESC';

      const [environments] = await db.query(query, params);
      res.json({ environments });
    } catch (error) {
      console.error('Get environments error:', error);
      res.status(500).json({ error: 'Failed to fetch environments' });
    }
  },

  // Get environment by ID
  getEnvironmentById: async (req, res) => {
    try {
      const { id } = req.params;

      const [environments] = await db.query(`
        SELECT e.*, u.full_name as created_by_name
        FROM environments e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.id = ?
      `, [id]);

      if (environments.length === 0) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      // Get current bookings
      const [bookings] = await db.query(`
        SELECT b.*, u.full_name as user_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.environment_id = ? AND b.status IN ('active', 'approved', 'pending')
        ORDER BY b.start_time ASC
      `, [id]);

      // Get recent metrics
      const [metrics] = await db.query(`
        SELECT * FROM environment_metrics
        WHERE environment_id = ?
        ORDER BY recorded_at DESC
        LIMIT 100
      `, [id]);

      res.json({
        environment: environments[0],
        bookings,
        metrics
      });
    } catch (error) {
      console.error('Get environment error:', error);
      res.status(500).json({ error: 'Failed to fetch environment' });
    }
  },

  // Create environment
  createEnvironment: async (req, res) => {
    try {
      const { name, type, description, url, server_details, configuration, tags } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      const [result] = await db.query(
        `INSERT INTO environments (name, type, description, url, server_details, configuration, tags, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          type,
          description,
          url,
          JSON.stringify(server_details || {}),
          JSON.stringify(configuration || {}),
          JSON.stringify(tags || []),
          req.user.id
        ]
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', result.insertId, 'create', `Created environment: ${name}`]
      );

      res.status(201).json({
        message: 'Environment created successfully',
        environmentId: result.insertId
      });
    } catch (error) {
      console.error('Create environment error:', error);
      res.status(500).json({ error: 'Failed to create environment' });
    }
  },

  // Update environment
  updateEnvironment: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, status, description, url, server_details, configuration, tags } = req.body;

      const [existing] = await db.query('SELECT * FROM environments WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      await db.query(
        `UPDATE environments SET 
         name = COALESCE(?, name),
         type = COALESCE(?, type),
         status = COALESCE(?, status),
         description = COALESCE(?, description),
         url = COALESCE(?, url),
         server_details = COALESCE(?, server_details),
         configuration = COALESCE(?, configuration),
         tags = COALESCE(?, tags),
         updated_at = NOW()
         WHERE id = ?`,
        [
          name,
          type,
          status,
          description,
          url,
          server_details ? JSON.stringify(server_details) : null,
          configuration ? JSON.stringify(configuration) : null,
          tags ? JSON.stringify(tags) : null,
          id
        ]
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', id, 'update', `Updated environment: ${name || existing[0].name}`]
      );

      res.json({ message: 'Environment updated successfully' });
    } catch (error) {
      console.error('Update environment error:', error);
      res.status(500).json({ error: 'Failed to update environment' });
    }
  },

  // Delete environment
  deleteEnvironment: async (req, res) => {
    try {
      const { id } = req.params;

      const [existing] = await db.query('SELECT * FROM environments WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      await db.query('DELETE FROM environments WHERE id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', id, 'delete', `Deleted environment: ${existing[0].name}`]
      );

      res.json({ message: 'Environment deleted successfully' });
    } catch (error) {
      console.error('Delete environment error:', error);
      res.status(500).json({ error: 'Failed to delete environment' });
    }
  },

  // Get environment availability
  getEnvironmentAvailability: async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const [bookings] = await db.query(`
        SELECT b.*, u.full_name as user_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.environment_id = ?
        AND b.status IN ('approved', 'active')
        AND (
          (b.start_time BETWEEN ? AND ?)
          OR (b.end_time BETWEEN ? AND ?)
          OR (b.start_time <= ? AND b.end_time >= ?)
        )
        ORDER BY b.start_time ASC
      `, [id, start_date, end_date, start_date, end_date, start_date, end_date]);

      res.json({ bookings });
    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  },

  // Get environment statistics
  getEnvironmentStatistics: async (req, res) => {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_environments,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'in-use' THEN 1 ELSE 0 END) as in_use,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN type = 'dev' THEN 1 ELSE 0 END) as dev_count,
          SUM(CASE WHEN type = 'qa' THEN 1 ELSE 0 END) as qa_count,
          SUM(CASE WHEN type = 'staging' THEN 1 ELSE 0 END) as staging_count,
          SUM(CASE WHEN type = 'uat' THEN 1 ELSE 0 END) as uat_count,
          SUM(CASE WHEN type = 'production' THEN 1 ELSE 0 END) as production_count
        FROM environments
      `);

      res.json({ statistics: stats[0] });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  ,

  // Get configurations for an environment
  getConfigurations: async (req, res) => {
    try {
      const { id } = req.params;
      const [envs] = await db.query('SELECT configuration FROM environments WHERE id = ?', [id]);
      if (envs.length === 0) return res.status(404).json({ error: 'Environment not found' });
      let configs = [];
      try {
        const raw = envs[0].configuration;
        if (!raw) configs = [];
        else if (typeof raw === 'string') configs = JSON.parse(raw);
        else configs = raw;
        if (!Array.isArray(configs)) configs = [];
      } catch (err) {
        configs = [];
      }
      res.json({ configurations: configs });
    } catch (error) {
      console.error('Get configurations error:', error);
      res.status(500).json({ error: 'Failed to fetch configurations' });
    }
  },

  // Create a configuration item for an environment
  createConfiguration: async (req, res) => {
    try {
      const { id } = req.params; // environment id
      const { category, name, settings } = req.body;
      if (!category || !name) return res.status(400).json({ error: 'Category and name are required' });

      const [envs] = await db.query('SELECT configuration FROM environments WHERE id = ?', [id]);
      if (envs.length === 0) return res.status(404).json({ error: 'Environment not found' });

      let configs = [];
      try {
        const raw = envs[0].configuration;
        if (!raw) configs = [];
        else if (typeof raw === 'string') configs = JSON.parse(raw);
        else configs = raw;
        if (!Array.isArray(configs)) configs = [];
      } catch (err) {
        configs = [];
      }

      const newConfig = {
        id: Date.now(),
        category,
        name,
        settings: settings || {},
        created_by: req.user.id,
        created_at: new Date()
      };

      configs.push(newConfig);

      await db.query('UPDATE environments SET configuration = ? WHERE id = ?', [JSON.stringify(configs), id]);

      await db.query('INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', id, 'add_configuration', `Added configuration ${name} (${category})`]);

      res.status(201).json({ configuration: newConfig });
    } catch (error) {
      console.error('Create configuration error:', error);
      res.status(500).json({ error: 'Failed to create configuration' });
    }
  },

  // Update a specific configuration item
  updateConfiguration: async (req, res) => {
    try {
      const { id, configId } = req.params;
      const { category, name, settings } = req.body;

      const [envs] = await db.query('SELECT configuration FROM environments WHERE id = ?', [id]);
      if (envs.length === 0) return res.status(404).json({ error: 'Environment not found' });

      let configs = [];
      try {
        const raw = envs[0].configuration;
        if (!raw) configs = [];
        else if (typeof raw === 'string') configs = JSON.parse(raw);
        else configs = raw;
        if (!Array.isArray(configs)) configs = [];
      } catch (err) {
        configs = [];
      }

      const idx = configs.findIndex((c) => String(c.id) === String(configId));
      if (idx === -1) return res.status(404).json({ error: 'Configuration not found' });

      if (category) configs[idx].category = category;
      if (name) configs[idx].name = name;
      if (settings) configs[idx].settings = settings;
      configs[idx].updated_at = new Date();

      await db.query('UPDATE environments SET configuration = ? WHERE id = ?', [JSON.stringify(configs), id]);

      await db.query('INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', id, 'update_configuration', `Updated configuration ${configs[idx].name}`]);

      res.json({ configuration: configs[idx] });
    } catch (error) {
      console.error('Update configuration error:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  },

  // Delete a configuration item
  deleteConfiguration: async (req, res) => {
    try {
      const { id, configId } = req.params;
      const [envs] = await db.query('SELECT configuration FROM environments WHERE id = ?', [id]);
      if (envs.length === 0) return res.status(404).json({ error: 'Environment not found' });

      let configs = [];
      try {
        const raw = envs[0].configuration;
        if (!raw) configs = [];
        else if (typeof raw === 'string') configs = JSON.parse(raw);
        else configs = raw;
        if (!Array.isArray(configs)) configs = [];
      } catch (err) {
        configs = [];
      }

      const idx = configs.findIndex((c) => String(c.id) === String(configId));
      if (idx === -1) return res.status(404).json({ error: 'Configuration not found' });

      const removed = configs.splice(idx, 1)[0];

      await db.query('UPDATE environments SET configuration = ? WHERE id = ?', [JSON.stringify(configs), id]);

      await db.query('INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'environment', id, 'delete_configuration', `Deleted configuration ${removed.name}`]);

      res.json({ message: 'Configuration deleted' });
    } catch (error) {
      console.error('Delete configuration error:', error);
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  }
};

module.exports = environmentController;
