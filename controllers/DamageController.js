const db = require('../db/connection'); // MySQL connection

/**
 * 🧾 Insert Damage or Recovery Entry
 */
exports.insertDamageEntry = async (req, res) => {
    const { productType, barcode, inventory, actionType, quantity = 1 } = req.body;

    // Normalize inputs
    const normalizedProduct = productType?.trim();
    const normalizedBarcode = barcode?.trim();
    const normalizedInventory = inventory?.trim().toLowerCase();
    const normalizedAction = actionType?.trim().toLowerCase();
    const normalizedQty = Number(quantity) || 1;

    // Validate required fields
    const missing = [];
    if (!normalizedProduct) missing.push('productType');
    if (!normalizedBarcode) missing.push('barcode');
    if (!normalizedInventory) missing.push('inventory');
    if (!normalizedAction) missing.push('actionType');

    if (missing.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            missing
        });
    }

    // Validate inventory
    const allowed = ['gurgaon', 'hyderabad', 'mumbai', 'ahmedabad', 'bangalore'];
    if (!allowed.includes(normalizedInventory)) {
        return res.status(400).json({
            success: false,
            error: `Invalid inventory: ${normalizedInventory}`
        });
    }

    const inventoryTable = `${normalizedInventory}_inventory`;
    const warehouseAlias = normalizedInventory;  // ✔ MATCHES YOUR DB EXACTLY

    try {
        // STEP 1 — Insert log
        const insertSQL = `
            INSERT INTO damage_recovery_log 
                (product_type, barcode, inventory_location, action_type, quantity, timestamp)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        const [insertResult] = await db.promise().execute(insertSQL, [
            normalizedProduct,
            normalizedBarcode,
            normalizedInventory,
            normalizedAction,
            normalizedQty
        ]);

        console.log('[DamageController] ✅ Log inserted');

        // STEP 2 — Update stock
        const updateSQL = `
            UPDATE ${inventoryTable}
            SET stock = stock ${normalizedAction === 'damage' ? '-' : '+'} ?
            WHERE code = ? AND warehouse = ?
        `;

        const [updateResult] = await db.promise().execute(updateSQL, [
            normalizedQty,
            normalizedBarcode,
            warehouseAlias
        ]);

        if (updateResult.affectedRows === 0) {
            console.warn('[DamageController] ⚠️ No matching inventory row found:', {
                code: normalizedBarcode,
                warehouse: warehouseAlias
            });
        } else {
            console.log('[DamageController] ✅ Stock updated successfully:', {
                table: inventoryTable,
                code: normalizedBarcode,
                quantity: normalizedQty,
                action: normalizedAction
            });
        }

        // STEP 3 — Final Response
        return res.status(201).json({
            success: true,
            message: 'Damage/Recovery entry logged & stock updated',
            entryId: insertResult.insertId
        });

    } catch (err) {
        console.error('[DamageController] ❌ DB Error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Database error',
            details: err.message
        });
    }
};
