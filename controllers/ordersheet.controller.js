const db = require('../db/connection');

// ====================== LOGISTICS ======================
exports.getLogistics = (req, res) => {
    db.query('SELECT name FROM logistics', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch logistics' });
        res.json(results.map(r => r.name));
    });
};

// ====================== PAYMENT MODES ======================
exports.getPaymentModes = (req, res) => {
    db.query('SELECT mode_name FROM payment_mode', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch payment modes' });
        res.json(results.map(r => r.mode_name));
    });
};

// ====================== PROCESSED PERSONS ======================
exports.getProcessedPersons = (req, res) => {
    db.query('SELECT name FROM processed_persons', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch processed persons' });
        res.json(results.map(r => r.name));
    });
};

// ====================== FILTER ORDERS ======================
exports.filterOrders = (req, res) => {
    const {
        warehouse = [],
        orderRef = '',
        productName = '',
        variant = '',
        barcodeAwb = '',
        logistics = [],
        parcelType = '',
        paymentMode = '',
        processedBy = '',
    } = req.body;

    const validTables = [
        'Ahmedabad_Warehouse',
        'Bangalore_Warehouse',
        'Gurgaon_Warehouse',
        'Hyderabad_Warehouse',
        'Mumbai_Warehouse',
    ];

    const selectedTables = Array.isArray(warehouse) && warehouse.length > 0
        ? warehouse.filter((w) => validTables.includes(w))
        : validTables;

    const escape = (str) => str.replace(/'/g, "\\'");
    const filters = [];

    if (orderRef.trim()) filters.push(`order_ref LIKE '%${escape(orderRef.trim())}%'`);
    if (productName.trim()) filters.push(`product_name LIKE '%${escape(productName.trim())}%'`);
    if (variant.trim()) filters.push(`variant LIKE '%${escape(variant.trim())}%'`);
    if (barcodeAwb.trim()) filters.push(`(barcode LIKE '%${escape(barcodeAwb.trim())}%' OR awb LIKE '%${escape(barcodeAwb.trim())}%')`);
    if (Array.isArray(logistics) && logistics.length > 0) filters.push(`logistics IN (${logistics.map((l) => `'${escape(l)}'`).join(',')})`);
    if (parcelType.trim()) filters.push(`parcel_type LIKE '%${escape(parcelType.trim())}%'`);
    if (typeof paymentMode === 'string' && paymentMode.trim()) filters.push(`payment_mode = '${escape(paymentMode.trim())}'`);
    if (typeof processedBy === 'string' && processedBy.trim()) filters.push(`processed_by = '${escape(processedBy.trim())}'`);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const queries = selectedTables.map((table) => `SELECT * FROM ${table} ${whereClause}`);
    const finalQuery = queries.join(' UNION ALL ');

    db.query(finalQuery, (err, results) => {
        if (err) {
            console.error('[filterOrders] SQL Error:', err);
            return res.status(500).json({ error: 'Failed to fetch filtered orders' });
        }
        res.json(results);
    });
};

// ====================== PRODUCT SEARCH (for live suggestions) ======================
exports.searchProducts = (req, res) => {
    const query = (req.query.query || '').trim();
    if (!query) return res.json([]);

    const validTables = [
        'Ahmedabad_Warehouse',
        'Bangalore_Warehouse',
        'Gurgaon_Warehouse',
        'Hyderabad_Warehouse',
        'Mumbai_Warehouse',
    ];

    const escape = (str) => str.replace(/'/g, "\\'");
    const likeQuery = `%${escape(query)}%`;

    // Query all warehouse tables for product_name
    const unionQuery = validTables
        .map(
            (table) =>
                `SELECT DISTINCT product_name FROM ${table} WHERE product_name LIKE '${likeQuery}' LIMIT 10`
        )
        .join(' UNION ');

    db.query(unionQuery, (err, results) => {
        if (err) {
            console.error('[searchProducts] SQL Error:', err);
            return res.status(500).json({ error: 'Failed to search products' });
        }

        // Return distinct names
        const uniqueNames = [...new Set(results.map((r) => r.product_name))];
        res.json(uniqueNames);
    });
};
