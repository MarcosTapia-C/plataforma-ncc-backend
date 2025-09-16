// src/db/test-sequelize.js
// script de prueba para verificar la conexión con Sequelize
const sequelize = require('./sequelize');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión con Sequelize exitosa.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error con Sequelize:', error);
    process.exit(1);
  }
})();
