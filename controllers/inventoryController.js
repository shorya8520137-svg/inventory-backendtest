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

    // 🔥 ALWAYS use dropdown warehouse value (Excel warehouse ignored if blank)
    const fixedWarehouse =
        (payload.warehouse && payload.warehouse.trim() !== "")
            ? payload.warehouse.trim()
            : table.replace("_inventory", ""); // example: "gurgaon_inventory" → "gurgaon"

    // CLEAN PAYLOAD
    const safePayload = {
        product: (payload.name || "").trim(),
        variant: (payload.variant || "").trim(),
        code: (payload.code || "").trim(),
        stock: Number(payload.stock) || 0,
        warehouse: fixedWarehouse,
        opening: Number(payload.opening) || 0,
        return: Number(payload.return) || 0,
        date: payload.date || new Date().toISOString().split("T")[0],
        time: payload.time || new Date().toTimeString().slice(0, 5),
    };

    // ============================================
    // 🔥 NEW LOGIC: UPSERT USING BARCODE (stock merge)
    // ============================================
    const checkQuery = `
        SELECT stock FROM ${table}
        WHERE code = ?
        LIMIT 1
    `;

    db.query(checkQuery, [safePayload.code], (err, result) => {
        if (err) {
            console.error("[InventoryController] ❌ Check failed:", err.message);
            return res.status(500).json({
                success: false,
                error: "Database error (checkQuery)",
                details: err.sqlMessage || err.message
            });
        }

        if (result.length > 0) {
            // 🟦 PRODUCT EXISTS → UPDATE STOCK
            const existingStock = Number(result[0].stock);
            const newStock = existingStock + safePayload.stock;

            const updateQuery = `
                UPDATE ${table}
                SET stock = ?, warehouse = ?, opening = opening, \`return\` = return
                WHERE code = ?
            `;

            db.query(updateQuery, [newStock, safePayload.warehouse, safePayload.code], (err2) => {
                if (err2) {
                    console.error("[InventoryController] ❌ Update failed:", err2.message);
                    return res.status(500).json({
                        success: false,
                        error: "Database update failed",
                        details: err2.sqlMessage || err2.message
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: `Updated (merged stock) in ${table}`,
                    updatedStock: newStock
                });
            });

        } else {
            // 🟩 PRODUCT NOT FOUND → INSERT NEW ROW
            const insertQuery = `
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

            db.query(insertQuery, values, (err3, result3) => {
                if (err3) {
                    console.error(`[InventoryController] ❌ Insert failed for ${table}:`, err3.message);
                    return res.status(500).json({
                        success: false,
                        error: 'Database insert failed',
                        details: err3.sqlMessage || err3.message
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: `Inserted new row in ${table}`,
                    insertedId: result3.insertId || null
                });
            });
        }
    });
};
