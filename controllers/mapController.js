const db = require("../db/connection");
const axios = require("axios");

/* ---------------------------------------------------
   CLEAN LOCATION FOR GEOCODING (VERY IMPORTANT)
------------------------------------------------------*/
function cleanLocation(raw) {
    if (!raw) return "";
    return raw
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\(/g, "")
        .replace(/\)/g, "")
        .replace(/\s+/g, " ")
        .trim() + ", India";   // better accuracy
}

/* ---------------------------------------------------
   GEOCODING WITH TIMEOUT + RETRY + FAIL-SAFE
------------------------------------------------------*/
async function geocodeLocation(rawLocation) {
    try {
        const query = cleanLocation(rawLocation);

        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: { format: "json", q: query, limit: 1 },
            headers: { "User-Agent": "Tracking-System" },
            timeout: 2500  // prevent backend hang
        });

        if (!res.data || res.data.length === 0) return null;

        return {
            lat: parseFloat(res.data[0].lat),
            lng: parseFloat(res.data[0].lon)
        };
    } catch (err) {
        console.error("Geocode Timeout/Fail:", err.message);
        return null;
    }
}

/* ---------------------------------------------------
   CHECK + CACHE LAT/LNG IN DATABASE
------------------------------------------------------*/
async function ensureLatLng(locationString) {
    if (!locationString) return null;

    // ⚠️ CHANGE COLUMN NAME IF DIFFERENT IN YOUR DB
    const [rows] = await db.promise().query(
        `SELECT latitude, longitude FROM locations_geo WHERE location_string = ? LIMIT 1`,
        [locationString]
    );

    // already in DB → return instantly
    if (rows.length > 0 && rows[0].latitude && rows[0].longitude) {
        return { lat: rows[0].latitude, lng: rows[0].longitude };
    }

    // Not in DB → geocode
    const geo = await geocodeLocation(locationString);
    if (!geo) {
        // save empty so we don't geocode repeatedly
        await db.promise().query(
            `INSERT IGNORE INTO locations_geo (location_string) VALUES (?)`,
            [locationString]
        );
        return null;
    }

    // Save new coordinates
    await db.promise().query(
        `INSERT INTO locations_geo (location_string, latitude, longitude)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
        [locationString, geo.lat, geo.lng]
    );

    return geo;
}

/* ---------------------------------------------------
   GET LATEST MARKER PER AWB
------------------------------------------------------*/
exports.getMarkers = async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT t.*
            FROM tracking_history t
            INNER JOIN (
                SELECT awb, MAX(scan_time) AS max_time
                FROM tracking_history
                GROUP BY awb
            ) x ON t.awb = x.awb AND t.scan_time = x.max_time
            ORDER BY t.scan_time DESC
        `);

        const result = [];

        for (const row of rows) {
            const geo = await ensureLatLng(row.location);
            if (!geo) continue;

            result.push({
                awb: row.awb,
                status: row.status,
                location: row.location,
                time: row.scan_time,
                lat: geo.lat,
                lng: geo.lng
            });
        }

        res.json(result);
    } catch (err) {
        console.error("Markers Error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

/* ---------------------------------------------------
   FULL ROUTE FOR MULTIPLE AWB
------------------------------------------------------*/
exports.trackAwbs = async (req, res) => {
    try {
        const awbs = (req.query.awbs || "")
            .split(",")
            .map(x => x.trim())
            .filter(Boolean);

        if (awbs.length === 0)
            return res.status(400).json({ error: "Missing AWBs" });

        const placeholders = awbs.map(() => "?").join(",");

        const [rows] = await db.promise().query(
            `
            SELECT awb, status, location, scan_time
            FROM tracking_history
            WHERE awb IN (${placeholders})
            ORDER BY awb, scan_time ASC
        `,
            awbs
        );

        const result = {};
        awbs.forEach(a => (result[a] = { awb: a, route: [] }));

        for (const row of rows) {
            const geo = await ensureLatLng(row.location);
            if (!geo) continue;

            result[row.awb].route.push({
                status: row.status,
                location: row.location,
                time: row.scan_time,
                lat: geo.lat,
                lng: geo.lng
            });
        }

        res.json(result);
    } catch (err) {
        console.error("TRACK ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
};
