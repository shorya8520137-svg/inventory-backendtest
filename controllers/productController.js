const db = require('../db/connection'); // ✅ MySQL connection

/**
 * 🔍 Product search
 */
const searchProducts = (req, res) => {
    const { query } = req.query;

    if (!query || query.trim() === '') {
        console.warn('[ProductController] ⚠️ Empty query received');
        return res.json([]);
    }

    const cleanQuery = query.trim().toLowerCase();
    const sql = `
        SELECT DISTINCT p_id, product_name, product_variant, barcode
        FROM dispatch_product
        WHERE LOWER(product_name) LIKE ?
        LIMIT 10
    `;
    const values = [`%${cleanQuery}%`];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error('[ProductController] ❌ Suggestion fetch failed:', err.message);
            return res.status(500).json({ error: err.message });
        }

        const suggestions = results.map(row => ({
            p_id: row.p_id,
            product_name: row.product_name,
            product_variant: row.product_variant,
            barcode: row.barcode
        }));

        console.log('[ProductController] ✅ Suggestions returned:', suggestions.length);
        res.json(suggestions);
    });
};

/**
 * 📦 Filter inventory
 */
const filterInventory = (req, res) => {
    const { table, date, product } = req.query;

    if (!table || !date) {
        console.warn('[ProductController] ❌ Missing table or date');
        return res.status(400).json({ error: 'Missing table or date' });
    }

    const allowedTables = [
        'gurgaon_inventory',
        'hyderabad_inventory',
        'mumbai_inventory',
        'ahmedabad_inventory',
        'bangalore_inventory'
    ];

    if (!allowedTables.includes(table)) {
        console.warn('[ProductController] ❌ Invalid table name:', table);
        return res.status(400).json({ error: 'Invalid inventory table' });
    }

    let sql = `
        SELECT product, variant, stock, warehouse, created_at, \`return\`, code
        FROM ${table}
        WHERE DATE(created_at) = ?
    `;
    const params = [date];

    if (product && product.trim() !== '') {
        sql += ` AND LOWER(product) LIKE ? AND code LIKE ?`;
        params.push(`%${product.toLowerCase()}%`, `%${product}%`);
    }

    console.log('[ProductController] 🔍 SQL:', sql);
    console.log('[ProductController] 🔍 Params:', params);

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('[ProductController] ❌ Query failed:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`[ProductController] ✅ ${results.length} records fetched from ${table}`);
        res.status(200).json(results);
    });
};

/**
 * 📂 Load full inventory without filters
 */
const getAllInventory = (req, res) => {
    const { table } = req.query;

    const allowedTables = [
        'gurgaon_inventory',
        'hyderabad_inventory',
        'mumbai_inventory',
        'ahmedabad_inventory',
        'bangalore_inventory'
    ];

    if (!table || !allowedTables.includes(table)) {
        console.warn('[ProductController] ❌ Invalid or missing table:', table);
        return res.status(400).json({ error: 'Invalid inventory table' });
    }

    const sql = `
        SELECT product, variant, stock, warehouse, created_at, \`return\`, code
        FROM ${table}
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('[ProductController] ❌ Full inventory fetch failed:', err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log(`[ProductController] ✅ ${results.length} records loaded from ${table}`);
        res.status(200).json(results);
    });
};

/**
 * 🧩 Track product movement
 */
const trackProduct = (req, res) => {
    const { barcode, warehouse } = req.query;

    if (!barcode || !warehouse) {
        return res.status(400).json({ error: 'Missing barcode or warehouse' });
    }

    const warehouseKey = warehouse.toLowerCase().replace(/\s+/g, '');

    const warehouseTables = {
        ahmedabad: 'Ahmedabad_Warehouse',
        bangalore: 'Bangalore_Warehouse',
        gurgaon: 'Gurgaon_Warehouse',
        hyderabad: 'Hyderabad_Warehouse',
        mumbai: 'Mumbai_Warehouse'
    };

    const inventoryTables = {
        ahmedabad: 'ahmedabad_inventory',
        bangalore: 'bangalore_inventory',
        gurgaon: 'gurgaon_inventory',
        hyderabad: 'hyderabad_inventory',
        mumbai: 'mumbai_inventory'
    };

    const dispatchTable = warehouseTables[warehouseKey];
    const inventoryTable = inventoryTables[warehouseKey];
    const damageTable = 'damage_recovery_log';

    if (!dispatchTable || !inventoryTable) {
        return res.status(400).json({ error: 'Invalid warehouse name' });
    }

    db.query(
        `SELECT code AS barcode, stock, \`return\` AS returnQty, updated_at, warehouse
         FROM ${inventoryTable}
         WHERE code = ? AND TRIM(LOWER(warehouse)) = TRIM(LOWER(?))`,
        [barcode, warehouse],
        (err, inventoryRows) => {
            if (err) {
                console.error('[trackProduct] ❌ Inventory fetch failed:', err.message);
                return res.status(500).json({ error: err.message });
            }

            if (inventoryRows.length === 0) {
                return res.status(404).json({ error: 'Barcode not found in inventory for this warehouse' });
            }

            db.query(
                `SELECT awb, barcode, product_name, qty, processed_by, created_at, warehouse
                 FROM ${dispatchTable}
                 WHERE barcode = ? AND TRIM(LOWER(warehouse)) = TRIM(LOWER(?))
                 ORDER BY created_at DESC`,
                [barcode, warehouse],
                (err, dispatchRows) => {
                    if (err) {
                        console.error('[trackProduct] ❌ Dispatch fetch failed:', err.message);
                        return res.status(500).json({ error: err.message });
                    }

                    db.query(
                        `SELECT action_type, quantity, timestamp
                         FROM ${damageTable}
                         WHERE barcode = ? AND TRIM(LOWER(inventory_location)) = TRIM(LOWER(?))
                         ORDER BY timestamp DESC`,
                        [barcode, warehouseKey],
                        (err, damageRows) => {
                            if (err) {
                                console.error('[trackProduct] ❌ Damage fetch failed:', err.message);
                                return res.status(500).json({ error: err.message });
                            }

                            const totalDispatch = dispatchRows.reduce((sum, r) => sum + (r.qty || 0), 0);
                            const totalStock = inventoryRows[0]?.stock || 0;
                            const totalReturn = inventoryRows[0]?.returnQty || 0;

                            let totalDamage = 0, totalRecover = 0;
                            damageRows.forEach(row => {
                                if (row.action_type?.toLowerCase() === 'damage') totalDamage += row.quantity || 0;
                                if (row.action_type?.toLowerCase() === 'recover') totalRecover += row.quantity || 0;
                            });

                            const finalStock = totalStock - totalDispatch + totalReturn - totalDamage + totalRecover;

                            const dispatchByAWB = dispatchRows.reduce((acc, row) => {
                                const awbKey = row.awb || 'No AWB';
                                if (!acc[awbKey]) acc[awbKey] = [];
                                acc[awbKey].push(row);
                                return acc;
                            }, {});

                            res.json({
                                barcode,
                                warehouse,
                                totals: {
                                    stock: totalStock,
                                    dispatch: totalDispatch,
                                    return: totalReturn,
                                    damage: totalDamage,
                                    recover: totalRecover,
                                    finalStock
                                },
                                details: {
                                    dispatch: dispatchByAWB,
                                    damageRecovery: damageRows,
                                    inventory: inventoryRows
                                }
                            });
                        }
                    );
                }
            );
        }
    );
};

// ✅ Export all handlers
module.exports = {
    searchProducts,
    filterInventory,
    trackProduct,
    getAllInventory // ✅ Injected
};