const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');

// 🔍 GET Routes
router.get('/warehouses', dispatchController.getWarehouses);
router.get('/logistics', dispatchController.getLogistics);
router.get('/processed-persons', dispatchController.getProcessedPersons);
router.get('/search-products', dispatchController.searchProducts);
router.get('/payment-modes', dispatchController.getPaymentModes);

// 🧪 Debug Route (GET)
router.get('/push-to-db', (req, res) => {
    res.send('✅ POST route active. Use POST method to submit dispatch.');
});

// 🚀 Dispatch Submission (POST)
router.post('/push-to-db', dispatchController.pushToDb);

module.exports = router;