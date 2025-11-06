const express = require('express');
const cors = require('cors');

const dispatchRoutes = require('./routes/dispatchRoutes');
const statusRoutes = require('./routes/statusRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const trackerRoutes = require('./routes/trackerRoutes'); // 📦 Barcode-based tracking

const app = express(); // ✅ Declare app before using it

// 🛡️ Middleware
app.use(cors());
app.use(express.json());

// 🔗 Mount Routes
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api', trackerRoutes); // ✅ Mount tracking route

// 🚀 Start Server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});