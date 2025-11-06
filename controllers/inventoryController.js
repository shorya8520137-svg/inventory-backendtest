const db = require('../db/connection'); // ✅ Correct path to your MySQL connection

exports.insertInventory = (req, res) => {
    const { table, payload } = req.body;

    if (!table || !payload) {
        console.warn('[Controller] ⚠️ Missing table or payload');
        return res.status(400).json({ error: 'Missing table or payload' });
    }

    const query = `
        INSERT INTO ${table} (product, variant, code, stock, warehouse, opening, \`return\`, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        payload.name,
        payload.variant,
        payload.code,
        payload.stock,
        payload.warehouse,
        payload.opening,           // ✅ use actual value
        payload.return,            // ✅ use actual value
        `${payload.date} ${payload.time}`
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error(`[Controller] ❌ Insert failed for ${table}:`, err);
            return res.status(500).json({ error: 'Insert failed', details: err });
        }
        console.log(`[Controller] ✅ Inserted into ${table}:`, payload);
        res.status(200).json({ success: true, insertedId: result.insertId });
    });
};