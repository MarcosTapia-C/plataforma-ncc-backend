// src/db/sequelize.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: false,
  
  // dialectOptions: { ssl: { require: true } },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
});

module.exports = sequelize;
