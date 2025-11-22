const express = require("express");
const router = express.Router();
const dashboard = require("../controllers/dashboardController");

// Existing routes
router.get("/total-stock", dashboard.getTotalStock);
router.get("/orders-pending", dashboard.getOrdersPending);
router.get("/invoices-generated", dashboard.getInvoicesGenerated);
router.get("/returns-processed", dashboard.getReturnsProcessed);
router.get("/payment-methods", dashboard.getPaymentMethods);

// 🆕 NEW: Monthly stock per warehouse
router.get("/stock-levels", dashboard.getMonthlyStockPerWarehouse);

module.exports = router;
