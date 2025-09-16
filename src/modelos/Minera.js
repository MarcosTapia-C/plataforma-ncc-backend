// src/modelos/Minera.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // se usa la misma instancia que los demás modelos

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
  tableName: 'mineras', // nombre real de la tabla en la base de datos
  timestamps: false,    // este modelo no maneja campos de fecha de creación o actualización
});

module.exports = Minera;
