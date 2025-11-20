const db = require("../config/db");

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

        const [rows] = await db.query(query);
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

        const [rows] = await db.query(query);
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

        const [rows] = await db.query(query);
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
                SELECT return AS return_count FROM ahmedabad_inventory
                UNION ALL SELECT return FROM bangalore_inventory
                UNION ALL SELECT return FROM gurgaon_inventory
                UNION ALL SELECT return FROM hyderabad_inventory
                UNION ALL SELECT return FROM mumbai_inventory
            ) AS all_returns;
        `;

        const [rows] = await db.query(query);
        res.json({ returns_processed: rows[0].total_returns || 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching return count" });
    }
};

// 🟦 5. PAYMENT METHODS
exports.getPaymentMethods = async (req, res) => {
    try {
        const query = `
            SELECT payment_mode, COUNT(*) AS count FROM (
                SELECT payment_mode FROM Ahmedabad_Warehouse
                UNION ALL SELECT payment_mode FROM Bangalore_Warehouse
                UNION ALL SELECT payment_mode FROM Gurgaon_Warehouse
                UNION ALL SELECT payment_mode FROM Hyderabad_Warehouse
                UNION ALL SELECT payment_mode FROM Mumbai_Warehouse
            ) AS all_pay
            GROUP BY payment_mode;
        `;

        const [rows] = await db.query(query);

        const response = {
            card: 0,
            cash: 0,
            online: 0
        };

        rows.forEach(r => {
            if (r.payment_mode === "Card") response.card = r.count;
            if (r.payment_mode === "Cash") response.cash = r.count;
            if (r.payment_mode === "Online") response.online = r.count;
        });

        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching payment mode counts" });
    }
};
