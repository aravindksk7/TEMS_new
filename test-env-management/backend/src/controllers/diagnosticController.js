const db = require('../config/database');

const diagnosticController = {
  // Diagnostic endpoint - tests all dashboard data sources
  getDashboardDiagnostic: async (req, res) => {
    const results = {
      timestamp: new Date().toISOString(),
      user: req.user ? { id: req.user.id, role: req.user.role } : null,
      checks: {}
    };

    // Test 1: Environment statistics
    try {
      const [envStats] = await db.query(`
        SELECT 
          COUNT(*) as total_environments,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'in-use' THEN 1 ELSE 0 END) as in_use,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN type = 'dev' THEN 1 ELSE 0 END) as dev_count,
          SUM(CASE WHEN type = 'qa' THEN 1 ELSE 0 END) as qa_count,
          SUM(CASE WHEN type = 'staging' THEN 1 ELSE 0 END) as staging_count,
          SUM(CASE WHEN type = 'uat' THEN 1 ELSE 0 END) as uat_count
        FROM environments
      `);
      results.checks.environmentStatistics = { status: 'OK', data: envStats[0] };
    } catch (error) {
      results.checks.environmentStatistics = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 2: Booking statistics (using the fixed concatenated SQL)
    try {
      const sql = "SELECT COUNT(*) as total_bookings, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_bookings, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_bookings, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings, SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical_priority, SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_count FROM bookings";
      const [bookingStats] = await db.query(sql);
      results.checks.bookingStatistics = { status: 'OK', data: bookingStats[0] };
    } catch (error) {
      results.checks.bookingStatistics = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 3: Conflict statistics
    try {
      const conflictSql = "SELECT COUNT(*) as total_conflicts, " +
        "SUM(CASE WHEN resolution_status = 'unresolved' THEN 1 ELSE 0 END) as unresolved_conflicts, " +
        "SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_conflicts " +
        "FROM conflicts";
      const [conflictStats] = await db.query(conflictSql);
      results.checks.conflictStatistics = { status: 'OK', data: conflictStats[0] };
    } catch (error) {
      results.checks.conflictStatistics = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 4: Monitoring dashboard query
    try {
      const [criticalEnvs] = await db.query(`
        SELECT DISTINCT e.*
        FROM environments e
        LEFT JOIN environment_metrics em ON e.id = em.environment_id
        WHERE e.status = 'maintenance' 
           OR (em.metric_type = 'cpu' AND em.metric_value > 80)
           OR (em.metric_type = 'memory' AND em.metric_value > 80)
        ORDER BY e.updated_at DESC
        LIMIT 10
      `);
      results.checks.criticalEnvironments = { status: 'OK', count: criticalEnvs.length };
    } catch (error) {
      results.checks.criticalEnvironments = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 5: Recent activities
    try {
      const [activities] = await db.query(`
        SELECT a.*, u.full_name as user_name
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 10
      `);
      results.checks.recentActivities = { status: 'OK', count: activities.length };
    } catch (error) {
      results.checks.recentActivities = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 6: Upcoming bookings
    try {
      const [upcomingBookings] = await db.query(`
        SELECT b.*, e.name as environment_name, u.full_name as user_name
        FROM bookings b
        JOIN environments e ON b.environment_id = e.id
        JOIN users u ON b.user_id = u.id
        WHERE b.status = 'approved'
        AND b.start_time >= NOW()
        AND b.start_time <= DATE_ADD(NOW(), INTERVAL 24 HOUR)
        ORDER BY b.start_time ASC
        LIMIT 5
      `);
      results.checks.upcomingBookings = { status: 'OK', count: upcomingBookings.length };
    } catch (error) {
      results.checks.upcomingBookings = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 7: Analytics trends
    try {
      const [trends] = await db.query(`
        SELECT DATE(created_at) as date, COUNT(*) as total_bookings
        FROM bookings
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      results.checks.analyticsTrends = { status: 'OK', count: trends.length };
    } catch (error) {
      results.checks.analyticsTrends = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Test 8: Monitoring activities endpoint
    try {
      const [monitorActivities] = await db.query(`
        SELECT a.*, u.full_name as user_name
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 10 OFFSET 0
      `);
      results.checks.monitoringActivities = { status: 'OK', count: monitorActivities.length };
    } catch (error) {
      results.checks.monitoringActivities = { 
        status: 'ERROR', 
        error: error.message,
        sqlState: error.sqlState,
        errno: error.errno
      };
    }

    // Summary
    const errorCount = Object.values(results.checks).filter(c => c.status === 'ERROR').length;
    const successCount = Object.values(results.checks).filter(c => c.status === 'OK').length;
    
    results.summary = {
      total: Object.keys(results.checks).length,
      success: successCount,
      errors: errorCount,
      overallStatus: errorCount === 0 ? 'HEALTHY' : 'DEGRADED'
    };

    res.json(results);
  }
};

module.exports = diagnosticController;
