const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      const [users] = await db.query(
        'SELECT id, username, email, full_name, role, department FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }

      req.user = users[0];
      next();
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
