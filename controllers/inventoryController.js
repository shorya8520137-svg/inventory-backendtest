const db = require('../db/connection'); // ✅ MySQL connection

/**
 * 📥 Insert inventory data (bulk or single row)
 */
exports.insertInventory = (req, res) => {
    const { table, payload } = req.body;

    // ✅ Validate basic input
    if (!table || !payload) {
        console.warn('[InventoryController] ⚠️ Missing table or payload');
        return res.status(400).json({ error: 'Missing table or payload' });
    }

    // ✅ Allow only specific warehouse inventory tables
    const allowedTables = [
        'gurgaon_inventory',
        'hyderabad_inventory',
        'mumbai_inventory',
        'ahmedabad_inventory',
        'bangalore_inventory'
    ];

    if (!allowedTables.includes(table)) {
        console.warn('[InventoryController] ❌ Invalid table name:', table);
        return res.status(400).json({ error: 'Invalid or unauthorized table name' });
    }

    // ✅ Clean & normalize payload fields
    const safePayload = {
        product: (payload.name || '').trim(),
        variant: (payload.variant || '').trim(),
        code: (payload.code || '').trim(),
        stock: Number(payload.stock) || 0,
        warehouse: (payload.warehouse || '').trim(),
        opening: Number(payload.opening) || 0,
        return: Number(payload.return) || 0,
        date: payload.date || new Date().toISOString().split('T')[0],
        time: payload.time || new Date().toTimeString().slice(0, 5)
    };

    // ✅ Build SQL query safely
    const query = `
        INSERT INTO ${table}
        (product, variant, code, stock, warehouse, opening, \`return\`, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        safePayload.product,
        safePayload.variant,
        safePayload.code,
        safePayload.stock,
        safePayload.warehouse,
        safePayload.opening,
        safePayload.return,
        `${safePayload.date} ${safePayload.time}`
    ];

    // ✅ Execute query
    db.query(query, values, (err, result) => {
        if (err) {
            console.error(`[InventoryController] ❌ Insert failed for ${table}:`, err.message);
            return res.status(500).json({
                success: false,
                error: 'Database insert failed',
                details: err.sqlMessage || err.message
            });
        }

        console.log(`[InventoryController] ✅ Inserted 1 row into ${table}`);
        res.status(200).json({
            success: true,
            message: `Inserted successfully into ${table}`,
            insertedId: result.insertId || null
        });
    });
};
