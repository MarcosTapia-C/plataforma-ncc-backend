// src/modelos/asociaciones.js
const sequelize = require('../db/sequelize');

// Registrar modelos
require('./Rol');
require('./Usuario');
require('./Empresa');
require('./Minera');
require('./Sindicato');
require('./Negociacion');
require('./Monitoreo');

const { Rol, Usuario, Empresa, Minera, Sindicato, Negociacion, Monitoreo } = sequelize.models;

// 1 Rol -> N Usuarios
Rol.hasMany(Usuario, { foreignKey: 'id_rol' });
Usuario.belongsTo(Rol, { foreignKey: 'id_rol' });

// 1 Minera -> N Empresas
Minera.hasMany(Empresa, { foreignKey: 'id_minera' });
Empresa.belongsTo(Minera, { foreignKey: 'id_minera' });

// 1 Empresa -> N Negociaciones
Empresa.hasMany(Negociacion, { foreignKey: 'id_empresa' });
Negociacion.belongsTo(Empresa, { foreignKey: 'id_empresa' });

// 1 Sindicato -> N Negociaciones
Sindicato.hasMany(Negociacion, { foreignKey: 'id_sindicato' });
Negociacion.belongsTo(Sindicato, { foreignKey: 'id_sindicato' });

// 1 Negociacion -> N Monitoreos
Negociacion.hasMany(Monitoreo, { foreignKey: 'id_negociacion' });
Monitoreo.belongsTo(Negociacion, { foreignKey: 'id_negociacion' });

module.exports = { Rol, Usuario, Empresa, Minera, Sindicato, Negociacion, Monitoreo };




