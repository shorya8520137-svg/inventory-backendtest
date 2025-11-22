const db = require('../db/connection');

// Helper to convert callback query → Promise (keep your structure)
function runQuery(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// 🟦 1. TOTAL STOCK
exports.getTotalStock = async (req, res) => {
    try {
        const query = `
            SELECT SUM(stock) AS total_stock FROM (
                SELECT stock FROM ahmedabad_inventory
                UNION ALL SELECT stock FROM bangalore_inventory
                UNION ALL SELECT stock FROM gurgaon_inventory
                UNION ALL SELECT stock FROM hyderabad_inventory
                UNION ALL SELECT stock FROM mumbai_inventory
            ) AS all_inv;
        `;

        const rows = await runQuery(query);
        res.json({ total_stock: rows[0].total_stock || 0 });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching total stock" });
    }
};

// 🟦 2. ORDERS PENDING
exports.getOrdersPending = async (req, res) => {
    try {
        const query = `
            SELECT COUNT(*) AS pending_orders FROM (
                SELECT status FROM Ahmedabad_Warehouse
                UNION ALL SELECT status FROM Bangalore_Warehouse
                UNION ALL SELECT status FROM Gurgaon_Warehouse
                UNION ALL SELECT status FROM Hyderabad_Warehouse
                UNION ALL SELECT status FROM Mumbai_Warehouse
            ) AS all_orders
            WHERE status = 'Pending';
        `;

        const rows = await runQuery(query);
        res.json({ pending_orders: rows[0].pending_orders || 0 });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching pending orders" });
    }
};

// 🟦 3. INVOICES GENERATED
exports.getInvoicesGenerated = async (req, res) => {
    try {
        const query = `
            SELECT COUNT(*) AS invoices FROM (
                SELECT status FROM Ahmedabad_Warehouse
                UNION ALL SELECT status FROM Bangalore_Warehouse
                UNION ALL SELECT status FROM Gurgaon_Warehouse
                UNION ALL SELECT status FROM Hyderabad_Warehouse
                UNION ALL SELECT status FROM Mumbai_Warehouse
            ) AS all_orders;
        `;

        const rows = await runQuery(query);
        res.json({ invoices_generated: rows[0].invoices });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching invoices" });
    }
};

// 🟦 4. RETURNS PROCESSED
exports.getReturnsProcessed = async (req, res) => {
    try {
        const query = `
            SELECT SUM(return_count) AS total_returns FROM (
                SELECT \`return\` AS return_count FROM ahmedabad_inventory
                UNION ALL SELECT \`return\` FROM bangalore_inventory
                UNION ALL SELECT \`return\` FROM gurgaon_inventory
                UNION ALL SELECT \`return\` FROM hyderabad_inventory
                UNION ALL SELECT \`return\` FROM mumbai_inventory
            ) AS all_returns;
        `;

        const rows = await runQuery(query);
        res.json({ returns_processed: rows[0].total_returns || 0 });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching return count" });
    }
};

// 🟦 5. PAYMENT METHODS (UPDATED TO MATCH REAL DB VALUES)
exports.getPaymentMethods = async (req, res) => {
    try {
        const query = `
            SELECT payment_mode FROM (
                SELECT payment_mode FROM Ahmedabad_Warehouse
                UNION ALL SELECT payment_mode FROM Bangalore_Warehouse
                UNION ALL SELECT payment_mode FROM Gurgaon_Warehouse
                UNION ALL SELECT payment_mode FROM Hyderabad_Warehouse
                UNION ALL SELECT payment_mode FROM Mumbai_Warehouse
            ) AS all_pay;
        `;

        const rows = await runQuery(query);

        const counts = {
            bankTransfer: 0,
            cod: 0,
            upi: 0,
            prepaid: 0,
            wallet: 0,
            other: 0
        };

        rows.forEach(r => {
            const mode = (r.payment_mode || "").trim();

            if (mode === "Bank Transfer") counts.bankTransfer++;
            else if (mode === "Cash on Delivery" || mode === "COD") counts.cod++;
            else if (mode === "UPI") counts.upi++;
            else if (mode === "Prepaid") counts.prepaid++;
            else if (mode === "Wallet") counts.wallet++;
            else if (mode === "Other") counts.other++;
        });

        res.json(counts);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching payment mode counts" });
    }
};

// 🟦 6. MONTHLY STOCK PER WAREHOUSE
exports.getMonthlyStockPerWarehouse = async (req, res) => {
    try {
        const query = `
            SELECT * FROM (
                SELECT 
                    YEAR(created_at) AS year,
                    MONTH(created_at) AS month,
                    DATE_FORMAT(created_at, '%b %Y') AS month_label,
                    'ahmedabad' AS city,
                    SUM(stock) AS total_stock
                FROM ahmedabad_inventory
                GROUP BY YEAR(created_at), MONTH(created_at)

                UNION ALL

                SELECT 
                    YEAR(created_at) AS year,
                    MONTH(created_at) AS month,
                    DATE_FORMAT(created_at, '%b %Y') AS month_label,
                    'bangalore' AS city,
                    SUM(stock) AS total_stock
                FROM bangalore_inventory
                GROUP BY YEAR(created_at), MONTH(created_at)

                UNION ALL

                SELECT 
                    YEAR(created_at) AS year,
                    MONTH(created_at) AS month,
                    DATE_FORMAT(created_at, '%b %Y') AS month_label,
                    'gurgaon' AS city,
                    SUM(stock) AS total_stock
                FROM gurgaon_inventory
                GROUP BY YEAR(created_at), MONTH(created_at)

                UNION ALL

                SELECT 
                    YEAR(created_at) AS year,
                    MONTH(created_at) AS month,
                    DATE_FORMAT(created_at, '%b %Y') AS month_label,
                    'hyderabad' AS city,
                    SUM(stock) AS total_stock
                FROM hyderabad_inventory
                GROUP BY YEAR(created_at), MONTH(created_at)

                UNION ALL

                SELECT 
                    YEAR(created_at) AS year,
                    MONTH(created_at) AS month,
                    DATE_FORMAT(created_at, '%b %Y') AS month_label,
                    'mumbai' AS city,
                    SUM(stock) AS total_stock
                FROM mumbai_inventory
                GROUP BY YEAR(created_at), MONTH(created_at)
            ) AS t
            ORDER BY year, month;
        `;

        const rows = await runQuery(query);

        const months = [];
        const monthIndexMap = {};

        rows.forEach((row) => {
            if (!monthIndexMap.hasOwnProperty(row.month_label)) {
                monthIndexMap[row.month_label] = months.length;
                months.push(row.month_label);
            }
        });

        const series = {
            ahmedabad: new Array(months.length).fill(0),
            bangalore: new Array(months.length).fill(0),
            gurgaon: new Array(months.length).fill(0),
            hyderabad: new Array(months.length).fill(0),
            mumbai: new Array(months.length).fill(0)
        };

        rows.forEach((row) => {
            const idx = monthIndexMap[row.month_label];
            if (series[row.city] !== undefined) {
                series[row.city][idx] = row.total_stock || 0;
            }
        });

        res.json({
            months,
            ...series
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching monthly stock levels" });
    }
};
