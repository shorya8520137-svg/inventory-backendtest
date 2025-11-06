const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// 🛠️ Route Logs (for audit-mode trace)
console.log('[StatusRoutes] ✅ Routes loaded');

// 🚀 POST: Override status by AWB + Warehouse
router.post('/update', (req, res, next) => {
    console.log('[StatusRoutes] 🔧 /update triggered');
    next();
}, statusController.overrideStatus);

// 🔍 GET: Fetch AWB details from warehouse table
router.get('/fetch-awb', (req, res, next) => {
    console.log('[StatusRoutes] 🔍 /fetch-awb triggered');
    next();
}, statusController.fetchAwbDetails);

module.exports = router;