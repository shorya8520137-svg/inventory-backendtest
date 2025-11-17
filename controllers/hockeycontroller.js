const db = require('../db/connection');

exports.getTrackingByAwb = async (req, res) => {
    const awb = req.params.awb;

    try {
        // TIMELINE
        const [timeline] = await db.query(`
            SELECT status, location, scan_time, instructions, scan_type
            FROM tracking_history
            WHERE awb = ?
            ORDER BY scan_time ASC
        `, [awb]);

        // CUSTOMER DETAILS (latest)
        const [customerRows] = await db.query(`
            SELECT customer_name, customer_address, customer_phone,
                   amount, order_type, origin, destination, expected_delivery
            FROM tracking_history
            WHERE awb = ?
            ORDER BY id DESC LIMIT 1
        `, [awb]);

        const customer = customerRows[0] || null;

        // SHIPMENT UPDATES
        const [shipmentUpdates] = await db.query(`
            SELECT awb, status, logistics AS logistic, location,
                   scan_time AS time
            FROM tracking_history
            WHERE awb = ?
            ORDER BY scan_time DESC
        `, [awb]);

        // WAREHOUSE HISTORY
        const [warehouseHistory] = await db.query(`
            SELECT warehouse, status
            FROM tracking_history
            WHERE awb = ?
            GROUP BY warehouse, status
        `, [awb]);

        if (!customer) {
            return res.status(404).json({ error: "No tracking found" });
        }

        // TIMELINE FORMAT FOR FRONTEND
        const formattedTimeline = timeline.map(row => ({
            label: row.status,
            icon: "🚚",
            active: true,
            time: row.scan_time,
            location: row.location
        }));

        return res.json({
            customer: {
                awb,
                name: customer.customer_name,
                address: customer.customer_address,
                phone: customer.customer_phone,
                amount: customer.amount,
                order_type: customer.order_type,
                origin: customer.origin,
                destination: customer.destination,
                expected_delivery: customer.expected_delivery
            },
            timeline: formattedTimeline,
            shipment_updates: shipmentUpdates,
            warehouse_history: warehouseHistory
        });

    } catch (err) {
        console.error("TRACKING ERROR:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
