const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all bookings
router.get('/', bookingController.getAllBookings);

// Get booking statistics
router.get('/statistics', bookingController.getBookingStatistics);

// Get user's bookings
router.get('/my-bookings', bookingController.getUserBookings);

// Get booking by ID
router.get('/:id', bookingController.getBookingById);

// Create booking
router.post('/', bookingController.createBooking);

// Update booking status (approve/reject - manager/admin only)
router.patch('/:id/status', authorizeRoles('admin', 'manager'), bookingController.updateBookingStatus);

// Update booking details (manager/admin only)
router.put('/:id', authorizeRoles('admin', 'manager'), bookingController.updateBooking);

module.exports = router;
