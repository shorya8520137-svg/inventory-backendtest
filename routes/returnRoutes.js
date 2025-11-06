// routes/returnRoutes.js
const express = require('express');
const router = express.Router();
const { submitReturnEntry } = require('../controllers/returnController');

router.post('/submit', submitReturnEntry);

module.exports = router;