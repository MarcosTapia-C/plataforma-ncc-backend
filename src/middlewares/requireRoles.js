// src/middlewares/requireRoles.js
const { Usuario, Rol } = require('../modelos/asociaciones');

// middleware para validar que el usuario tenga uno de los roles permitidos
function requireRoles(permitted = []) {
  return async (req, res, next) => {
    try {
      // se espera que req.user haya sido definido por requireAuth
      if (!req.user) {
        return res.status(401).json({ ok: false, error: 'NO_AUTH' });
      }

      // se obtienen los roles desde el token o desde la base de datos
      let userRoles = [];

      // si el token incluye 'roles' o 'rolNombre', se usan esos valores
      if (Array.isArray(req.user.roles)) {
        userRoles = req.user.roles; // ej: ['Administrador']
      } else if (req.user.rolNombre) {
        userRoles = [req.user.rolNombre];
      } else {
        // en este caso se busca en la base de datos usando el uid del token
        const dbUser = await Usuario.findByPk(req.user.uid, {
          include: [{ model: Rol, attributes: ['id_rol', 'nombre_rol'] }],
        });
        if (dbUser?.Rol?.nombre_rol) userRoles = [dbUser.Rol.nombre_rol];
      }

      // si no se definieron roles permitidos, alcanza con estar autenticado
      if (!permitted.length) return next();

      // se verifica si algún rol del usuario está en la lista de permitidos
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


