const mysql = require('mysql2');
const { URL } = require('url');

// Parse DB_URL from environment
const dbUrl = new URL(process.env.DB_URL);

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