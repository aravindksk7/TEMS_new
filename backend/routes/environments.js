const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Environments list' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create environment' });
});

module.exports = router;
