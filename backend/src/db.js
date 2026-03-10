const mysql = require('mysql2/promise');
require('dotenv').config();

// Railway provee MYSQL_URL, en local usamos variables separadas
const pool = process.env.MYSQL_URL
  ? mysql.createPool(process.env.MYSQL_URL)
  : mysql.createPool({
      host:             process.env.DB_HOST || 'localhost',
      port:             process.env.DB_PORT || 3306,
      user:             process.env.DB_USER || 'root',
      password:         process.env.DB_PASS || '',
      database:         process.env.DB_NAME || 'caballos',
      waitForConnections: true,
      connectionLimit:  10,
    });

module.exports = pool;
