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

// ✅ GET: Warehouses — From dispatch_warehouse
exports.getWarehouses = (req, res) => {
    db.query(`SELECT warehouse_name FROM dispatch_warehouse ORDER BY warehouse_name ASC`, (err, results) => {
        if (err) {
            console.error('[Dispatch] ❌ Failed to fetch warehouses:', err.message);
            return res.status(500).json({ error: 'Failed to fetch warehouses' });
        }

        const data = results.map(row => row.warehouse_name);
        console.log('[Dispatch] ✅ Warehouses:', data);
        res.json(data);
    });
};

// ✅ GET: Logistics Partners — From logistics
exports.getLogistics = (req, res) => {
    db.query(`SELECT logistics_name FROM logistics ORDER BY logistics_name ASC`, (err, results) => {
        if (err) {
            console.error('[Dispatch] ❌ Failed to fetch logistics:', err.message);
            return res.status(500).json({ error: 'Failed to fetch logistics' });
        }

        const data = results.map(row => row.logistics_name);
        console.log('[Dispatch] ✅ Logistics:', data);
        res.json(data);
    });
};

// ✅ GET: Processed By — From processed_persons
exports.getProcessedPersons = (req, res) => {
    db.query(`SELECT name FROM processed_persons ORDER BY name ASC`, (err, results) => {
        if (err) {
            console.error('[Dispatch] ❌ Failed to fetch processed persons:', err.message);
            return res.status(500).json({ error: 'Failed to fetch processed persons' });
        }

        const data = results.map(row => row.name);
        console.log('[Dispatch] ✅ Processed Persons:', data);
        res.json(data);
    });
};

// ✅ GET: Payment Modes — From payment_mode
exports.getPaymentModes = (req, res) => {
    db.query(`SELECT mode_name FROM payment_mode ORDER BY mode_name ASC`, (err, results) => {
        if (err) {
            console.error('[Dispatch] ❌ Failed to fetch payment modes:', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment modes' });
        }

        const data = results.map(row => row.mode_name);
        console.log('[Dispatch] ✅ Payment Modes:', data);
        res.json(data);
    });
};

// ✅ GET: Product Search — From dispatch_product
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
            if (err) {
                console.error('[Dispatch] ❌ Product search failed:', err.message);
                return res.status(500).json({ error: 'Search failed' });
            }
            res.json(results);
        }
    );
};

// 🚀 POST: Push Dispatch Entry to DB
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
        console.log('[Dispatch] ✅ Target table resolved:', tableName);

        // 🔐 AWB Uniqueness Check
        const awbExists = await checkAwbExists(awbNumber?.trim());
        if (awbExists) {
            console.warn('[Dispatch] ❌ AWB already exists globally:', awbNumber);
            return res.status(400).json({ error: 'AWB already exists. Please use a unique AWB.' });
        }

        // 🚀 Insert Products
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
                        payment_mode, invoice_amount, processed_by, remarks, created_at
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
                        if (err) {
                            console.error(`[Dispatch] ❌ DB insert failed for product #${i + 1}:`, err.message);
                            return reject(err);
                        }
                        console.log(`[Dispatch] ✅ Inserted product #${i + 1}: ${name}`);
                        resolve(result);
                    }
                );
            });
        });

        await Promise.all(insertPromises);
        console.log('[Dispatch] ✅ All inserts completed successfully');
        res.status(200).json({ success: true, message: 'Dispatch entry submitted successfully' });

    } catch (err) {
        console.error('[Dispatch] ❌ Dispatch insert failed:', err.message);
        res.status(500).json({ error: 'Dispatch insert failed' });
    }
};

// 🔁 POST: Update Dispatch Status
exports.updateStatus = async (req, res) => {
    const { awb, warehouse } = req.body;
    if (!awb || !warehouse) return res.status(400).json({ error: 'Missing AWB or warehouse' });

    const tableName = warehouse.replace(/\s+/g, '_');
    try {
        const sql = `UPDATE \`${tableName}\` SET status = 'Dispatched' WHERE awb = ?`;
        db.query(sql, [awb], (err) => {
            if (err) {
                console.error('[Dispatch] ❌ Failed to update status:', err.message);
                return res.status(500).json({ error: 'Failed to update status' });
            }
            console.log(`[Dispatch] ✅ AWB ${awb} marked as Dispatched`);
            res.status(200).json({ success: true, message: 'Status updated successfully' });
        });
    } catch (err) {
        console.error('[Dispatch] ❌ Status update failed:', err.message);
        res.status(500).json({ error: 'Unexpected error while updating status' });
    }
};
