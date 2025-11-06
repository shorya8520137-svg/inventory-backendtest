const express = require('express');
const router = express.Router();
const { insertDamageEntry } = require('../controllers/DamageController');

// 🛠️ POST: Log damage or recovery entry
router.post('/damage-entry', insertDamageEntry);

// 🧭 Tracker log for route confirmation
console.log('[DamageRouter] ✅ /api/damage/damage-entry route mounted');

module.exports = router;