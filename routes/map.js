const express = require("express");
const router = express.Router();
const trackController = require("../controllers/trackController");

// Batch AWB tracking
router.get("/track", trackController.getBatchTracking);

// Latest markers for map
router.get("/map/markers", trackController.getLatestMarkers);

module.exports = router;
