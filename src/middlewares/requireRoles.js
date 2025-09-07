// src/middlewares/requireRoles.js
const { Usuario, Rol } = require('../modelos/asociaciones');

function requireRoles(permitted = []) {
  return async (req, res, next) => {
    try {
      // Debe venir seteado por requireAuth
      if (!req.user) {
        return res.status(401).json({ ok: false, error: 'NO_AUTH' });
      }

      // Intentar obtener roles desde el token o desde BD
      let userRoles = [];

      // Si en tu token algún día incluyes 'roles' o 'rolNombre', se usan:
      if (Array.isArray(req.user.roles)) {
        userRoles = req.user.roles; // ej: ['Administrador']
      } else if (req.user.rolNombre) {
        userRoles = [req.user.rolNombre];
      } else {
        // Caso actual: buscamos en BD usando 'uid' del token
        const dbUser = await Usuario.findByPk(req.user.uid, {
          include: [{ model: Rol, attributes: ['id_rol', 'nombre_rol'] }],
        });
        if (dbUser?.Rol?.nombre_rol) userRoles = [dbUser.Rol.nombre_rol];
      }

      // Si no se exigieron roles concretos, basta estar autenticado
      if (!permitted.length) return next();

      // ¿Algún rol del usuario está permitido?
      const autorizado = userRoles.some((r) => permitted.includes(r));
      if (!autorizado) {
        return res.status(403).json({ ok: false, error: 'FORBIDDEN_ROLE' });
      }

      return next();
    } catch (err) {
      console.error('Error en requireRoles:', err);
      return res.status(500).json({ ok: false, error: 'ROLE_CHECK_FAILED' });
    }
  };
}

module.exports = { requireRoles };

