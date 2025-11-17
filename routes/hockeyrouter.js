const express = require("express");
const router = express.Router();

const { getTrackingByAwb } = require("../controllers/hockeycontroller");

router.get("/track/:awb", getTrackingByAwb);

module.exports = router;
