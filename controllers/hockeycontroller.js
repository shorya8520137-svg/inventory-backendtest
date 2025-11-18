const db = require('../db/connection');

exports.getTrackingByAwb = (req, res) => {
    const awb = req.params.awb;

    // TIMELINE
    db.query(
        `
        SELECT status, location, scan_time, instructions, scan_type
        FROM tracking_history
        WHERE awb = ?
        ORDER BY scan_time ASC
        `,
        [awb],
        (err, timelineRows) => {
            if (err) {
                console.error("TIMELINE ERROR:", err);
                return res.status(500).json({ error: "Server error" });
            }

            // CUSTOMER DETAILS
            db.query(
                `
                SELECT customer_name, customer_address, customer_phone,
                       amount, order_type, origin, destination, expected_delivery
                FROM tracking_history
                WHERE awb = ?
                ORDER BY id DESC LIMIT 1
                `,
                [awb],
                (err, customerRows) => {
                    if (err) {
                        console.error("CUSTOMER ERROR:", err);
                        return res.status(500).json({ error: "Server error" });
                    }

                    const customer = customerRows[0] || null;
                    if (!customer) {
                        return res.status(404).json({ error: "No tracking found" });
                    }

                    // SHIPMENT UPDATES
                    db.query(
                        `
                        SELECT awb, status, logistics AS logistic, location,
                               scan_time AS time
                        FROM tracking_history
                        WHERE awb = ?
                        ORDER BY scan_time DESC
                        `,
                        [awb],
                        (err, shipmentUpdates) => {
                            if (err) {
                                console.error("SHIPMENT ERROR:", err);
                                return res.status(500).json({ error: "Server error" });
                            }

                            // WAREHOUSE HISTORY
                            db.query(
                                `
                                SELECT warehouse, status
                                FROM tracking_history
                                WHERE awb = ?
                                GROUP BY warehouse, status
                                `,
                                [awb],
                                (err, warehouseHistory) => {
                                    if (err) {
                                        console.error("WAREHOUSE ERROR:", err);
                                        return res.status(500).json({ error: "Server error" });
                                    }

                                    // TIMELINE FORMAT
                                    const formattedTimeline = timelineRows.map(row => ({
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
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};
