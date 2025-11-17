/**
 * 📦 Inventory Router
 * Handles insertion and management of inventory data
 */

const express = require('express');
const router = express.Router();
const { insertInventory } = require('../controllers/inventoryController'); // ✅ Controller import

/**
 * 🧭 Health Check (Optional)
 * Endpoint: GET /api/inventory
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Inventory API is active 📦'
    });
});

/**
 * 🛠️ POST: Insert inventory entry
 * Endpoint: /api/inventory/insert
 */
router.post('/insert', async (req, res) => {
    try {
        await insertInventory(req, res);
    } catch (err) {
        console.error('[InventoryRouter] ❌ Uncaught Error:', err.message);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            details: err.message
        });
    }
});

// 🧭 Log route registration confirmation
console.log('[InventoryRouter] ✅ Mounted: POST /api/inventory/insert');

module.exports = router;
