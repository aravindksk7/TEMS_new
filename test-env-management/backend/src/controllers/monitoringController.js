const db = require('../config/database');

const monitoringController = {
  // Record environment metrics
  recordMetric: async (req, res) => {
    try {
      const { environment_id, metric_type, metric_value, unit, status, metadata } = req.body;

      if (!environment_id || !metric_type || metric_value === undefined) {
        return res.status(400).json({ error: 'Environment ID, metric type, and value are required' });
      }

      await db.query(
        `INSERT INTO environment_metrics (environment_id, metric_type, metric_value, unit, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [environment_id, metric_type, metric_value, unit, status || 'normal', JSON.stringify(metadata || {})]
      );

      // Check if metric indicates critical status
      if (status === 'critical') {
        // Get environment details
        const [environments] = await db.query('SELECT * FROM environments WHERE id = ?', [environment_id]);
        
        if (environments.length > 0) {
          // Create notifications for admins and managers
          const [admins] = await db.query(
            "SELECT id FROM users WHERE role IN ('admin', 'manager') AND is_active = TRUE"
          );

          for (const admin of admins) {
            await db.query(
              `INSERT INTO notifications (user_id, type, title, message, link, priority)
               VALUES (?, 'environment_status', ?, ?, ?, 'high')`,
              [
                admin.id,
                'Critical Environment Alert',
                `${environments[0].name} has critical ${metric_type}: ${metric_value}${unit || ''}`,
                `/environments/${environment_id}`
              ]
            );
          }
        }
      }

      res.status(201).json({ message: 'Metric recorded successfully' });
    } catch (error) {
      console.error('Record metric error:', error);
      res.status(500).json({ error: 'Failed to record metric' });
    }
  },

  // Get environment metrics
  getEnvironmentMetrics: async (req, res) => {
    try {
      const { id } = req.params;
      const { metric_type, start_date, end_date, limit } = req.query;

      let query = 'SELECT * FROM environment_metrics WHERE environment_id = ?';
      const params = [id];

      if (metric_type) {
        query += ' AND metric_type = ?';
        params.push(metric_type);
      }

      if (start_date && end_date) {
        query += ' AND recorded_at BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' ORDER BY recorded_at DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
      } else {
        query += ' LIMIT 1000';
      }

      const [metrics] = await db.query(query, params);
      res.json({ metrics });
    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  },

  // Get latest metrics for all environments
  getAllEnvironmentMetrics: async (req, res) => {
    try {
      const [metrics] = await db.query(`
        SELECT em1.*
        FROM environment_metrics em1
        INNER JOIN (
          SELECT environment_id, metric_type, MAX(recorded_at) as max_date
          FROM environment_metrics
          GROUP BY environment_id, metric_type
        ) em2 ON em1.environment_id = em2.environment_id 
        AND em1.metric_type = em2.metric_type 
        AND em1.recorded_at = em2.max_date
        ORDER BY em1.environment_id, em1.metric_type
      `);

      // Group by environment
      const groupedMetrics = {};
      metrics.forEach(metric => {
        if (!groupedMetrics[metric.environment_id]) {
          groupedMetrics[metric.environment_id] = [];
        }
        groupedMetrics[metric.environment_id].push(metric);
      });

      res.json({ metrics: groupedMetrics });
    } catch (error) {
      console.error('Get all metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  },

  // Get environment health status
  getEnvironmentHealth: async (req, res) => {
    try {
      const { id } = req.params;

      const [latestMetrics] = await db.query(`
        SELECT em1.*
        FROM environment_metrics em1
        INNER JOIN (
          SELECT metric_type, MAX(recorded_at) as max_date
          FROM environment_metrics
          WHERE environment_id = ?
          GROUP BY metric_type
        ) em2 ON em1.metric_type = em2.metric_type 
        AND em1.recorded_at = em2.max_date
        WHERE em1.environment_id = ?
      `, [id, id]);

      // Calculate overall health score
      let healthScore = 100;
      let criticalCount = 0;
      let warningCount = 0;

      latestMetrics.forEach(metric => {
        if (metric.status === 'critical') {
          healthScore -= 20;
          criticalCount++;
        } else if (metric.status === 'warning') {
          healthScore -= 10;
          warningCount++;
        }
      });

      healthScore = Math.max(0, healthScore);

      let overallStatus = 'healthy';
      if (criticalCount > 0) {
        overallStatus = 'critical';
      } else if (warningCount > 1) {
        overallStatus = 'warning';
      } else if (warningCount === 1) {
        overallStatus = 'degraded';
      }

      res.json({
        healthScore,
        overallStatus,
        criticalCount,
        warningCount,
        metrics: latestMetrics,
        lastUpdated: latestMetrics.length > 0 ? latestMetrics[0].recorded_at : null
      });
    } catch (error) {
      console.error('Get health status error:', error);
      res.status(500).json({ error: 'Failed to fetch health status' });
    }
  },

  // Get system-wide monitoring dashboard data
  getMonitoringDashboard: async (req, res) => {
    try {
      // Get environment count by status
      const [envStatus] = await db.query(`
        SELECT status, COUNT(*) as count
        FROM environments
        GROUP BY status
      `);

      // Get active bookings count
      const [activeBookings] = await db.query(`
        SELECT COUNT(*) as count FROM bookings WHERE status = 'active'
      `);

      // Get unresolved conflicts
      const [unresolvedConflicts] = await db.query(`
        SELECT COUNT(*) as count FROM conflicts WHERE resolution_status = 'unresolved'
      `);

      // Get critical environments
      const [criticalEnvs] = await db.query(`
        SELECT DISTINCT e.id, e.name, e.type
        FROM environments e
        JOIN environment_metrics em ON e.id = em.environment_id
        WHERE em.status = 'critical'
        AND em.recorded_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
      `);

      // Get upcoming bookings (next 24 hours)
      const [upcomingBookings] = await db.query(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE status IN ('approved', 'pending')
        AND start_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      `);

      // Get system activities (last hour)
      const [recentActivities] = await db.query(`
        SELECT a.*, u.full_name as user_name
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY a.created_at DESC
        LIMIT 20
      `);

      res.json({
        environmentStatus: envStatus,
        activeBookings: activeBookings[0].count,
        unresolvedConflicts: unresolvedConflicts[0].count,
        criticalEnvironments: criticalEnvs,
        upcomingBookings: upcomingBookings[0].count,
        recentActivities
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
};

module.exports = monitoringController;
