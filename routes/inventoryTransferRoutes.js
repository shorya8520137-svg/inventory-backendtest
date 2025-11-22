const express = require('express');
const router = express.Router();
const transferController = require('../controllers/inventoryTransferController');

// POST → Transfer Excel data from host → receiver inventory
router.post('/transfer', transferController.transferInventory);

module.exports = router;
