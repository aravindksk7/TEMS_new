const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authController = {
  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log activity
      await db.query(
        'INSERT INTO activities (user_id, entity_type, action, description, ip_address) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'user', 'login', 'User logged in', req.ip]
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          department: user.department
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  },

  // Register
  register: async (req, res) => {
    try {
      const { username, email, password, full_name, department, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      // Check if user exists
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Determine role - allow admins to specify role, others default to tester
      let userRole = 'tester';
      if (role && req.user && req.user.role === 'admin') {
        userRole = role;
      }

      // Create user
      const [result] = await db.query(
        'INSERT INTO users (username, email, password_hash, full_name, department, role) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, password_hash, full_name, department, userRole]
      );

      res.status(201).json({
        message: 'User registered successfully',
        userId: result.insertId
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  },

  // Get current user
  getCurrentUser: async (req, res) => {
    try {
      res.json({ user: req.user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user information' });
    }
  },

  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const [users] = await db.query(
        'SELECT id, username, email, full_name, role, department, is_active, created_at FROM users ORDER BY created_at DESC'
      );

      res.json({ users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Delete user (admin only)
  deleteUser: async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { userId } = req.params;

      // Prevent deleting self
      if (parseInt(userId) === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Delete user
      const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
};

module.exports = authController;
