const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');

// ✅ Health Check
router.get('/', (req, res) => {
    res.send('✅ Dispatch routes are up and running.');
});

// 📦 Dropdown Routes
router.get('/warehouses', dispatchController.getWarehouses);
router.get('/logistics', dispatchController.getLogistics);
router.get('/processed-persons', dispatchController.getProcessedPersons);
router.get('/payment-modes', dispatchController.getPaymentModes);

// 🔍 Product Search
router.get('/search-products', dispatchController.searchProducts);

// 🚀 Dispatch Submission
router.post('/push-to-db', dispatchController.pushToDb);

// 🔁 Status Sync Route (Frontend calls this after dispatch submit)
router.post('/update-status', dispatchController.updateStatus);

module.exports = router;
