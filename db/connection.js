require('dotenv').config();
const mysql = require('mysql2');

// ✅ Validate required env vars
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('❌ Missing DB credentials in environment');
    process.exit(1);
}

// ✅ Connection configuration
const connectionConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 10000
};

// ✅ Create MySQL connection
const db = mysql.createConnection(connectionConfig);

// ✅ Connect and log status
db.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to MySQL Database:', process.env.DB_HOST);
    }
});

module.exports = db;
