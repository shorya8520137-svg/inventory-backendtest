const express = require('express');
const router = express.Router();

const { getTrackingDetails } = require('../controllers/trackingController'); // Delhivery
const { getDHLTracking } = require('../controllers/dhlController');         // DHL

router.get('/track', getTrackingDetails);     // 🔍 Track via Delhivery
router.get('/dhl-track', getDHLTracking);     // 🔍 Track via DHL

module.exports = router;