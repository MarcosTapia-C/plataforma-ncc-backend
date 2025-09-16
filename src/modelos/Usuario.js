// src/modelos/Usuario.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');
// se define el modelo Usuario con sus campos y configuración
const Usuario = sequelize.define('Usuario', {
  id_usuario: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre:      { type: DataTypes.STRING(100), allowNull: false },
  apellido:    { type: DataTypes.STRING(100), allowNull: false },
  email:       { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
  usuario:     { type: DataTypes.STRING(100), allowNull: false, unique: true },
  // se usa 'contrasena' en el código y se mapea a la columna 'contraseña' en la base de datos
  contrasena:  { type: DataTypes.STRING(100), allowNull: false, field: 'contraseña' },
  id_rol:      { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'usuarios',
  timestamps: false,
  freezeTableName: true
});

