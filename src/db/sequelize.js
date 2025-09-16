// src/db/sequelize.js
require('dotenv').config();
const { Sequelize } = require('sequelize');
// se crea la instancia principal de sequelize usando la url de conexión
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: false,
  
  // opción para usar SSL si se requiere (ejemplo),
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

module.exports = sequelize;
