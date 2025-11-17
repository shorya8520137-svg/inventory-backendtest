const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// --- existing routes ---
router.get('/logistics', orderController.getLogistics);
router.get('/payment-mode', orderController.getPaymentModes);
router.get('/processed-persons', orderController.getProcessedPersons);
router.post('/ordersheet-filter', orderController.filterOrders);

// --- ✅ new route for product name search suggestions ---
router.get('/search-products', orderController.searchProducts);

module.exports = router;
