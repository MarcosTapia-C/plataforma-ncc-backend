// src/db/test-sync-rol.js
const sequelize = require('./sequelize');
const Rol = require('../modelos/Rol');

(async () => {
  try {
    await sequelize.sync(); // sin force/alter
    console.log('✅ Tabla "roles" sincronizada.');

    // Semilla opcional si la tabla está vacía
    const count = await Rol.count();
    if (count === 0) {
      await Rol.bulkCreate([
        { nombre_rol: 'Administrador' },
        { nombre_rol: 'Usuario' }
      ]);
      console.log('🌱 Roles de ejemplo insertados.');
    } else {
      console.log(`ℹ️ Ya existen ${count} roles. No inserto ejemplos.`);
    }
    process.exit(0);
  } catch (e) {
    console.error('❌ Error al sincronizar:', e);
    process.exit(1);
  }
})();
