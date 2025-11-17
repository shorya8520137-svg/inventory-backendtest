/**
 * 🧩 Damage / Recovery Router
 * Handles creation of damage and recovery entries
 */

const express = require('express');
const router = express.Router();
const { insertDamageEntry } = require('../controllers/damageController'); // ✅ Ensure lowercase file name consistency

// ✅ Health check route (optional for debugging)
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Damage/Recovery API is active 🔧'
    });
});

/**
 * 🛠️ POST: Log damage or recovery entry
 * Endpoint: /api/damage/damage-entry
 */
router.post('/damage-entry', async (req, res, next) => {
    try {
        await insertDamageEntry(req, res);
    } catch (err) {
        console.error('[DamageRouter] ❌ Uncaught error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: err.message
        });
    }
});

// 🧭 Log confirmation
console.log('[DamageRouter] ✅ Mounted: POST /api/damage/damage-entry');

module.exports = router;
