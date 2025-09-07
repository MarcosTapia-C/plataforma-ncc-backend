// src/modelos/Minera.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // misma instancia que el resto

const Minera = sequelize.define('Minera', {
  id_minera: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre_minera: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'mineras', // nombre real de la tabla en BD
  timestamps: false,    // no tiene created_at / updated_at
});

module.exports = Minera;
