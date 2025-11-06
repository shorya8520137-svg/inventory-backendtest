const db = require('../db/connection');

// 🗺️ Warehouse Table Map
const warehouseMap = {
    'Mumbai Warehouse': 'Mumbai_Warehouse',
    'Hyderabad Warehouse': 'Hyderabad_Warehouse',
    'Ahmedabad Warehouse': 'Ahmedabad_Warehouse',
    'Bangalore Warehouse': 'Bangalore_Warehouse',
    'Gurgaon Warehouse': 'Gurgaon_Warehouse'
};

// 🚀 POST: Override Status by AWB + Warehouse
exports.overrideStatus = (req, res) => {
    console.log('[StatusController] 🔧 overrideStatus triggered');

    const { awb, warehouse, newStatus } = req.body;

    if (!awb || !warehouse || !newStatus) {
        console.warn('[StatusController] ❌ Missing required fields');
        return res.status(400).json({ error: 'AWB, warehouse, and newStatus are required' });
    }

    const tableName = warehouseMap[warehouse.trim()];
    if (!tableName) {
        console.warn('[StatusController] ❌ Invalid warehouse:', warehouse);
        return res.status(400).json({ error: 'Invalid warehouse selected' });
    }

    db.query(
        `UPDATE \`${tableName}\` SET status = ? WHERE awb = ?`,
        [newStatus, awb],
        (err, result) => {
            if (err) {
                console.error('[StatusController] ❌ Status update failed:', err.message);
                return res.status(500).json({ error: 'Status update failed' });
            }

            if (result.affectedRows === 0) {
                console.warn('[StatusController] ⚠️ No matching AWB found');
                return res.status(404).json({ error: 'AWB not found in selected warehouse' });
            }

            console.log(`[StatusController] ✅ Status updated for AWB ${awb} in ${tableName}`);
            res.status(200).json({ success: true, message: 'Status updated successfully' });
        }
    );
};

// 🔍 GET: Fetch AWB details from warehouse table
exports.fetchAwbDetails = (req, res) => {
    console.log('[StatusController] 🔍 fetchAwbDetails triggered');

    const { awb, warehouse } = req.query;

    if (!awb || !warehouse) {
        console.warn('[StatusController] ❌ Missing AWB or warehouse in query');
        return res.status(400).json({ error: 'AWB and warehouse are required' });
    }

    const tableName = warehouseMap[warehouse.trim()];
    if (!tableName) {
        console.warn('[StatusController] ❌ Invalid warehouse:', warehouse);
        return res.status(400).json({ error: 'Invalid warehouse selected' });
    }

    db.query(
        `SELECT * FROM \`${tableName}\` WHERE awb = ?`,
        [awb],
        (err, results) => {
            if (err) {
                console.error('[StatusController] ❌ AWB fetch failed:', err.message);
                return res.status(500).json({ error: 'Query failed' });
            }

            if (results.length === 0) {
                console.warn('[StatusController] ⚠️ No AWB found:', awb);
                return res.status(404).json({ error: 'AWB not found in selected warehouse' });
            }

            console.log(`[StatusController] ✅ AWB ${awb} found in ${tableName}`);
            res.status(200).json(results);
        }
    );
};