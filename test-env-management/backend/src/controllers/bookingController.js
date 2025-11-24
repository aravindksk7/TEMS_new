const db = require('../config/database');

const bookingController = {
  // Get all bookings
  getAllBookings: async (req, res) => {
    try {
      const { status, user_id, environment_id, start_date, end_date } = req.query;
      
      let query = `
        SELECT b.*, 
        e.name as environment_name, e.type as environment_type,
        u.full_name as user_name, u.email as user_email,
        r.name as release_name, r.version as release_version
        FROM bookings b
        JOIN environments e ON b.environment_id = e.id
        JOIN users u ON b.user_id = u.id
        LEFT JOIN releases r ON b.release_id = r.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND b.status = ?';
        params.push(status);
      }

      if (user_id) {
        query += ' AND b.user_id = ?';
        params.push(user_id);
      }

      if (environment_id) {
        query += ' AND b.environment_id = ?';
        params.push(environment_id);
      }

      if (start_date && end_date) {
        query += ` AND (
          (b.start_time BETWEEN ? AND ?)
          OR (b.end_time BETWEEN ? AND ?)
          OR (b.start_time <= ? AND b.end_time >= ?)
        )`;
        params.push(start_date, end_date, start_date, end_date, start_date, end_date);
      }

      query += ' ORDER BY b.start_time DESC';

      const [bookings] = await db.query(query, params);
      res.json({ bookings });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  },

  // Get booking by ID
  getBookingById: async (req, res) => {
    try {
      const { id } = req.params;

      const [bookings] = await db.query(`
        SELECT b.*, 
        e.name as environment_name, e.type as environment_type, e.url as environment_url,
        u.full_name as user_name, u.email as user_email, u.department,
        r.name as release_name, r.version as release_version
        FROM bookings b
        JOIN environments e ON b.environment_id = e.id
        JOIN users u ON b.user_id = u.id
        LEFT JOIN releases r ON b.release_id = r.id
        WHERE b.id = ?
      `, [id]);

      if (bookings.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Get conflicts for this booking
      const [conflicts] = await db.query(`
        SELECT c.*, 
        b1.project_name as booking1_project, b1.start_time as booking1_start, b1.end_time as booking1_end,
        b2.project_name as booking2_project, b2.start_time as booking2_start, b2.end_time as booking2_end,
        u1.full_name as booking1_user, u2.full_name as booking2_user
        FROM conflicts c
        JOIN bookings b1 ON c.booking_id_1 = b1.id
        JOIN bookings b2 ON c.booking_id_2 = b2.id
        JOIN users u1 ON b1.user_id = u1.id
        JOIN users u2 ON b2.user_id = u2.id
        WHERE (c.booking_id_1 = ? OR c.booking_id_2 = ?)
        AND c.resolution_status = 'unresolved'
      `, [id, id]);

      res.json({
        booking: bookings[0],
        conflicts
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  },

  // Create booking with conflict detection
  createBooking: async (req, res) => {
    try {
      const { environment_id, release_id, project_name, purpose, start_time, end_time, priority } = req.body;

      if (!environment_id || !start_time || !end_time) {
        return res.status(400).json({ error: 'Environment, start time, and end time are required' });
      }

      // Validate time range
      if (new Date(start_time) >= new Date(end_time)) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // Check environment exists
      const [environments] = await db.query('SELECT * FROM environments WHERE id = ?', [environment_id]);
      if (environments.length === 0) {
        return res.status(404).json({ error: 'Environment not found' });
      }

      // Detect conflicts
      const [conflictingBookings] = await db.query(`
        SELECT b.*, u.full_name as user_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.environment_id = ?
        AND b.status IN ('approved', 'active', 'pending')
        AND (
          (b.start_time < ? AND b.end_time > ?)
          OR (b.start_time < ? AND b.end_time > ?)
          OR (b.start_time >= ? AND b.end_time <= ?)
        )
      `, [environment_id, end_time, start_time, end_time, start_time, start_time, end_time]);

      // Create booking
      const [result] = await db.query(
        `INSERT INTO bookings (environment_id, user_id, release_id, project_name, purpose, start_time, end_time, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [environment_id, req.user.id, release_id || null, project_name, purpose, start_time, end_time, priority || 'medium', 'pending']
      );

      const bookingId = result.insertId;

      // Create conflict records if conflicts detected
      if (conflictingBookings.length > 0) {
        for (const conflictingBooking of conflictingBookings) {
          await db.query(
            `INSERT INTO conflicts (booking_id_1, booking_id_2, conflict_type, severity)
             VALUES (?, ?, 'time_overlap', ?)`,
            [bookingId, conflictingBooking.id, priority === 'critical' ? 'high' : 'medium']
          );

          // Create notification for conflicting booking owner
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, link, priority)
             VALUES (?, 'conflict_alert', ?, ?, ?, ?)`,
            [
              conflictingBooking.user_id,
              'Booking Conflict Detected',
              `Your booking for ${conflictingBooking.project_name} has a time conflict with a new booking request.`,
              `/bookings/${conflictingBooking.id}`,
              'high'
            ]
          );
        }
      }

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'booking', bookingId, 'create', `Created booking for project: ${project_name}`]
      );

      // Create notification for managers
      const [managers] = await db.query(
        "SELECT id FROM users WHERE role IN ('manager', 'admin') AND is_active = TRUE"
      );

      for (const manager of managers) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, link, priority)
           VALUES (?, 'approval_request', ?, ?, ?, ?)`,
          [
            manager.id,
            'New Booking Approval Required',
            `${req.user.full_name} has requested approval for booking: ${project_name}`,
            `/bookings/${bookingId}`,
            'medium'
          ]
        );
      }

      res.status(201).json({
        message: 'Booking created successfully',
        bookingId,
        conflictsDetected: conflictingBookings.length > 0,
        conflicts: conflictingBookings
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  },

  // Update booking status (approve/reject)
  updateBookingStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['approved', 'rejected', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
      if (bookings.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookings[0];

      await db.query(
        'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );

      // If approved, set to active if current time is within booking period
      if (status === 'approved') {
        const now = new Date();
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);

        if (now >= startTime && now <= endTime) {
          await db.query(
            'UPDATE bookings SET status = ?, actual_start_time = NOW() WHERE id = ?',
            ['active', id]
          );
        }

        // Update environment status
        await db.query(
          "UPDATE environments SET status = 'in-use', current_usage = current_usage + 1 WHERE id = ?",
          [booking.environment_id]
        );
      }

      // Create notification for booking owner
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES (?, 'booking_reminder', ?, ?, ?)`,
        [
          booking.user_id,
          `Booking ${status}`,
          `Your booking for ${booking.project_name} has been ${status}. ${notes || ''}`,
          `/bookings/${id}`
        ]
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'booking', id, status, `${status} booking: ${booking.project_name}${notes ? ' - ' + notes : ''}`]
      );

      res.json({ message: `Booking ${status} successfully` });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  },

  // Update booking details (admin/manager)
  updateBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const { environment_id, release_id, project_name, purpose, start_time, end_time, priority } = req.body;

      const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
      if (bookings.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookings[0];

      // Only the booking owner or admin/manager may update
      if (req.user.id !== booking.user_id && !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to update this booking' });
      }

      // Validate times if provided
      if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // If environment changed, ensure it exists
      if (environment_id) {
        const [envs] = await db.query('SELECT id FROM environments WHERE id = ?', [environment_id]);
        if (envs.length === 0) return res.status(404).json({ error: 'Environment not found' });
      }

      const fields = [];
      const params = [];
      if (environment_id !== undefined) { fields.push('environment_id = ?'); params.push(environment_id); }
      if (release_id !== undefined) { fields.push('release_id = ?'); params.push(release_id); }
      if (project_name !== undefined) { fields.push('project_name = ?'); params.push(project_name); }
      if (purpose !== undefined) { fields.push('purpose = ?'); params.push(purpose); }
      if (start_time !== undefined) { fields.push('start_time = ?'); params.push(start_time); }
      if (end_time !== undefined) { fields.push('end_time = ?'); params.push(end_time); }
      if (priority !== undefined) { fields.push('priority = ?'); params.push(priority); }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      params.push(id);
      const sql = `UPDATE bookings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
      const [result] = await db.query(sql, params);

      if (result.affectedRows === 0) return res.status(404).json({ error: 'Booking not found' });

      const [rows] = await db.query('SELECT b.*, e.name as environment_name FROM bookings b JOIN environments e ON b.environment_id = e.id WHERE b.id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'booking', id, 'update', `Updated booking: ${rows[0].project_name}`]
      );

      res.json({ message: 'Booking updated successfully', booking: rows[0] });
    } catch (error) {
      console.error('Update booking error:', error);
      res.status(500).json({ error: 'Failed to update booking' });
    }
  },

  // Get user's bookings
  getUserBookings: async (req, res) => {
    try {
      const userId = req.user.id;

      const [bookings] = await db.query(`
        SELECT b.*, 
        e.name as environment_name, e.type as environment_type
        FROM bookings b
        JOIN environments e ON b.environment_id = e.id
        WHERE b.user_id = ?
        ORDER BY b.start_time DESC
      `, [userId]);

      res.json({ bookings });
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({ error: 'Failed to fetch user bookings' });
    }
  },

  // Get booking statistics
  getBookingStatistics: async (req, res) => {
    try {
      const sql = "SELECT COUNT(*) as total_bookings, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_bookings, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_bookings, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings, SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical_priority, SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_count FROM bookings";

      // execute
      const [stats] = await db.query(sql);

      const conflictSql = "SELECT COUNT(*) as total_conflicts, " +
        "SUM(CASE WHEN resolution_status = 'unresolved' THEN 1 ELSE 0 END) as unresolved_conflicts, " +
        "SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_conflicts " +
        "FROM conflicts";

      const [conflictStats] = await db.query(conflictSql);

      res.json({ 
        bookings: stats[0],
        conflicts: conflictStats[0]
      });
    } catch (error) {
      console.error('Get booking statistics error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  ,

  // Delete booking (owner or admin/manager)
  deleteBooking: async (req, res) => {
    try {
      const { id } = req.params;

      const [bookings] = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
      if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });

      const booking = bookings[0];

      // Only the booking owner or admin/manager may delete
      if (req.user.id !== booking.user_id && !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Not authorized to delete this booking' });
      }

      // Prevent deletion of active bookings
      if (booking.status === 'active') {
        return res.status(400).json({ error: 'Cannot delete an active booking' });
      }

      // Delete booking (will cascade related records where configured)
      await db.query('DELETE FROM bookings WHERE id = ?', [id]);

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'booking', id, 'delete', `Deleted booking: ${booking.project_name}`]
      );

      res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
      console.error('Delete booking error:', error);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  },
};

module.exports = bookingController;
