const express = require('express');
const router = express.Router();
const { insertInventory } = require('../controllers/inventoryController');

router.post('/insert', insertInventory);

module.exports = router;