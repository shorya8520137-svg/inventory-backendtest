/**
 * 🧩 Product Router
 * Handles product search, filtering, tracking, and full inventory fetching
 */

const express = require('express');
const router = express.Router();

// ✅ Import product controller functions
const {
    searchProducts,
    filterInventory,
    trackProduct,
    getAllInventory
} = require('../controllers/productController');

// 🧭 Log router load confirmation
console.log('[ProductRouter] ✅ Routes initialized');

/**
 * 🩺 Health Check (optional)
 * @route   GET /api/products
 * @desc    Confirms Product API is running
 * @access  Public
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Product API is active 🧾'
    });
});

/**
 * 🔍 Product Search
 * @route   GET /api/products/search
 * @query   ?query=<search term>
 * @desc    Returns product suggestions for autocomplete
 * @access  Public
 */
router.get('/search', async (req, res) => {
    try {
        await searchProducts(req, res);
    } catch (err) {
        console.error('[ProductRouter] ❌ Search failed:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
    }
});

/**
 * 🧮 Filtered Inventory Fetch
 * @route   GET /api/products/filter
 * @query   ?table=<warehouse_table>&date=<YYYY-MM-DD>&product=<term>
 * @desc    Fetches inventory by date, warehouse, and product name
 * @access  Public
 */
router.get('/filter', async (req, res) => {
    try {
        await filterInventory(req, res);
    } catch (err) {
        console.error('[ProductRouter] ❌ Filter failed:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
    }
});

/**
 * 🚚 Product Tracker
 * @route   GET /api/products/track
 * @query   ?barcode=<code>&warehouse=<warehouse>
 * @desc    Tracks movement of a product (dispatch, return, damage, recover)
 * @access  Public
 */
router.get('/track', async (req, res) => {
    try {
        await trackProduct(req, res);
    } catch (err) {
        console.error('[ProductRouter] ❌ Tracker failed:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
    }
});

/**
 * 📦 Full Inventory Fetch
 * @route   GET /api/products/all
 * @query   ?table=<warehouse_table>
 * @desc    Returns all inventory records for a specific warehouse
 * @access  Public
 */
router.get('/all', async (req, res) => {
    try {
        await getAllInventory(req, res);
    } catch (err) {
        console.error('[ProductRouter] ❌ Full inventory fetch failed:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error', details: err.message });
    }
});

// 🧭 Final confirmation log
console.log('[ProductRouter] ✅ Mounted all product routes successfully');

module.exports = router;
