// src/modelos/Rol.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');
// se define el modelo Rol con id y nombre_rol, usando la tabla 'roles'
const Rol = sequelize.define('Rol', {
  id_rol: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre_rol: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, {
  tableName: 'roles',     
  timestamps: false,      
  freezeTableName: true   
});

module.exports = Rol;
