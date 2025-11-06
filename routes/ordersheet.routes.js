const express = require('express');
const router = express.Router();
const db = require('../db/connection'); // ✅ your existing connection

// 🚚 Logistics
router.get('/logistics', (req, res) => {
    db.query('SELECT name FROM logistics', (err, results) => {
        if (err) {
            console.error('[Logistics] ❌', err.message);
            return res.status(500).json({ error: 'Failed to fetch logistics' });
        }
        res.json(results.map(row => row.name));
    });
});

// 💳 Payment Mode
router.get('/payment-mode', (req, res) => {
    db.query('SELECT mode_name FROM payment_mode', (err, results) => {
        if (err) {
            console.error('[PaymentMode] ❌', err.message);
            return res.status(500).json({ error: 'Failed to fetch payment modes' });
        }
        res.json(results.map(row => row.mode_name));
    });
});

// 🧑‍💼 Processed Persons
router.get('/processed-persons', (req, res) => {
    db.query('SELECT name FROM processed_persons', (err, results) => {
        if (err) {
            console.error('[ProcessedPersons] ❌', err.message);
            return res.status(500).json({ error: 'Failed to fetch processed persons' });
        }
        res.json(results.map(row => row.name));
    });
});

// 📦 OrderSheet Filter
router.post('/ordersheet-filter', (req, res) => {
    const {
        warehouse = [],
        orderRef = '',
        productName = '',
        variant = '',
        barcodeAwb = '',
        logistics = [],
        parcelType = '',
        paymentMode = '',
        processedBy = ''
    } = req.body;

    const validTables = [
        'Ahmedabad_Warehouse',
        'Bangalore_Warehouse',
        'Gurgaon_Warehouse',
        'Hyderabad_Warehouse',
        'Mumbai_Warehouse'
    ];

    const selectedTables = Array.isArray(warehouse) && warehouse.length > 0
        ? warehouse.filter(w => validTables.includes(w))
        : validTables;

    const escape = str => str.replace(/'/g, "\\'");

    const filters = [];
    if (orderRef.trim()) filters.push(`order_ref LIKE '%${escape(orderRef.trim())}%'`);
    if (productName.trim()) filters.push(`product_name LIKE '%${escape(productName.trim())}%'`);
    if (variant.trim()) filters.push(`variant LIKE '%${escape(variant.trim())}%'`);
    if (barcodeAwb.trim()) filters.push(`(barcode LIKE '%${escape(barcodeAwb.trim())}%' OR awb LIKE '%${escape(barcodeAwb.trim())}%')`);
    if (Array.isArray(logistics) && logistics.length > 0) filters.push(`logistics IN (${logistics.map(l => `'${escape(l)}'`).join(',')})`);
    if (parcelType.trim()) filters.push(`parcel_type LIKE '%${escape(parcelType.trim())}%'`);
    if (typeof paymentMode === 'string' && paymentMode.trim()) filters.push(`payment_mode = '${escape(paymentMode.trim())}'`);
    if (typeof processedBy === 'string' && processedBy.trim()) filters.push(`processed_by = '${escape(processedBy.trim())}'`);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const queries = selectedTables.map(table => `SELECT * FROM ${table} ${whereClause}`);
    const finalQuery = queries.join(' UNION ALL ');

    if (!finalQuery.trim()) {
        console.error('[OrderSheetFilter] ❌ Final query is empty');
        return res.status(400).json({ error: 'Query was empty' });
    }

    db.query(finalQuery, (err, results) => {
        if (err) {
            console.error('[OrderSheetFilter] ❌', err.message);
            return res.status(500).json({ error: 'Failed to fetch filtered orders' });
        }
        res.json(results);
    });
});

module.exports = router;