// src/modelos/Monitoreo.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // misma instancia

const Monitoreo = sequelize.define('Monitoreo', {
  id_monitoreo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_negociacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_inicio_monitoreo: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  comentarios: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'monitoreos', // ajusta a tu nombre real de tabla si difiere
  timestamps: false,
});

module.exports = Monitoreo;
