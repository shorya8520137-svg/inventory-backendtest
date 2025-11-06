const express = require('express');
const router = express.Router();
const trackerController = require('../controllers/trackerController');

router.get('/track/:barcode', trackerController.getProductTracking);

module.exports = router;