const mysql = require('mysql2');
const { URL } = require('url');

// Parse DB_URL from environment
const rawUrl = process.env.DB_URL;
if (!rawUrl) {
    console.error('❌ Missing DB_URL in environment');
    process.exit(1);
}

let dbUrl;
try {
    dbUrl = new URL(rawUrl);
} catch (err) {
    console.error('❌ Invalid DB_URL format:', err.message);
    process.exit(1);
}

// Create MySQL connection with explicit fields
const db = mysql.createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    connectTimeout: 10000
});

// Connect and log status
db.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to MySQL');
    }
});

module.exports = db;