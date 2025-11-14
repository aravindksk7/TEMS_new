const db = require('../config/database');

const analyticsController = {
  // Get environment utilization report
  getEnvironmentUtilization: async (req, res) => {
    try {
      const { start_date, end_date, environment_id } = req.query;

      let query = `
        SELECT 
          e.id,
          e.name,
          e.type,
          COUNT(DISTINCT b.id) as total_bookings,
          SUM(TIMESTAMPDIFF(HOUR, b.start_time, b.end_time)) as total_hours_booked,
          AVG(TIMESTAMPDIFF(HOUR, b.start_time, b.end_time)) as avg_booking_duration,
          SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings
        FROM environments e
        LEFT JOIN bookings b ON e.id = b.environment_id
      `;

      const params = [];

      if (start_date && end_date) {
        query += ' WHERE b.start_time BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      if (environment_id) {
        query += (params.length > 0 ? ' AND' : ' WHERE') + ' e.id = ?';
        params.push(environment_id);
      }

      query += ' GROUP BY e.id, e.name, e.type ORDER BY total_hours_booked DESC';

      const [utilization] = await db.query(query, params);

      // Calculate utilization percentage (assuming 24/7 availability)
      const results = utilization.map(env => {
        const totalAvailableHours = start_date && end_date 
          ? Math.abs(new Date(end_date) - new Date(start_date)) / 36e5 
          : 24 * 30; // Default to 30 days
        
        const utilizationPercentage = env.total_hours_booked 
          ? ((env.total_hours_booked / totalAvailableHours) * 100).toFixed(2)
          : 0;

        return {
          ...env,
          utilization_percentage: utilizationPercentage
        };
      });

      res.json({ utilization: results });
    } catch (error) {
      console.error('Get utilization error:', error);
      res.status(500).json({ error: 'Failed to fetch utilization data' });
    }
  },

  // Get user activity report
  getUserActivityReport: async (req, res) => {
    try {
      const { start_date, end_date, user_id } = req.query;

      let query = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.department,
          COUNT(DISTINCT b.id) as total_bookings,
          SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
          SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as active_bookings,
          SUM(TIMESTAMPDIFF(HOUR, b.start_time, b.end_time)) as total_hours_used,
          COUNT(DISTINCT c.id) as comments_posted
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id
        LEFT JOIN comments c ON u.id = c.user_id
      `;

      const params = [];

      if (start_date && end_date) {
        query += ' WHERE b.created_at BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      if (user_id) {
        query += (params.length > 0 ? ' AND' : ' WHERE') + ' u.id = ?';
        params.push(user_id);
      }

      query += ' GROUP BY u.id, u.full_name, u.email, u.role, u.department ORDER BY total_bookings DESC';

      const [userActivity] = await db.query(query, params);
      res.json({ userActivity });
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  },

  // Get conflict analysis
  getConflictAnalysis: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;

      let query = `
        SELECT 
          c.conflict_type,
          c.severity,
          c.resolution_status,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(HOUR, c.detected_at, c.resolved_at)) as avg_resolution_time_hours
        FROM conflicts c
      `;

      const params = [];

      if (start_date && end_date) {
        query += ' WHERE c.detected_at BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ' GROUP BY c.conflict_type, c.severity, c.resolution_status';

      const [conflicts] = await db.query(query, params);

      // Get environments with most conflicts
      let envQuery = `
        SELECT 
          e.id,
          e.name,
          e.type,
          COUNT(DISTINCT c.id) as conflict_count
        FROM environments e
        JOIN bookings b ON e.id = b.environment_id
        JOIN conflicts c ON (b.id = c.booking_id_1 OR b.id = c.booking_id_2)
      `;

      if (start_date && end_date) {
        envQuery += ' WHERE c.detected_at BETWEEN ? AND ?';
      }

      envQuery += ' GROUP BY e.id, e.name, e.type ORDER BY conflict_count DESC LIMIT 10';

      const [environmentConflicts] = await db.query(envQuery, params);

      res.json({
        conflictSummary: conflicts,
        topConflictEnvironments: environmentConflicts
      });
    } catch (error) {
      console.error('Get conflict analysis error:', error);
      res.status(500).json({ error: 'Failed to fetch conflict analysis' });
    }
  },

  // Get booking trends
  getBookingTrends: async (req, res) => {
    try {
      const { period, start_date, end_date } = req.query; // period: 'day', 'week', 'month'

      const groupBy = period === 'day' ? 'DATE(b.created_at)' 
                    : period === 'week' ? 'YEARWEEK(b.created_at)' 
                    : 'DATE_FORMAT(b.created_at, "%Y-%m")';

      let query = `
        SELECT 
          ${groupBy} as period,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN b.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN b.priority = 'critical' THEN 1 ELSE 0 END) as critical_priority,
          AVG(TIMESTAMPDIFF(HOUR, b.created_at, b.updated_at)) as avg_approval_time_hours
        FROM bookings b
      `;

      const params = [];

      if (start_date && end_date) {
        query += ' WHERE b.created_at BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      query += ` GROUP BY ${groupBy} ORDER BY period DESC LIMIT 30`;

      const [trends] = await db.query(query, params);
      res.json({ trends });
    } catch (error) {
      console.error('Get booking trends error:', error);
      res.status(500).json({ error: 'Failed to fetch booking trends' });
    }
  },

  // Get environment performance metrics
  getEnvironmentPerformance: async (req, res) => {
    try {
      const { environment_id, start_date, end_date } = req.query;

      let query = `
        SELECT 
          e.id,
          e.name,
          e.type,
          AVG(CASE WHEN em.metric_type = 'cpu' THEN em.metric_value END) as avg_cpu,
          AVG(CASE WHEN em.metric_type = 'memory' THEN em.metric_value END) as avg_memory,
          AVG(CASE WHEN em.metric_type = 'response_time' THEN em.metric_value END) as avg_response_time,
          SUM(CASE WHEN em.status = 'critical' THEN 1 ELSE 0 END) as critical_incidents,
          SUM(CASE WHEN em.status = 'warning' THEN 1 ELSE 0 END) as warning_incidents
        FROM environments e
        LEFT JOIN environment_metrics em ON e.id = em.environment_id
      `;

      const params = [];

      if (start_date && end_date) {
        query += ' WHERE em.recorded_at BETWEEN ? AND ?';
        params.push(start_date, end_date);
      }

      if (environment_id) {
        query += (params.length > 0 ? ' AND' : ' WHERE') + ' e.id = ?';
        params.push(environment_id);
      }

      query += ' GROUP BY e.id, e.name, e.type';

      const [performance] = await db.query(query, params);
      res.json({ performance });
    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  },

  // Get comprehensive analytics dashboard
  getAnalyticsDashboard: async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      const params = start_date && end_date ? [start_date, end_date] : [];

      // Overall statistics
      const [overallStats] = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM environments) as total_environments,
          (SELECT COUNT(*) FROM bookings ${start_date ? 'WHERE created_at BETWEEN ? AND ?' : ''}) as total_bookings,
          (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as active_users,
          (SELECT COUNT(*) FROM conflicts WHERE resolution_status = 'unresolved') as unresolved_conflicts
      `, params);

      // Booking status distribution
      const [bookingStatus] = await db.query(`
        SELECT status, COUNT(*) as count
        FROM bookings
        ${start_date ? 'WHERE created_at BETWEEN ? AND ?' : ''}
        GROUP BY status
      `, params);

      // Environment type distribution
      const [envTypes] = await db.query('SELECT type, COUNT(*) as count FROM environments GROUP BY type');

      // Top users by bookings
      const [topUsers] = await db.query(`
        SELECT u.full_name, u.department, COUNT(b.id) as booking_count
        FROM users u
        JOIN bookings b ON u.id = b.user_id
        ${start_date ? 'WHERE b.created_at BETWEEN ? AND ?' : ''}
        GROUP BY u.id, u.full_name, u.department
        ORDER BY booking_count DESC
        LIMIT 5
      `, params);

      // Most used environments
      const [topEnvironments] = await db.query(`
        SELECT e.name, e.type, COUNT(b.id) as usage_count
        FROM environments e
        JOIN bookings b ON e.id = b.environment_id
        ${start_date ? 'WHERE b.created_at BETWEEN ? AND ?' : ''}
        GROUP BY e.id, e.name, e.type
        ORDER BY usage_count DESC
        LIMIT 5
      `, params);

      res.json({
        overallStats: overallStats[0],
        bookingStatusDistribution: bookingStatus,
        environmentTypeDistribution: envTypes,
        topUsers,
        topEnvironments
      });
    } catch (error) {
      console.error('Get analytics dashboard error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics dashboard' });
    }
  },

  // Export report data (CSV format)
  exportReport: async (req, res) => {
    try {
      const { report_type, start_date, end_date } = req.query;

      let data = [];
      let filename = 'report.csv';

      switch (report_type) {
        case 'utilization':
          const utilResult = await db.query(`
            SELECT 
              e.name, e.type, COUNT(b.id) as bookings,
              SUM(TIMESTAMPDIFF(HOUR, b.start_time, b.end_time)) as hours
            FROM environments e
            LEFT JOIN bookings b ON e.id = b.environment_id
            WHERE b.start_time BETWEEN ? AND ?
            GROUP BY e.id
          `, [start_date, end_date]);
          data = utilResult[0];
          filename = 'utilization_report.csv';
          break;

        case 'bookings':
          const bookingResult = await db.query(`
            SELECT b.*, e.name as environment, u.full_name as user
            FROM bookings b
            JOIN environments e ON b.environment_id = e.id
            JOIN users u ON b.user_id = u.id
            WHERE b.created_at BETWEEN ? AND ?
          `, [start_date, end_date]);
          data = bookingResult[0];
          filename = 'bookings_report.csv';
          break;

        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      // Convert to CSV
      if (data.length === 0) {
        return res.status(404).json({ error: 'No data available for the specified period' });
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (error) {
      console.error('Export report error:', error);
      res.status(500).json({ error: 'Failed to export report' });
    }
  }
};

module.exports = analyticsController;
