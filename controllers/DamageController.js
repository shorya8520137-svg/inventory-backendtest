const db = require('../db/connection');

exports.insertDamageEntry = (req, res) => {
    const { productType, barcode, inventory, actionType, quantity = 1 } = req.body;

    // 🧼 Normalize inputs
    const normalizedProduct = productType?.trim().replace(/\u200B/g, '');
    const normalizedBarcode = barcode?.trim().replace(/\u200B/g, '');
    const normalizedInventory = inventory?.trim().toLowerCase();
    const normalizedAction = actionType?.trim().toLowerCase();

    // 🔐 Validate fields
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
        return res.status(400).json({ error: 'All fields are required', missing: missingFields });
    }

    // 🔐 Validate inventory table name
    const allowedInventories = ['gurgaon', 'hyderabad', 'mumbai', 'ahmedabad', 'bangalore'];
    if (!allowedInventories.includes(normalizedInventory)) {
        console.warn('[DamageController] ❌ Invalid inventory location:', normalizedInventory);
        return res.status(400).json({ error: 'Invalid inventory location' });
    }

    const inventoryTable = `${normalizedInventory}_inventory`;

    // 🧠 Insert into damage_recovery_log
    const sql = `
    INSERT INTO damage_recovery_log (
      product_type, barcode, inventory_location, action_type, quantity
    ) VALUES (?, ?, ?, ?, ?)
  `;

    db.execute(
        sql,
        [
            normalizedProduct,
            normalizedBarcode,
            normalizedInventory,
            normalizedAction,
            quantity
        ],
        (err, result) => {
            if (err) {
                console.error('[DamageController] ❌ DB insert failed:', {
                    error: err.message,
                    payload: {
                        productType: normalizedProduct,
                        barcode: normalizedBarcode,
                        inventory: normalizedInventory,
                        actionType: normalizedAction,
                        quantity
                    }
                });
                return res.status(500).json({ error: 'Database error' });
            }

            console.log('[DamageController] ✅ Entry created:', {
                id: result.insertId,
                productType: normalizedProduct,
                barcode: normalizedBarcode,
                inventory: normalizedInventory,
                actionType: normalizedAction,
                quantity
            });

            // 🧠 Patch warehouse alias for legacy rows
            const warehouseAlias =
                normalizedInventory === 'gurgaon' ? 'Gurgon' : normalizedInventory;

            // 🔁 Stock update logic
            const stockSql = `
        UPDATE ${inventoryTable}
        SET stock = stock ${normalizedAction === 'damage' ? '-' : '+'} ?
        WHERE code = ? AND warehouse = ?
      `;

            db.execute(
                stockSql,
                [quantity, normalizedBarcode, warehouseAlias],
                (err2, result2) => {
                    if (err2) {
                        console.error('[DamageController] ⚠️ Stock update failed:', {
                            error: err2.message,
                            table: inventoryTable,
                            context: {
                                code: normalizedBarcode,
                                warehouse: warehouseAlias,
                                actionType: normalizedAction,
                                quantity
                            }
                        });
                        return;
                    }

                    if (result2?.affectedRows === 0) {
                        console.warn('[DamageController] ⚠️ No matching inventory row found:', {
                            code: normalizedBarcode,
                            warehouse: warehouseAlias
                        });
                    } else {
                        console.log('[DamageController] ✅ Stock updated:', {
                            table: inventoryTable,
                            code: normalizedBarcode,
                            warehouse: warehouseAlias,
                            quantity,
                            action: normalizedAction
                        });
                    }
                }
            );

            // 🎯 Final response
            res.status(201).json({
                message: 'Damage/Recovery entry logged successfully',
                entryId: result.insertId
            });
        }
    );
};