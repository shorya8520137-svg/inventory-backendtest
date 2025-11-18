const db = require('../db/connection');

// ------------------------
// GET /api/track?awbs=a,b,c
// ------------------------
exports.getBatchTracking = async (req, res) => {
    try {
        let awbs = (req.query.awbs || "")
            .split(",")
            .map(x => x.trim())
            .filter(x => x.length > 0);

        if (awbs.length === 0) {
            return res.status(400).json({ error: "awbs query param is required" });
        }

        // Create placeholders (?, ?, ?)
        const placeholders = awbs.map(() => "?").join(",");

        // -----------------------------------------------------
        // 1) FETCH ROUTE POINTS (lat/lng) FOR CURVED LINES
        // -----------------------------------------------------
        const routeRows = await db.query(
            `
            SELECT awb, latitude, longitude, status, scan_time, location, logistics, warehouse
            FROM tracking_history
            WHERE awb IN (${placeholders})
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
            ORDER BY awb, scan_time ASC
        `,
            awbs
        );

        // Prepare group structure
        const output = {};
        for (const a of awbs) {
            output[a] = {
                awb: a,
                route_points: [],
                timeline: []
            };
        }

        // Group route points
        for (const r of routeRows) {
            output[r.awb].route_points.push({
                lat: Number(r.latitude),
                lng: Number(r.longitude),
                status: r.status,
                scan_time: r.scan_time,
                location: r.location,
                logistics: r.logistics,
                warehouse: r.warehouse
            });
        }

        // -----------------------------------------------------
        // 2) FETCH TIMELINE (DESC)
        // -----------------------------------------------------
        const timelineRows = await db.query(
            `
            SELECT awb, status, location, scan_time, logistics, warehouse
            FROM tracking_history
            WHERE awb IN (${placeholders})
            ORDER BY awb, scan_time DESC
        `,
            awbs
        );

        for (const t of timelineRows) {
            output[t.awb].timeline.push({
                status: t.status,
                location: t.location,
                scan_time: t.scan_time,
                logistics: t.logistics,
                warehouse: t.warehouse
            });
        }

        return res.json({ data: output });

    } catch (err) {
        console.error("TRACKING ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
};


// -----------------------------------------
// GET /api/map/markers?status=dispatch,transit
// -----------------------------------------
exports.getLatestMarkers = async (req, res) => {
    try {
        const status = req.query.status
            ? req.query.status.split(",").map(x => x.trim())
            : [];

        const statusFilter = status.length
            ? `AND t.status IN (${status.map(() => "?").join(",")})`
            : "";

        const params = [...status];

        const rows = await db.query(
            `
            SELECT t.awb, t.latitude, t.longitude, t.status, t.scan_time
            FROM tracking_history t
            INNER JOIN (
                SELECT awb, MAX(scan_time) AS last_time
                FROM tracking_history
                WHERE latitude IS NOT NULL
                AND longitude IS NOT NULL
                GROUP BY awb
            ) x
            ON x.awb = t.awb AND x.last_time = t.scan_time
            ${statusFilter}
        `,
            params
        );

        const markers = rows.map(r => ({
            awb: r.awb,
            lat: Number(r.latitude),
            lng: Number(r.longitude),
            status: r.status,
            time: r.scan_time
        }));

        return res.json({ markers });

    } catch (err) {
        console.error("MARKER ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
};
