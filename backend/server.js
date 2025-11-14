require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const environmentRoutes = require('./routes/environments');
const bookingRoutes = require('./routes/bookings');
const monitoringRoutes = require('./routes/monitoring');
const conflictRoutes = require('./routes/conflicts');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const commentRoutes = require('./routes/comments');
const deploymentRoutes = require('./routes/deployments');
const activityRoutes = require('./routes/activities');

const { checkConflicts } = require('./services/conflictService');
const { updateEnvironmentMetrics } = require('./services/monitoringService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(compression());
// Allow requests from the frontend and enable credentials for httpOnly cookies
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/activities', activityRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-environment', (environmentId) => {
    socket.join(`environment-${environmentId}`);
    console.log(`Socket ${socket.id} joined environment-${environmentId}`);
  });

  socket.on('leave-environment', (environmentId) => {
    socket.leave(`environment-${environmentId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Scheduled tasks
// Check for conflicts every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running conflict detection...');
  await checkConflicts(io);
});

// Update environment metrics every minute
cron.schedule('* * * * *', async () => {
  console.log('Updating environment metrics...');
  await updateEnvironmentMetrics(io);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
});

module.exports = { app, io };
