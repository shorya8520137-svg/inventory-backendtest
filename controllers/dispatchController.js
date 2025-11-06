const db = require('../db/connection');

// 🔍 AWB Uniqueness Check Across All Warehouses
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
    res.json([
        'Mumbai Warehouse',
        'Hyderabad Warehouse',
        'Ahmedabad Warehouse',
        'Bangalore Warehouse',
        'Gurgaon Warehouse'
    ]);
};

// ✅ GET: Logistics Partners
exports.getLogistics = (req, res) => {
    res.json(['Delhivery', 'Blue Dart', 'XpressBees', 'Ecom Express']);
};

// ✅ GET: Processed By
exports.getProcessedPersons = (req, res) => {
    db.query(`SELECT name FROM processed_persons`, (err, results) => {
        if (err) {
            console.error('[Dispatch] ❌ Failed to fetch processed persons:', err.message);
            return res.status(500).json({ error: 'Failed to fetch processed persons' });
        }
        const names = results.map(row => row.name);
        res.json(names);
    });
};

// ✅ GET: Product Search
exports.searchProducts = (req, res) => {
    const query = (req.query.query || '').trim().toLowerCase();
    if (!query) {
        console.warn('[Dispatch] ⚠️ Empty query received');
        return res.json([]);
    }

    const regexPattern = `.*${query.replace(/\s+/g, '[ -_]?')}.*`;

    db.query(
        `SELECT p_id, product_name, product_variant, barcode 
     FROM dispatch_product 
     WHERE LOWER(product_name) REGEXP ? OR LOWER(barcode) REGEXP ?`,
        [regexPattern, regexPattern],
        (err, results) => {
            if (err) {
                console.error('[Dispatch] ❌ Product search failed:', err.message);
                return res.status(500).json({ error: 'Search failed' });
            }
            console.log('[Dispatch] ✅ Suggestions returned:', results.length);
            res.json(results);
        }
    );
};

// ✅ GET: Payment Modes
exports.getPaymentModes = (req, res) => {
    res.json(['Bank Transfer', 'Cash on Delivery', 'UPI', 'Card']);
};

// 🚀 POST: Push Dispatch to DB
exports.pushToDb = async (req, res) => {
    console.log('[Tracker] pushToDb triggered');

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

        console.log('[Tracker] Payload received:', {
            selectedWarehouse,
            orderRef,
            customerName,
            productsCount: Array.isArray(products) ? products.length : 0
        });

        if (!Array.isArray(products) || products.length === 0) {
            console.warn('[Tracker] ❌ No products to insert');
            return res.status(400).json({ error: 'No products provided' });
        }

        const warehouseMap = {
            'Mumbai Warehouse': 'Mumbai_Warehouse',
            'Hyderabad Warehouse': 'Hyderabad_Warehouse',
            'Ahmedabad Warehouse': 'Ahmedabad_Warehouse',
            'Bangalore Warehouse': 'Bangalore_Warehouse',
            'Gurgaon Warehouse': 'Gurgaon_Warehouse'
        };

        const tableName = warehouseMap[selectedWarehouse?.trim()];
        if (!tableName) {
            console.warn('[Tracker] ❌ Invalid warehouse:', selectedWarehouse);
            return res.status(400).json({ error: 'Invalid warehouse selected' });
        }

        console.log('[Tracker] ✅ Target table resolved:', tableName);

        // 🔐 AWB Uniqueness Check
        const awbExists = await checkAwbExists(awbNumber?.trim());
        if (awbExists) {
            console.warn('[Tracker] ❌ AWB already exists globally:', awbNumber);
            return res.status(400).json({ error: 'AWB already exists. Please provide a valid unique AWB.' });
        }

        const insertPromises = products.map((p, i) => {
            let { name, qty, variant = '', barcode = '' } = p;

            if (!name || !qty) {
                console.warn(`[Tracker] ⚠️ Skipping product #${i + 1} — missing name/qty`);
                return Promise.resolve();
            }

            if (!barcode && name.includes('|')) {
                const parts = name.split('|').map(s => s.trim());
                barcode = parts[parts.length - 1];
                name = parts[0];
                console.log(`[Tracker] 🛠️ Extracted barcode from product_name:`, barcode);
            }

            console.log(`[Tracker] 🚀 Preparing insert for product #${i + 1}:`, name);

            return new Promise((resolve, reject) => {
                db.query(
                    `INSERT INTO \`${tableName}\` (
            status, warehouse, order_ref, customer,
            product_name, qty, variant, barcode,
            awb, logistics, parcel_type,
            length, width, height, actual_weight,
            payment_mode, invoice_amount, processed_by, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                            console.error(`[Tracker] ❌ DB insert failed for product #${i + 1}:`, err.message);
                            return reject(err);
                        }
                        console.log(`[Tracker] ✅ Inserted product #${i + 1}:`, name);
                        resolve(result);

                        if (tableName === 'Gurgaon_Warehouse') {
                            db.query(
                                `UPDATE gurgaon_inventory SET stock = stock - ? WHERE code = ? AND warehouse = 'Gurgon'`,
                                [qty, barcode],
                                (err2, result2) => {
                                    if (err2) {
                                        console.error(`[Tracker] ❌ Stock mutation failed for ${barcode}:`, err2.message);
                                    } else {
                                        console.log(`[Tracker] ✅ Stock reduced for ${barcode}: -${qty}`);
                                    }
                                }
                            );
                        }
                    }
                );
            });
        });

        await Promise.all(insertPromises);
        console.log('[Tracker] ✅ All inserts completed successfully');
        res.status(200).json({ success: true, message: 'Dispatch entry submitted successfully' });

    } catch (err) {
        console.error('[Tracker] ❌ Dispatch insert failed:', err.message);
        res.status(500).json({ error: 'Dispatch insert failed' });
    }
};