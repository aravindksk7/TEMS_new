const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected routes
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/users', authenticateToken, authController.getAllUsers);
router.delete('/users/:userId', authenticateToken, authController.deleteUser);

module.exports = router;
