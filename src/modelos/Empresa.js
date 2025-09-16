// src/modelos/Empresa.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // misma instancia que los demás modelos

// se define el modelo Empresa con id, minera, nombre y rut
const Empresa = sequelize.define('Empresa', {
  id_empresa: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_minera: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nombre_empresa: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  rut_empresa: {
    type: DataTypes.STRING(100),
    allowNull: false,           // campo obligatorio
    unique: true,               // cada empresa con RUT único
  },
}, {
  tableName: 'empresas_contratistas', // nombre real de la tabla en BD
  timestamps: false,
});

module.exports = Empresa;

