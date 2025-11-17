const db = require('../db/connection'); // ✅ MySQL connection

/**
 * 🧾 Insert Damage or Recovery Entry
 */
exports.insertDamageEntry = async (req, res) => {
    const { productType, barcode, inventory, actionType, quantity = 1 } = req.body;

    // 🧼 Normalize inputs
    const normalizedProduct = productType?.trim().replace(/\u200B/g, '');
    const normalizedBarcode = barcode?.trim().replace(/\u200B/g, '');
    const normalizedInventory = inventory?.trim().toLowerCase();
    const normalizedAction = actionType?.trim().toLowerCase();
    const normalizedQty = Number(quantity) || 1;

    // 🔐 Validate required fields
    const missingFields = [];
    if (!normalizedProduct) missingFields.push('productType');
    if (!normalizedBarcode) missingFields.push('barcode');
    if (!normalizedInventory) missingFields.push('inventory');
    if (!normalizedAction) missingFields.push('actionType');

    if (missingFields.length > 0) {
        console.warn('[DamageController] ⚠️ Missing required fields:', {
            missing: missingFields,
            payload: req.body
        });
        return res.status(400).json({
            success: false,
            error: 'All fields are required',
            missing: missingFields
        });
    }

    // 🧭 Validate inventory location
    const allowedInventories = ['gurgaon', 'hyderabad', 'mumbai', 'ahmedabad', 'bangalore'];
    if (!allowedInventories.includes(normalizedInventory)) {
        console.warn('[DamageController] ❌ Invalid inventory:', normalizedInventory);
        return res.status(400).json({
            success: false,
            error: `Invalid inventory location: ${normalizedInventory}`
        });
    }

    const inventoryTable = `${normalizedInventory}_inventory`;

    try {
        // ✅ Step 1: Insert into damage_recovery_log
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

        console.log('[DamageController] ✅ Log inserted:', {
            entryId: insertResult.insertId,
            productType: normalizedProduct,
            barcode: normalizedBarcode,
            inventory: normalizedInventory,
            action: normalizedAction,
            quantity: normalizedQty
        });

        // ✅ Step 2: Normalize warehouse alias for inventory update
        const warehouseAlias = {
            gurgaon: 'Gurgaon',
            hyderabad: 'Hyderabad',
            mumbai: 'Mumbai',
            ahmedabad: 'Ahmedabad',
            bangalore: 'Bangalore'
        }[normalizedInventory] || normalizedInventory;

        // ✅ Step 3: Update stock count
        const updateSQL = `
            UPDATE ${inventoryTable}
            SET stock = stock ${normalizedAction === 'damage' ? '-' : '+'} ?
            WHERE code = ? AND TRIM(LOWER(warehouse)) = TRIM(LOWER(?))
        `;

        const [updateResult] = await db.promise().execute(updateSQL, [
            normalizedQty,
            normalizedBarcode,
            warehouseAlias
        ]);

        if (updateResult.affectedRows === 0) {
            console.warn('[DamageController] ⚠️ No inventory row matched:', {
                code: normalizedBarcode,
                warehouse: warehouseAlias,
                actionType: normalizedAction
            });
        } else {
            console.log('[DamageController] ✅ Stock updated successfully:', {
                table: inventoryTable,
                code: normalizedBarcode,
                warehouse: warehouseAlias,
                quantity: normalizedQty,
                action: normalizedAction
            });
        }

        // ✅ Step 4: Final Response
        return res.status(201).json({
            success: true,
            message: 'Damage/Recovery entry logged and stock updated successfully',
            entryId: insertResult.insertId,
            details: {
                productType: normalizedProduct,
                barcode: normalizedBarcode,
                inventory: normalizedInventory,
                actionType: normalizedAction,
                quantity: normalizedQty
            }
        });
    } catch (err) {
        console.error('[DamageController] ❌ Fatal DB Error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Internal database error',
            details: err.message
        });
    }
};
