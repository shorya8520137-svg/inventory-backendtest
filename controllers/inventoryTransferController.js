const db = require('../db/connection'); // MySQL connection

/**
 * 📦 Transfer Excel Data → Receiver Inventory
 * Host uploads Excel → front-end sends parsed rows → this updates the warehouse inventory
 */
exports.transferInventory = async (req, res) => {
    const { warehouse, rows } = req.body;

    // Validate warehouse
    const allowed = ['gurgaon', 'hyderabad', 'mumbai', 'ahmedabad', 'bangalore'];
    const normalizedWarehouse = warehouse?.trim()?.toLowerCase();

    if (!normalizedWarehouse || !allowed.includes(normalizedWarehouse)) {
        return res.status(400).json({
            success: false,
            error: `Invalid warehouse: ${warehouse}`
        });
    }

    // Validate rows
    if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'No rows provided for transfer'
        });
    }

    const inventoryTable = `${normalizedWarehouse}_inventory`;
    const warehouseAlias = normalizedWarehouse;

    let inserted = 0;
    let updated = 0;

    try {
        // Loop rows sequentially
        for (const row of rows) {
            const product = row.product?.trim();
            const variant = row.variant?.trim() || '';
            const barcode = row.code?.trim();
            const qty = Number(row.qty) || 0;

            if (!barcode) {
                console.warn('[TransferController] ⚠️ Skipped row due to missing barcode');
                continue;
            }

            // STEP 1 — check if product exists
            const checkSQL = `
                SELECT id, stock
                FROM ${inventoryTable}
                WHERE code = ? AND warehouse = ?
                LIMIT 1
            `;
            const [check] = await db.promise().execute(checkSQL, [
                barcode,
                warehouseAlias
            ]);

            if (check.length > 0) {
                // STEP 2A — update stock
                const updateSQL = `
                    UPDATE ${inventoryTable}
                    SET stock = stock + ?
                    WHERE id = ?
                `;

                await db.promise().execute(updateSQL, [qty, check[0].id]);

                updated++;
                console.log('[TransferController] 🔄 Stock updated:', {
                    code: barcode,
                    qtyAdded: qty,
                    warehouse: warehouseAlias
                });

            } else {
                // STEP 2B — insert new
                const insertSQL = `
                    INSERT INTO ${inventoryTable}
                        (product, variant, code, stock, warehouse, opening, created_at)
                    VALUES (?, ?, ?, ?, ?, 0, NOW())
                `;

                await db.promise().execute(insertSQL, [
                    product,
                    variant,
                    barcode,
                    qty,
                    warehouseAlias
                ]);

                inserted++;
                console.log('[TransferController] ➕ New product inserted:', {
                    code: barcode,
                    qty,
                    warehouse: warehouseAlias
                });
            }
        }

        // Final Response
        return res.status(200).json({
            success: true,
            message: 'Inventory transfer completed',
            warehouse: warehouseAlias,
            summary: {
                inserted,
                updated,
                totalRows: rows.length
            }
        });

    } catch (err) {
        console.error('[TransferController] ❌ DB Error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Database error',
            details: err.message
        });
    }
};
