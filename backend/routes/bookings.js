const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Bookings list' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create booking' });
});

module.exports = router;
