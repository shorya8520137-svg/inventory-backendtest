/**
 * 🚦 Status Router
 * Handles AWB status updates and retrieval for all warehouse tables
 */

const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// 🧭 Log router load confirmation
console.log('[StatusRouter] ✅ Routes initialized');

/**
 * 🩺 Health Check
 * @route   GET /api/status
 * @desc    Confirms Status API is active
 * @access  Public
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Status API is active 🚦'
    });
});

/**
 * 🛠️ Update AWB Status
 * @route   POST /api/status/update
 * @body    { awb, warehouse, newStatus }
 * @desc    Updates order status in the corresponding warehouse table
 * @access  Public
 */
router.post('/update', async (req, res) => {
    console.log('[StatusRouter] 🔧 /update endpoint triggered');

    try {
        await statusController.overrideStatus(req, res);
    } catch (err) {
        console.error('[StatusRouter] ❌ Update failed:', err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: err.message
        });
    }
});

/**
 * 🔍 Fetch AWB Details
 * @route   GET /api/status/fetch-awb
 * @query   ?awb=<awbNumber>&warehouse=<warehouseName>
 * @desc    Fetches AWB details from warehouse tables
 * @access  Public
 */
router.get('/fetch-awb', async (req, res) => {
    console.log('[StatusRouter] 🔍 /fetch-awb endpoint triggered');

    try {
        await statusController.fetchAwbDetails(req, res);
    } catch (err) {
        console.error('[StatusRouter] ❌ Fetch AWB failed:', err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: err.message
        });
    }
});

// 🧭 Final confirmation log
console.log('[StatusRouter] ✅ Mounted: /api/status/update & /api/status/fetch-awb');

module.exports = router;
