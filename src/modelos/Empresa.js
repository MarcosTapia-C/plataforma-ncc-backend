// src/modelos/Empresa.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // misma instancia que los demás modelos

// Definición de Empresa
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
    allowNull: false,   // campo obligatorio
    // 👇 eliminamos unique:true porque lo controlamos en backend
  },
}, {
  tableName: 'empresas_contratistas', // nombre real de la tabla en BD
  timestamps: false,
});

module.exports = Empresa;


