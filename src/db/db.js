// src/db.js  (CommonJS)
require('dotenv').config();
const mysql = require('mysql2/promise');

// Pool de conexiones para usos fuera de la API principal
const pool = mysql.createPool(process.env.DATABASE_URL);

// función de ping para verificar la conexión
async function ping() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = { pool, ping };
