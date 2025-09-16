// test-db.js
const dotenv = require('dotenv');
dotenv.config({ path: '.env', override: true });

const mysql = require('mysql2/promise');
const { URL } = require('url');

(async function main() {
  try {
    //se verifica que exista la variable DATABASE_URL
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      console.error('⛔ No se encontró DATABASE_URL en .env');
      process.exit(1);
    }
    console.log('🔎 DATABASE_URL detectada:', raw.slice(0, 40) + '...');

    // se parsea la url y se establece la conexión
    const u = new URL(raw);
    const conn = await mysql.createConnection({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace('/', ''),
    });

    const [rows] = await conn.query('SELECT 1 AS ok');
    console.log('✅ Conexión OK. Resultado:', rows[0]);
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
})();



