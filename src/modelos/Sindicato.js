// src/modelos/Sindicato.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize'); // se usa la misma instancia que los demás modelos

const Sindicato = sequelize.define('Sindicato', {
  id_sindicato: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre_sindicato: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  federacion: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tipo_sindicato: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'sindicatos',
  timestamps: false,
});

module.exports = Sindicato;
