const db = require('../db/connection');

exports.getProductTracking = (req, res) => {
    const { barcode } = req.params;
    const warehouseParam = req.query.warehouse;

    const dispatchTables = [
        'Ahmedabad_Warehouse',
        'Bangalore_Warehouse',
        'Gurgaon_Warehouse',
        'Hyderabad_Warehouse',
        'Mumbai_Warehouse'
    ];

    const inventoryTables = [
        'ahmedabad_inventory',
        'bangalore_inventory',
        'gurgaon_inventory',
        'hyderabad_inventory',
        'mumbai_inventory'
    ];

    // ✅ Safety lock: enforce valid warehouseParam
    if (!warehouseParam || !inventoryTables.includes(warehouseParam)) {
        console.warn('[Tracker] ❌ Invalid or missing warehouseParam:', warehouseParam);
        return res.status(400).json({ error: 'Invalid warehouse parameter' });
    }

    const logs = [];
    let pending = dispatchTables.length + 1 + 1; // dispatch + inventory + damage
    let responded = false;

    const handleResult = (err, result) => {
        if (responded) return;

        if (err) {
            responded = true;
            console.error('[Tracker] ❌ Query failed:', err);
            return res.status(500).json({ error: 'Query failed', details: err });
        }

        logs.push(...result);
        pending--;

        if (pending === 0 && !responded) {
            responded = true;

            const warehouseMap = {
                'Gurgon': 'Gurgaon',
                'gurgaon': 'Gurgaon',
                'Gurgaon Warehouse': 'Gurgaon',
                'Mumbai Warehouse': 'Mumbai',
                'Ahmedabad Warehouse': 'Ahmedabad',
                'Bangalore Warehouse': 'Bangalore',
                'Hyderabad Warehouse': 'Hyderabad',
                'hyderabad': 'Hyderabad',
                'mumbai': 'Mumbai',
                'bangalore': 'Bangalore',
                'ahmedabad': 'Ahmedabad'
            };

            logs.forEach(log => {
                if (log.warehouse && warehouseMap[log.warehouse]) {
                    log.warehouse = warehouseMap[log.warehouse];
                }
            });

            logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            res.status(200).json(logs);
        }
    };

    // ✅ Dispatch logs (global)
    dispatchTables.forEach(table => {
        const query = `
            SELECT 'dispatch' AS type, qty AS quantity, timestamp, warehouse, processed_by, awb
            FROM ${table}
            WHERE barcode = ?
        `;
        db.query(query, [barcode], handleResult);
    });

    // ✅ Inventory snapshot (scoped to warehouseParam with alias support)
    const warehouseKey = warehouseParam.split('_')[0];
    const warehouseName = warehouseKey.charAt(0).toUpperCase() + warehouseKey.slice(1);

    const warehouseAliases = {
        'Gurgaon': ['Gurgaon', 'Gurgon'],
        'Mumbai': ['Mumbai'],
        'Hyderabad': ['Hyderabad'],
        'Ahmedabad': ['Ahmedabad'],
        'Bangalore': ['Bangalore']
    };

    const acceptedLabels = warehouseAliases[warehouseName] || [warehouseName];
    const placeholders = acceptedLabels.map(() => '?').join(', ');

    const inventoryQuery = `
        SELECT 'inventory' AS type, stock AS quantity, \`return\`, created_at AS timestamp, warehouse, NULL AS processed_by, NULL AS awb
        FROM ${warehouseParam}
        WHERE code = ? AND TRIM(warehouse) IN (${placeholders})
    `;
    db.query(inventoryQuery, [barcode, ...acceptedLabels], handleResult);

    // ✅ Damage/Recovery logs (global)
    const damageQuery = `
        SELECT action_type AS type, quantity, timestamp, inventory_location AS warehouse, NULL AS processed_by, NULL AS awb
        FROM damage_recovery_log
        WHERE barcode = ?
    `;
    db.query(damageQuery, [barcode], handleResult);
};