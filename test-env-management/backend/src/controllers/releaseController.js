const db = require('../config/database');

const releaseController = {
  // Get all releases
  getAllReleases: async (req, res) => {
    try {
      const { status, release_type } = req.query;
      
      let query = `
        SELECT r.*, 
               u1.full_name as release_manager_name,
               u2.full_name as created_by_name,
               (SELECT COUNT(*) FROM release_environments WHERE release_id = r.id) as environment_count,
               (SELECT COUNT(*) FROM release_components WHERE release_id = r.id) as component_count
        FROM releases r
        LEFT JOIN users u1 ON r.release_manager_id = u1.id
        LEFT JOIN users u2 ON r.created_by = u2.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND r.status = ?';
        params.push(status);
      }

      if (release_type) {
        query += ' AND r.release_type = ?';
        params.push(release_type);
      }

      query += ' ORDER BY r.target_date DESC, r.created_at DESC';

      const [releases] = await db.query(query, params);
      res.json({ releases });
    } catch (error) {
      console.error('Get releases error:', error);
      res.status(500).json({ error: 'Failed to fetch releases' });
    }
  },

  // Get release by ID
  getReleaseById: async (req, res) => {
    try {
      const { id } = req.params;

      const [releases] = await db.query(`
        SELECT r.*, 
               u1.full_name as release_manager_name, u1.email as release_manager_email,
               u2.full_name as created_by_name
        FROM releases r
        LEFT JOIN users u1 ON r.release_manager_id = u1.id
        LEFT JOIN users u2 ON r.created_by = u2.id
        WHERE r.id = ?
      `, [id]);

      if (releases.length === 0) {
        return res.status(404).json({ error: 'Release not found' });
      }

      // Get associated environments
      const [environments] = await db.query(`
        SELECT re.*, e.name as environment_name, e.type as environment_type, e.status as environment_status,
               u.full_name as assigned_to_name
        FROM release_environments re
        JOIN environments e ON re.environment_id = e.id
        LEFT JOIN users u ON re.assigned_to = u.id
        WHERE re.release_id = ?
        ORDER BY re.test_phase
      `, [id]);

      // Get associated components
      const [components] = await db.query(`
        SELECT rc.*, c.name as component_name, c.type as component_type, c.status as component_status
        FROM release_components rc
        JOIN components c ON rc.component_id = c.id
        WHERE rc.release_id = ?
        ORDER BY c.name
      `, [id]);

      res.json({ 
        release: releases[0],
        environments,
        components
      });
    } catch (error) {
      console.error('Get release error:', error);
      res.status(500).json({ error: 'Failed to fetch release' });
    }
  },

  // Create release
  createRelease: async (req, res) => {
    try {
      const { name, version, release_type, status, description, release_notes, target_date, release_manager_id } = req.body;

      if (!name || !version) {
        return res.status(400).json({ error: 'Name and version are required' });
      }

      const [result] = await db.query(
        `INSERT INTO releases (name, version, release_type, status, description, release_notes, target_date, release_manager_id, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, version, release_type || 'minor', status || 'planned', description, release_notes, target_date, release_manager_id, req.user.id]
      );

      const [newRelease] = await db.query('SELECT * FROM releases WHERE id = ?', [result.insertId]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', result.insertId, 'create', `Created release: ${name} v${version}`]
      );

      res.status(201).json({ release: newRelease[0] });
    } catch (error) {
      console.error('Create release error:', error);
      res.status(500).json({ error: 'Failed to create release' });
    }
  },

  // Update release
  updateRelease: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, version, release_type, status, description, release_notes, target_date, actual_release_date, release_manager_id } = req.body;

      const [releases] = await db.query('SELECT * FROM releases WHERE id = ?', [id]);
      if (releases.length === 0) {
        return res.status(404).json({ error: 'Release not found' });
      }

      const fields = [];
      const params = [];

      if (name !== undefined) { fields.push('name = ?'); params.push(name); }
      if (version !== undefined) { fields.push('version = ?'); params.push(version); }
      if (release_type !== undefined) { fields.push('release_type = ?'); params.push(release_type); }
      if (status !== undefined) { fields.push('status = ?'); params.push(status); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (release_notes !== undefined) { fields.push('release_notes = ?'); params.push(release_notes); }
      if (target_date !== undefined) { fields.push('target_date = ?'); params.push(target_date); }
      if (actual_release_date !== undefined) { fields.push('actual_release_date = ?'); params.push(actual_release_date); }
      if (release_manager_id !== undefined) { fields.push('release_manager_id = ?'); params.push(release_manager_id); }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);
      await db.query(`UPDATE releases SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

      const [updated] = await db.query('SELECT * FROM releases WHERE id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', id, 'update', `Updated release: ${updated[0].name}`]
      );

      res.json({ release: updated[0] });
    } catch (error) {
      console.error('Update release error:', error);
      res.status(500).json({ error: 'Failed to update release' });
    }
  },

  // Delete release
  deleteRelease: async (req, res) => {
    try {
      const { id } = req.params;

      const [releases] = await db.query('SELECT * FROM releases WHERE id = ?', [id]);
      if (releases.length === 0) {
        return res.status(404).json({ error: 'Release not found' });
      }

      const release = releases[0];

      // Prevent deletion if release is deployed or completed
      if (['deployed', 'completed'].includes(release.status)) {
        return res.status(400).json({ error: 'Cannot delete a deployed or completed release' });
      }

      await db.query('DELETE FROM releases WHERE id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', id, 'delete', `Deleted release: ${release.name}`]
      );

      res.json({ message: 'Release deleted successfully' });
    } catch (error) {
      console.error('Delete release error:', error);
      res.status(500).json({ error: 'Failed to delete release' });
    }
  },

  // Associate environment with release
  associateEnvironment: async (req, res) => {
    try {
      const { release_id, environment_id, test_phase, use_case, configuration, test_start_date, test_end_date, assigned_to } = req.body;

      if (!release_id || !environment_id || !test_phase) {
        return res.status(400).json({ error: 'Release ID, Environment ID, and test phase are required' });
      }

      const [result] = await db.query(
        `INSERT INTO release_environments (release_id, environment_id, test_phase, use_case, configuration, test_start_date, test_end_date, assigned_to) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [release_id, environment_id, test_phase, use_case, configuration ? JSON.stringify(configuration) : null, test_start_date, test_end_date, assigned_to]
      );

      const [association] = await db.query('SELECT * FROM release_environments WHERE id = ?', [result.insertId]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', release_id, 'associate', `Associated environment ID ${environment_id} for ${test_phase} testing`]
      );

      res.status(201).json({ association: association[0] });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'This environment is already associated with this release for this test phase' });
      }
      console.error('Associate environment error:', error);
      res.status(500).json({ error: 'Failed to associate environment' });
    }
  },

  // Update release-environment association
  updateReleaseEnvironment: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, use_case, configuration, test_start_date, test_end_date, assigned_to, test_results, defects_found, notes } = req.body;

      const [associations] = await db.query('SELECT * FROM release_environments WHERE id = ?', [id]);
      if (associations.length === 0) {
        return res.status(404).json({ error: 'Association not found' });
      }

      const fields = [];
      const params = [];

      if (status !== undefined) { fields.push('status = ?'); params.push(status); }
      if (use_case !== undefined) { fields.push('use_case = ?'); params.push(use_case); }
      if (configuration !== undefined) { fields.push('configuration = ?'); params.push(JSON.stringify(configuration)); }
      if (test_start_date !== undefined) { fields.push('test_start_date = ?'); params.push(test_start_date); }
      if (test_end_date !== undefined) { fields.push('test_end_date = ?'); params.push(test_end_date); }
      if (assigned_to !== undefined) { fields.push('assigned_to = ?'); params.push(assigned_to); }
      if (test_results !== undefined) { fields.push('test_results = ?'); params.push(test_results); }
      if (defects_found !== undefined) { fields.push('defects_found = ?'); params.push(defects_found); }
      if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      params.push(id);
      await db.query(`UPDATE release_environments SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

      const [updated] = await db.query('SELECT * FROM release_environments WHERE id = ?', [id]);

      res.json({ association: updated[0] });
    } catch (error) {
      console.error('Update release environment error:', error);
      res.status(500).json({ error: 'Failed to update association' });
    }
  },

  // Remove environment from release
  removeEnvironment: async (req, res) => {
    try {
      const { release_id, environment_id } = req.params;

      const [associations] = await db.query(
        'SELECT * FROM release_environments WHERE release_id = ? AND environment_id = ?',
        [release_id, environment_id]
      );

      if (associations.length === 0) {
        return res.status(404).json({ error: 'Association not found' });
      }

      await db.query('DELETE FROM release_environments WHERE release_id = ? AND environment_id = ?', [release_id, environment_id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', release_id, 'disassociate', `Removed environment ID ${environment_id} from release`]
      );

      res.json({ message: 'Environment removed from release successfully' });
    } catch (error) {
      console.error('Remove environment error:', error);
      res.status(500).json({ error: 'Failed to remove environment' });
    }
  },

  // Associate component with release
  associateComponent: async (req, res) => {
    try {
      const { release_id, component_id, version, change_type, change_description } = req.body;

      if (!release_id || !component_id) {
        return res.status(400).json({ error: 'Release ID and Component ID are required' });
      }

      const [result] = await db.query(
        `INSERT INTO release_components (release_id, component_id, version, change_type, change_description) 
         VALUES (?, ?, ?, ?, ?)`,
        [release_id, component_id, version, change_type || 'modified', change_description]
      );

      const [association] = await db.query('SELECT * FROM release_components WHERE id = ?', [result.insertId]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', release_id, 'associate', `Associated component ID ${component_id} with release`]
      );

      res.status(201).json({ association: association[0] });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'This component is already associated with this release' });
      }
      console.error('Associate component error:', error);
      res.status(500).json({ error: 'Failed to associate component' });
    }
  },

  // Remove component from release
  removeComponent: async (req, res) => {
    try {
      const { release_id, component_id } = req.params;

      const [associations] = await db.query(
        'SELECT * FROM release_components WHERE release_id = ? AND component_id = ?',
        [release_id, component_id]
      );

      if (associations.length === 0) {
        return res.status(404).json({ error: 'Association not found' });
      }

      await db.query('DELETE FROM release_components WHERE release_id = ? AND component_id = ?', [release_id, component_id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'system', release_id, 'disassociate', `Removed component ID ${component_id} from release`]
      );

      res.json({ message: 'Component removed from release successfully' });
    } catch (error) {
      console.error('Remove component error:', error);
      res.status(500).json({ error: 'Failed to remove component' });
    }
  },

  // Get release statistics by environment
  getReleaseStatistics: async (req, res) => {
    try {
      // Get release status distribution
      const [statusStats] = await db.query(`
        SELECT status, COUNT(*) as count
        FROM releases
        GROUP BY status
      `);

      // Get releases by environment with testing status
      const [environmentStats] = await db.query(`
        SELECT 
          e.id,
          e.name as environment_name,
          e.type as environment_type,
          COUNT(DISTINCT re.release_id) as total_releases,
          SUM(CASE WHEN re.status = 'not_started' THEN 1 ELSE 0 END) as not_started,
          SUM(CASE WHEN re.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN re.status = 'passed' THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN re.status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN re.status = 'blocked' THEN 1 ELSE 0 END) as blocked
        FROM environments e
        LEFT JOIN release_environments re ON e.id = re.environment_id
        GROUP BY e.id, e.name, e.type
        HAVING total_releases > 0
        ORDER BY total_releases DESC
      `);

      // Get release timeline (last 6 months)
      const [timeline] = await db.query(`
        SELECT 
          DATE_FORMAT(target_date, '%Y-%m') as month,
          COUNT(*) as total_releases,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) as deployed,
          SUM(CASE WHEN status = 'testing' THEN 1 ELSE 0 END) as testing
        FROM releases
        WHERE target_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month
        ORDER BY month ASC
      `);

      // Get active releases with environment testing status
      const [activeReleases] = await db.query(`
        SELECT 
          r.id,
          r.name,
          r.version,
          r.status as release_status,
          r.target_date,
          COUNT(DISTINCT re.environment_id) as environments_count,
          SUM(CASE WHEN re.status = 'passed' THEN 1 ELSE 0 END) as passed_count,
          SUM(CASE WHEN re.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          SUM(CASE WHEN re.status = 'in_progress' THEN 1 ELSE 0 END) as testing_count
        FROM releases r
        LEFT JOIN release_environments re ON r.id = re.release_id
        WHERE r.status IN ('planning', 'development', 'testing', 'deployed')
        GROUP BY r.id
        ORDER BY r.target_date ASC
      `);

      res.json({
        statusDistribution: statusStats,
        environmentStats,
        timeline,
        activeReleases
      });
    } catch (error) {
      console.error('Get release statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch release statistics' });
    }
  }
};

module.exports = releaseController;
