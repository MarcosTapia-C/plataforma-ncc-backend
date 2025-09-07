// src/db.js  (CommonJS)
require('dotenv').config();
const mysql = require('mysql2/promise');

// Pool de conexiones (reutilizable en toda la app)
const pool = mysql.createPool(process.env.DATABASE_URL);

// Función de salud rápida
async function ping() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = { pool, ping };
