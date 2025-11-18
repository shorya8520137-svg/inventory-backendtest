require("dotenv").config({ path: "/home/ubuntu/inventory-backendtest/.env" });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();

// =============================================
// ✅ Allowed frontend origins
// =============================================
const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://inventory-a78le31ss-test-tests-projects-d6b8ba0b.vercel.app",
    "https://inventory-7r662qhwr-test-tests-projects-d6b8ba0b.vercel.app", // ⭐ NEW
    "https://13-201-222-24.nip.io",
];

// =============================================
// ✅ CORS Configuration
// =============================================
app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);

            console.warn(`[CORS] ❌ Blocked request from: ${origin}`);
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// =============================================
// ✅ Core Middleware
// =============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// =============================================
// ✅ Database Connection
// =============================================
require("./db/connection");

// =============================================
// ORIGINAL ROUTES (UNTOUCHED)
// =============================================
app.use("/api/dispatch", require("./routes/dispatchRoutes"));
app.use("/api/status", require("./routes/statusRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/returns", require("./routes/returnRoutes"));
app.use("/api/damage", require("./routes/DamageRouter"));
app.use("/api", require("./routes/ordersheet.routes"));
app.use("/api", require("./routes/trackerRoutes")); // barcode tracking

// =============================================
// 🟦 Existing Hockey Tracking Router
// URL → /api/hockey/track/:awb
// =============================================
app.use("/api/hockey", require("./routes/hockeyrouter"));

// =============================================
// 🟩 NEW MAP TRACKING ROUTES
// URL → /api/map/track?awbs=111,222
// URL → /api/map/markers
// =============================================
app.use("/api/map", require("./routes/map"));

// =============================================
// HEALTH CHECK ROUTE
// =============================================
app.get("/", (req, res) => {
    res.json({
        status: "✅ OK",
        message: "Dispatch backend is live and healthy",
        timestamp: new Date().toISOString(),
        database: process.env.DB_NAME,
        server: req.hostname,
    });
});

// =============================================
// GLOBAL ERROR HANDLER
// =============================================
app.use((err, req, res, next) => {
    console.error("[Error Handler] ❌", err.message);
    res.status(500).json({ error: err.message });
});

// =============================================
// SERVER START
// =============================================
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log("=============================================");
    console.log("[Backend] ✅ Server Started Successfully");
    console.log(`[Backend] 🌍 Local: http://localhost:${PORT}`);
    console.log(`[Backend] 🌐 Public (AWS HTTPS): https://13-201-222-24.nip.io`);
    console.log("=============================================");
});
