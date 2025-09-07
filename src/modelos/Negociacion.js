// src/modelos/Negociacion.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // misma instancia

const Negociacion = sequelize.define('Negociacion', {
  id_negociacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_sindicato: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  contrato: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  fecha_termino: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  vencimiento_contrato_comercial: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dotacion_total: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  personal_sindicalizado: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  porcentaje_sindicalizado: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
}, {
  tableName: 'negociaciones',
  timestamps: false,
});

module.exports = Negociacion;
