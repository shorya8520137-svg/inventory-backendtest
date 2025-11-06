const express = require('express');
const router = express.Router();

// ✅ Import all product controller functions
const {
    searchProducts,
    filterInventory,
    trackProduct,
    getAllInventory // ✅ Injected
} = require('../controllers/productController');

console.log('[ProductRoutes] ✅ Product routes loaded');

/**
 * @route   GET /api/products/search
 * @desc    Returns product suggestions for InventorySheet
 * @access  Public
 */
router.get('/search', searchProducts);

/**
 * @route   GET /api/products/filter
 * @desc    Returns filtered inventory data based on table and date
 * @access  Public
 */
router.get('/filter', filterInventory);

/**
 * @route   GET /api/products/track
 * @desc    Tracks product movement by barcode and warehouse
 * @access  Public
 */
router.get('/track', trackProduct);

/**
 * @route   GET /api/products/all
 * @desc    Returns full inventory for selected warehouse (no filters)
 * @access  Public
 */
router.get('/all', getAllInventory); // ✅ New route added

module.exports = router;