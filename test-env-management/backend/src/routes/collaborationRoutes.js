const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Notification routes
router.get('/notifications', notificationController.getUserNotifications);
router.patch('/notifications/:id/read', notificationController.markAsRead);
router.patch('/notifications/read-all', notificationController.markAllAsRead);
router.delete('/notifications/:id', notificationController.deleteNotification);

// Comment routes
router.get('/comments', notificationController.getComments);
router.post('/comments', notificationController.addComment);
router.put('/comments/:id', notificationController.updateComment);
router.delete('/comments/:id', notificationController.deleteComment);

module.exports = router;
