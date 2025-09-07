// src/db/test-sync-usuario.js
const sequelize = require('./sequelize');
const bcrypt = require('bcryptjs');
const { Rol, Usuario } = require('../modelos/asociaciones');

(async () => {
  try {
    // Sincroniza según definición (sin borrar nada)
    await sequelize.sync();
    console.log('✅ Tablas "roles" y "usuarios" sincronizadas.');

    // Asegura que existan roles base
    const [admin] = await Rol.findOrCreate({
      where: { nombre_rol: 'Administrador' },
      defaults: { nombre_rol: 'Administrador' }
    });
    await Rol.findOrCreate({
      where: { nombre_rol: 'Usuario' },
      defaults: { nombre_rol: 'Usuario' }
    });

    // Inserta un usuario de ejemplo solo si la tabla está vacía
    const count = await Usuario.count();
    if (count === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await Usuario.create({
        nombre: 'Marcos',
        apellido: 'Tapia',
        email: 'marcos@example.cl',
        usuario: 'marcos',
        contrasena: hash,   // ahora hasheada
        id_rol: admin.id_rol
      });
      console.log('🌱 Usuario de ejemplo creado y asociado al rol Administrador.');
    } else {
      console.log(`ℹ️ Ya existen ${count} usuarios. No inserto ejemplo.`);
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ Error en sync/seed:', e);
    process.exit(1);
  }
})();

