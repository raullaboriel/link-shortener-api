const mysql = require('mysql');

const pool = mysql.createPool({
    host: 'localhost',
    database: 'linkshortener',
    user: 'root',
    password: '@5BumbSe]Uf-8U!q'
});

module.exports = pool;
