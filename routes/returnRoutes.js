/**
 * 🔁 Return Router
 * Handles product return entries and integrations with inventory tables
 */

const express = require('express');
const router = express.Router();
const { submitReturnEntry } = require('../controllers/returnController'); // ✅ Import controller

// 🧭 Log router load confirmation
console.log('[ReturnRouter] ✅ Routes initialized');

/**
 * 🩺 Health Check
 * @route   GET /api/return
 * @desc    Confirms Return API is active
 * @access  Public
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Return API is active 🔁'
    });
});

/**
 * 📦 Submit Return Entry
 * @route   POST /api/return/submit
 * @desc    Inserts return entry and updates inventory stock
 * @access  Public
 */
router.post('/submit', async (req, res) => {
    try {
        await submitReturnEntry(req, res);
    } catch (err) {
        console.error('[ReturnRouter] ❌ Uncaught Error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: err.message
        });
    }
});

// 🧭 Final confirmation log
console.log('[ReturnRouter] ✅ Mounted: POST /api/return/submit');

module.exports = router;
