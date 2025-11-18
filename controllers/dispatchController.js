const db = require('../db/connection');

// 🔍 Check AWB Exists Across All Warehouses
const checkAwbExists = async (awb) => {
    if (!awb || typeof awb !== 'string' || awb.trim() === '') return false;

    const tables = [
        'Mumbai_Warehouse',
        'Hyderabad_Warehouse',
        'Ahmedabad_Warehouse',
        'Bangalore_Warehouse',
        'Gurgaon_Warehouse'
    ];

    const unionQuery = tables.map(() => `SELECT awb FROM ?? WHERE awb = ?`).join(' UNION ALL ');
    const queryParams = tables.flatMap(t => [t, awb.trim()]);

    return new Promise((resolve, reject) => {
        db.query(unionQuery, queryParams, (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0);
        });
    });
};

// ✅ GET: Warehouses
exports.getWarehouses = (req, res) => {
    db.query(`SELECT warehouse_name FROM dispatch_warehouse ORDER BY warehouse_name ASC`, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch warehouses' });

        const data = results.map(row => row.warehouse_name);
        res.json(data);
    });
};

// ✅ GET Logistics
exports.getLogistics = (req, res) => {
    db.query(`SELECT name FROM logistics ORDER BY name ASC`, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch logistics' });

        const data = results.map(row => row.name);
        res.json(data);
    });
};

// ✅ GET: Processed Persons
exports.getProcessedPersons = (req, res) => {
    db.query(`SELECT name FROM processed_persons ORDER BY name ASC`, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch processed persons' });

        const data = results.map(row => row.name);
        res.json(data);
    });
};

// ✅ GET: Payment Modes
exports.getPaymentModes = (req, res) => {
    db.query(`SELECT mode_name FROM payment_mode ORDER BY mode_name ASC`, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch payment modes' });

        const data = results.map(row => row.mode_name);
        res.json(data);
    });
};

// ✅ SEARCH Products
exports.searchProducts = (req, res) => {
    const query = (req.query.query || '').trim().toLowerCase();
    if (!query) return res.json([]);

    const regexPattern = `.*${query.replace(/\s+/g, '[ -_]?')}.*`;

    db.query(
        `SELECT p_id, product_name, product_variant, barcode
         FROM dispatch_product
         WHERE LOWER(product_name) REGEXP ? OR LOWER(barcode) REGEXP ?
         LIMIT 25`,
        [regexPattern, regexPattern],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Search failed' });
            res.json(results);
        }
    );
};

// 🚀 INSERT + AUTO-LESS: Push Dispatch Entry
exports.pushToDb = async (req, res) => {
    console.log('[Dispatch] pushToDb triggered');

    try {
        const {
            selectedWarehouse,
            selectedLogistics,
            selectedExecutive,
            selectedPaymentMode,
            orderRef,
            customerName,
            awbNumber,
            dimensions = {},
            weight = '',
            invoiceAmount = '',
            remarks = '',
            products
        } = req.body;

        if (!selectedWarehouse || !awbNumber)
            return res.status(400).json({ error: 'Missing required warehouse or AWB number' });

        if (!Array.isArray(products) || products.length === 0)
            return res.status(400).json({ error: 'No products provided' });

        const tableName = selectedWarehouse.replace(/\s+/g, '_');

        // 🔐 AWB Check
        const awbExists = await checkAwbExists(awbNumber?.trim());
        if (awbExists) {
            return res.status(400).json({ error: 'AWB already exists. Please use a unique AWB.' });
        }

        // 🗂️ Inventory table map
        const inventoryMap = {
            "Gurgaon Warehouse": "gurgaon_inventory",
            "Hyderabad Warehouse": "hyderabad_inventory",
            "Mumbai Warehouse": "mumbai_inventory",
            "Ahmedabad Warehouse": "ahmedabad_inventory",
            "Bangalore Warehouse": "bangalore_inventory"
        };
        const inventoryTable = inventoryMap[selectedWarehouse];

        // 🚀 INSERT EACH PRODUCT + AUTO-LESS
        const insertPromises = products.map((p, i) => {
            let { name, qty, variant = '', barcode = '' } = p;
            if (!name || !qty) return Promise.resolve();

            if (!barcode && name.includes('|')) {
                const parts = name.split('|').map(s => s.trim());
                barcode = parts[parts.length - 1];
                name = parts[0];
            }

            return new Promise((resolve, reject) => {
                db.query(
                    `INSERT INTO \`${tableName}\` (
                        status, warehouse, order_ref, customer,
                        product_name, qty, variant, barcode,
                        awb, logistics, parcel_type,
                        length, width, height, actual_weight,
                        payment_mode, invoice_amount, processed_by, remarks, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        'Pending',
                        selectedWarehouse,
                        orderRef,
                        customerName,
                        name,
                        qty,
                        variant,
                        barcode,
                        awbNumber?.trim(),
                        selectedLogistics,
                        'Forward',
                        dimensions.length || '',
                        dimensions.width || '',
                        dimensions.height || '',
                        weight,
                        selectedPaymentMode,
                        invoiceAmount,
                        selectedExecutive,
                        remarks
                    ],
                    (err, result) => {
                        if (err) return reject(err);

                        console.log(`[Dispatch] ✅ Inserted product #${i + 1}: ${name}`);

                        // 🔥 AUTO-LESS INVENTORY
                        if (inventoryTable && barcode) {
                            db.query(
                                `UPDATE \`${inventoryTable}\`
                                 SET stock = stock - ?
                                 WHERE code = ?`,
                                [qty, barcode],
                                (invErr) => {
                                    if (invErr) {
                                        console.error(`[Inventory] ❌ Failed to reduce stock for ${barcode}:`, invErr.message);
                                    } else {
                                        console.log(`[Inventory] ✅ Stock reduced for ${barcode} by ${qty}`);
                                    }
                                }
                            );
                        }

                        resolve(result);
                    }
                );
            });
        });

        await Promise.all(insertPromises);
        console.log('[Dispatch] ✅ All inserts + inventory auto-less completed');
        res.status(200).json({ success: true, message: 'Dispatch entry submitted successfully' });

    } catch (err) {
        console.error('[Dispatch] ❌ Dispatch insert failed:', err.message);
        res.status(500).json({ error: 'Dispatch insert failed' });
    }
};

// 🔁 UPDATE STATUS
exports.updateStatus = async (req, res) => {
    const { awb, warehouse } = req.body;
    if (!awb || !warehouse) return res.status(400).json({ error: 'Missing AWB or warehouse' });

    const tableName = warehouse.replace(/\s+/g, '_');

    try {
        const sql = `UPDATE \`${tableName}\` SET status = 'Dispatched' WHERE awb = ?`;
        db.query(sql, [awb], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update status' });

            res.status(200).json({ success: true, message: 'Status updated successfully' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Unexpected error while updating status' });
    }
};
