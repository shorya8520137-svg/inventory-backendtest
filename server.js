require("dotenv").config({ path: "/home/ubuntu/inventory-backendtest/.env" });

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();

// ✅ Allowed frontend origins
const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://inventory-a78le31ss-test-tests-projects-d6b8ba0b.vercel.app",
    "https://13-201-222-24.nip.io",
];

// ✅ CORS Configuration
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

// ✅ Core Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// ✅ Database Connection
require("./db/connection");

// ---------------------------------------------
// ORIGINAL ROUTES (UNTOUCHED)
// ---------------------------------------------
app.use("/api/dispatch", require("./routes/dispatchRoutes"));
app.use("/api/status", require("./routes/statusRoutes"));
app.use("/api/inventory", require("./routes/inventoryRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/returns", require("./routes/returnRoutes"));
app.use("/api/damage", require("./routes/DamageRouter"));
app.use("/api", require("./routes/ordersheet.routes"));
app.use("/api", require("./routes/trackerRoutes")); // ⚠️ barcode wala route

// ---------------------------------------------
// 🟦 ADD HOCKEY TRACKING ROUTER
// ---------------------------------------------
app.use("/api/hockey", require("./routes/hockeyrouter"));

//   Final working URL →  /api/hockey/track/:awb
// ---------------------------------------------

// ✅ Health Check
app.get("/", (req, res) => {
    res.json({
        status: "✅ OK",
        message: "Dispatch backend is live and healthy",
        timestamp: new Date().toISOString(),
        database: process.env.DB_NAME,
        server: req.hostname,
    });
});

// ⚠️ Global Error Handler
app.use((err, req, res, next) => {
    console.error("[Error Handler] ❌", err.message);
    res.status(500).json({ error: err.message });
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log("=============================================");
    console.log("[Backend] ✅ Server Started Successfully");
    console.log(`[Backend] 🌍 Local: http://localhost:${PORT}`);
    console.log(`[Backend] 🌐 Public (AWS HTTPS): https://13-201-222-24.nip.io`);
    console.log("=============================================");
});
