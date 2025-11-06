const mysql = require('mysql2');

const db = mysql.createConnection({
    user: 'root',
    password: 'root',
    database: 'hunyhuny_auto_dispatch',
    socketPath: '/var/run/mysqld/mysqld.sock',
    connectTimeout: 10000
});

db.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to MySQL');
    }
});

module.exports = db;