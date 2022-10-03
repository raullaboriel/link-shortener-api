const mysql = require('mysql');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'linkshortener',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '@5BumbSe]Uf-8U!q',
    ssl: true
});

module.exports = pool;
