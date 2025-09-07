// src/servidor.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const rutasAuth = require('./rutas/auth');
const empresasRouter = require('./rutas/empresas');
const minerasRouter = require('./rutas/mineras');
const sindicatosRouter = require('./rutas/sindicatos')
const negociacionesRouter = require('./rutas/negociaciones');
const monitoreosRouter = require('./rutas/monitoreos');

// --- Sequelize & Modelos ---
const sequelize = require('./db/sequelize');
const { Rol, Usuario } = require('./modelos/asociaciones');

// --- Rutas ---
const usuariosRouter = require('./rutas/usuarios');
const rolesRouter = require('./rutas/roles');

// --- Middleware de autenticación (JWT) ---
const requireAuth = require('./middlewares/requireAuth');

const app = express();

// ---------- Validación mínima de env ----------
const { DATABASE_URL, PORT = 3000, JWT_SECRET } = process.env;
if (!DATABASE_URL) {
  console.error('⛔ Falta la variable de entorno DATABASE_URL');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('⛔ Falta la variable de entorno JWT_SECRET');
  process.exit(1);
}

// ---------- Middlewares ----------
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ---------- Rutas base ----------
app.get('/', (_req, res) => {
  res.json({ ok: true, msg: 'Plataforma NCC API' });
});

// Salud usando Sequelize (sin mysql2 duplicado)
app.get('/api/health', async (_req, res) => {
  try {
    const [rows] = await sequelize.query('SELECT 1 AS ok;');
    res.json({ ok: true, db: rows[0] });
  } catch (err) {
    console.error('Error de conexión a MySQL (via Sequelize):', err.message);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: err.message });
  }
});

// Salud extendida: authenticate()
app.get('/api/diagnostico', async (_req, res) => {
  try {
    await sequelize.authenticate(); // Sequelize
    res.json({ ok: true, sequelizeOk: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- Montaje de rutas ----------
// IMPORTANTE: dejamos /api/login abierto
app.use('/api', rutasAuth);                // -> POST /api/login (abierta)

// Dejamos roles abiertos por ahora (demo)
app.use('/api/roles', rolesRouter);

// PROTEGIDA: requiere token Bearer
app.use('/api/usuarios', requireAuth, usuariosRouter);

app.use('/api/empresas', empresasRouter);
app.use('/api/mineras', minerasRouter); 
app.use('/api/sindicatos', sindicatosRouter);
app.use('/api/negociaciones', negociacionesRouter);
app.use('/api/monitoreos', monitoreosRouter);

// ---------- Middlewares de cierre ----------
// 404 para rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'NOT_FOUND' });
});

// Manejador de errores general
app.use((err, _req, res, _next) => {
  console.error('Unhandled:', err);
  res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
});

// ---------- Arranque (sync antes de listen) ----------
async function start() {
  try {
    await sequelize.sync(); // sin force/alter
    console.log('✅ Modelos sincronizados con la BD');
  } catch (err) {
    console.error('❌ Error al sincronizar modelos:', err);
  }
  app.listen(PORT, () => {
    console.log(`✅ API corriendo en http://localhost:${PORT}`);
  });
}

start();





