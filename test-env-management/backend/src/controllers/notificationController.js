const db = require('../config/database');

const notificationController = {
  // Get user notifications
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const { is_read, limit } = req.query;

      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params = [userId];

      if (is_read !== undefined) {
        query += ' AND is_read = ?';
        params.push(is_read === 'true');
      }

      query += ' ORDER BY created_at DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
      } else {
        query += ' LIMIT 50';
      }

      const [notifications] = await db.query(query, params);

      // Get unread count
      const [unreadCount] = await db.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      res.json({
        notifications,
        unreadCount: unreadCount[0].count
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;

      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
        [userId]
      );

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  },

  // Delete notification
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await db.query(
        'DELETE FROM notifications WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  },

  // Get comments for an entity
  getComments: async (req, res) => {
    try {
      const { entity_type, entity_id } = req.query;

      if (!entity_type || !entity_id) {
        return res.status(400).json({ error: 'Entity type and ID are required' });
      }

      const [comments] = await db.query(`
        SELECT c.*, u.full_name as user_name, u.role as user_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.entity_type = ? AND c.entity_id = ?
        ORDER BY c.created_at ASC
      `, [entity_type, entity_id]);

      res.json({ comments });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  },

  // Add comment
  addComment: async (req, res) => {
    try {
      const { entity_type, entity_id, comment, parent_comment_id } = req.body;

      if (!entity_type || !entity_id || !comment) {
        return res.status(400).json({ error: 'Entity type, ID, and comment are required' });
      }

      const [result] = await db.query(
        `INSERT INTO comments (user_id, entity_type, entity_id, comment, parent_comment_id)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, entity_type, entity_id, comment, parent_comment_id || null]
      );

      // Get entity details for notification
      let entityName = '';
      let notifyUsers = [];

      if (entity_type === 'booking') {
        const [bookings] = await db.query('SELECT project_name, user_id FROM bookings WHERE id = ?', [entity_id]);
        if (bookings.length > 0) {
          entityName = bookings[0].project_name;
          notifyUsers.push(bookings[0].user_id);
        }
      } else if (entity_type === 'environment') {
        const [environments] = await db.query('SELECT name, created_by FROM environments WHERE id = ?', [entity_id]);
        if (environments.length > 0) {
          entityName = environments[0].name;
          notifyUsers.push(environments[0].created_by);
        }
      }

      // Create notifications for relevant users
      for (const userId of notifyUsers) {
        if (userId !== req.user.id) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES (?, 'system', ?, ?, ?)`,
            [
              userId,
              'New Comment',
              `${req.user.full_name} commented on ${entityName}`,
              `/${entity_type}s/${entity_id}`
            ]
          );
        }
      }

      res.status(201).json({
        message: 'Comment added successfully',
        commentId: result.insertId
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  },

  // Update comment
  updateComment: async (req, res) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const userId = req.user.id;

      if (!comment) {
        return res.status(400).json({ error: 'Comment text is required' });
      }

      const [existing] = await db.query('SELECT * FROM comments WHERE id = ? AND user_id = ?', [id, userId]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Comment not found or unauthorized' });
      }

      await db.query(
        'UPDATE comments SET comment = ?, is_edited = TRUE, updated_at = NOW() WHERE id = ?',
        [comment, id]
      );

      res.json({ message: 'Comment updated successfully' });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ error: 'Failed to update comment' });
    }
  },

  // Delete comment
  deleteComment: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const [existing] = await db.query('SELECT * FROM comments WHERE id = ? AND user_id = ?', [id, userId]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Comment not found or unauthorized' });
      }

      await db.query('DELETE FROM comments WHERE id = ?', [id]);

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
};

module.exports = notificationController;
