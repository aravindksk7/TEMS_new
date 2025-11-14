const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const environmentRoutes = require('./routes/environmentRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', collaborationRoutes);

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_environment', (environmentId) => {
    socket.join(`environment_${environmentId}`);
    console.log(`Socket ${socket.id} joined environment ${environmentId}`);
  });

  socket.on('leave_environment', (environmentId) => {
    socket.leave(`environment_${environmentId}`);
    console.log(`Socket ${socket.id} left environment ${environmentId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Automated tasks using cron
// Check for booking conflicts every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('Running conflict detection...');
    
    const [overlappingBookings] = await db.query(`
      SELECT b1.id as booking1_id, b2.id as booking2_id, b1.environment_id
      FROM bookings b1
      JOIN bookings b2 ON b1.environment_id = b2.environment_id
      WHERE b1.id < b2.id
      AND b1.status IN ('approved', 'active')
      AND b2.status IN ('approved', 'active')
      AND (
        (b1.start_time < b2.end_time AND b1.end_time > b2.start_time)
      )
      AND NOT EXISTS (
        SELECT 1 FROM conflicts c
        WHERE (c.booking_id_1 = b1.id AND c.booking_id_2 = b2.id)
        OR (c.booking_id_1 = b2.id AND c.booking_id_2 = b1.id)
      )
    `);

    for (const conflict of overlappingBookings) {
      await db.query(
        `INSERT INTO conflicts (booking_id_1, booking_id_2, conflict_type, severity)
         VALUES (?, ?, 'time_overlap', 'medium')`,
        [conflict.booking1_id, conflict.booking2_id]
      );
      
      // Emit real-time notification
      io.to(`environment_${conflict.environment_id}`).emit('conflict_detected', {
        booking1: conflict.booking1_id,
        booking2: conflict.booking2_id
      });
    }

    if (overlappingBookings.length > 0) {
      console.log(`Detected ${overlappingBookings.length} new conflicts`);
    }
  } catch (error) {
    console.error('Conflict detection error:', error);
  }
});

// Update booking statuses based on time
cron.schedule('* * * * *', async () => {
  try {
    // Start approved bookings that have reached their start time
    await db.query(`
      UPDATE bookings 
      SET status = 'active', actual_start_time = NOW()
      WHERE status = 'approved' 
      AND start_time <= NOW() 
      AND end_time > NOW()
    `);

    // Complete active bookings that have passed their end time
    const [completedBookings] = await db.query(`
      SELECT id, environment_id FROM bookings
      WHERE status = 'active' AND end_time <= NOW()
    `);

    if (completedBookings.length > 0) {
      await db.query(`
        UPDATE bookings 
        SET status = 'completed', actual_end_time = NOW()
        WHERE status = 'active' AND end_time <= NOW()
      `);

      // Update environment status
      for (const booking of completedBookings) {
        await db.query(`
          UPDATE environments 
          SET current_usage = GREATEST(0, current_usage - 1),
          status = CASE WHEN current_usage <= 1 THEN 'available' ELSE status END
          WHERE id = ?
        `, [booking.environment_id]);

        // Emit real-time update
        io.to(`environment_${booking.environment_id}`).emit('booking_completed', {
          bookingId: booking.id
        });
      }

      console.log(`Completed ${completedBookings.length} bookings`);
    }
  } catch (error) {
    console.error('Booking status update error:', error);
  }
});

// Send booking reminders 30 minutes before start
cron.schedule('*/5 * * * *', async () => {
  try {
    const [upcomingBookings] = await db.query(`
      SELECT b.*, u.id as user_id, e.name as environment_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN environments e ON b.environment_id = e.id
      WHERE b.status = 'approved'
      AND b.start_time BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      AND b.notifications_enabled = TRUE
    `);

    for (const booking of upcomingBookings) {
      const [existing] = await db.query(`
        SELECT id FROM notifications
        WHERE user_id = ? 
        AND type = 'booking_reminder'
        AND link = ?
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `, [booking.user_id, `/bookings/${booking.id}`]);

      if (existing.length === 0) {
        await db.query(`
          INSERT INTO notifications (user_id, type, title, message, link, priority)
          VALUES (?, 'booking_reminder', ?, ?, ?, 'high')
        `, [
          booking.user_id,
          'Booking Starting Soon',
          `Your booking for ${booking.environment_name} starts in 30 minutes`,
          `/bookings/${booking.id}`
        ]);

        console.log(`Sent reminder for booking ${booking.id}`);
      }
    }
  } catch (error) {
    console.error('Booking reminder error:', error);
  }
});

// Simulate environment metrics for demo purposes
cron.schedule('*/2 * * * *', async () => {
  try {
    const [environments] = await db.query('SELECT id FROM environments LIMIT 10');
    
    for (const env of environments) {
      const metrics = [
        { type: 'cpu', value: Math.random() * 100, unit: '%' },
        { type: 'memory', value: Math.random() * 100, unit: '%' },
        { type: 'response_time', value: Math.random() * 1000, unit: 'ms' }
      ];

      for (const metric of metrics) {
        let status = 'normal';
        if (metric.value > 90) status = 'critical';
        else if (metric.value > 75) status = 'warning';

        await db.query(`
          INSERT INTO environment_metrics (environment_id, metric_type, metric_value, unit, status)
          VALUES (?, ?, ?, ?, ?)
        `, [env.id, metric.type, metric.value, metric.unit, status]);

        // Emit real-time metric update
        io.to(`environment_${env.id}`).emit('metric_update', {
          metric_type: metric.type,
          metric_value: metric.value,
          unit: metric.unit,
          status: status
        });
      }
    }
  } catch (error) {
    console.error('Metrics simulation error:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  Test Environment Management System API               ║
║  Server running on port ${PORT}                       ║
║  Environment: ${process.env.NODE_ENV || 'development'}                   ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
