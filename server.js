const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config(); // ✅ Load .env variables

// 🛡️ Global Middleware
app.use(cors()); // ✅ Enable CORS for cross-origin requests
app.use(express.json({ limit: '10mb' })); // ✅ Parse incoming JSON payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // ✅ Handle form data

// 📦 Route Imports
const dispatchRoutes = require('./routes/dispatchRoutes');       // 🚚 Dispatch logic
const statusRoutes = require('./routes/statusRoutes');           // 📊 Status tracking
const inventoryRoutes = require('./routes/inventoryRoutes');     // 📦 Inventory insert/fetch
const productRoutes = require('./routes/productRoutes');         // 🔍 Product search + inventory filter
const returnRoutes = require('./routes/returnRoutes');           // 🔁 Return form submission
const damageRoutes = require('./routes/DamageRouter');           // 🛠️ Damage/Recovery entry
const ordersheetRoutes = require('./routes/ordersheet.routes');  // 🧾 Dropdown data + warehouse filter
const trackerRoutes = require('./routes/trackerRoutes');         // 📦 Barcode-based product tracking
// ❌ Removed: const trackingRoutes = require('./routes/tracking'); // 📦 AWB tracking via Delhivery

// 🚦 Route Mounts
app.use('/api/dispatch', dispatchRoutes);       // 🔗 Mount dispatch routes
app.use('/api/status', statusRoutes);           // 🔗 Mount status routes
app.use('/api/inventory', inventoryRoutes);     // 🔗 Mount inventory insert/fetch routes
app.use('/api/products', productRoutes);        // 🔗 Mount product search + inventory filter routes
app.use('/api/returns', returnRoutes);          // 🔗 Mount return form submission route
app.use('/api/damage', damageRoutes);           // 🔗 Mount damage/recovery entry route
app.use('/api', ordersheetRoutes);              // ✅ Mount dropdown + warehouse filter endpoints
app.use('/api', trackerRoutes);                 // ✅ Mount barcode-based tracking route
// ❌ Removed: app.use('/api', trackingRoutes);  // ✅ Mount AWB tracking route

// 🔔 TrackingMore Webhook Handler
app.post('/webhook/trackingmore', (req, res) => {
    const receivedSecret = req.headers['x-trackingmore-secret'];
    const expectedSecret = 'dHmto3s7s7g7s7g7s7g7s7g7s7g7s7g7'; // 🔐 Replace with your actual secret

    if (receivedSecret !== expectedSecret) {
        console.warn('[Webhook] ❌ Invalid secret received');
        return res.status(403).send('Forbidden');
    }

    console.log('[Webhook] ✅ Payload received:', req.body);
    res.status(200).send('OK');
});

// 🧪 Health Check Endpoint
app.get('/', (req, res) => {
    res.send('✅ Dispatch backend is live'); // 🧠 Quick sanity check
});

// 🚀 Server Boot
const PORT = 5000;
app.listen(PORT, () => {
    console.log('[DispatchRoutes] ✅ Dispatch routes loaded');
    console.log('[StatusRoutes] ✅ Status routes loaded');
    console.log('[InventoryRoutes] ✅ Inventory routes loaded');
    console.log('[ProductRoutes] ✅ Product routes loaded');
    console.log('[ReturnRoutes] ✅ Return routes loaded');
    console.log('[DamageRoutes] ✅ Damage/Recovery routes loaded');
    console.log('[OrderSheetRoutes] ✅ Dropdown + warehouse filter routes loaded');
    console.log('[TrackerRoutes] ✅ Barcode-based tracking route loaded');
    // ❌ Removed: console.log('[TrackingRoutes] ✅ AWB tracking route loaded');
    console.log('[Webhook] ✅ TrackingMore webhook route loaded');
    console.log(`[Backend] ✅ Running on http://localhost:${PORT}`);
});