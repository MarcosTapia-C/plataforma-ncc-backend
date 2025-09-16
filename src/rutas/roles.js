// src/rutas/roles.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

const { Rol, Usuario } = require('../modelos/asociaciones');
const requireAuth = require('../middlewares/requireAuth');
const { requireRoles } = require('../middlewares/requireRoles'); //// se importa el middleware requireRoles

// ==============================
// GET // se listan todos los roles (ruta protegida)
// ==============================
router.get('/', requireAuth, async (_req, res) => {
  try {
    const roles = await Rol.findAll({ order: [['id_rol', 'ASC']] });
    res.json({ ok: true, data: roles });
  } catch (err) {
    console.error('Error listando roles:', err);
    res.status(500).json({ ok: false, error: 'ROLES_LIST_FAILED' });
  }
});

// ========================================
// GET // se obtiene el detalle de un rol por id (ruta protegida)
// ========================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const rol = await Rol.findByPk(id);
    if (!rol) return res.status(404).json({ ok: false, error: 'ROL_NOT_FOUND' });

    res.json({ ok: true, data: rol });
  } catch (err) {
    console.error('Error obteniendo rol:', err);
    res.status(500).json({ ok: false, error: 'ROLE_DETAIL_FAILED' });
  }
});

// ========================================
// POST // se crea un rol (ruta protegida, solo Administrador)
// ========================================
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']), 
  [
    body('nombre_rol')
      .trim()
      .notEmpty().withMessage('El nombre del rol es obligatorio.')
      .isLength({ min: 3, max: 100 }).withMessage('El rol debe tener entre 3 y 100 caracteres.')
  ],
  async (req, res) => {
    try {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({ ok: false, errores: errores.array() });
      }

      const { nombre_rol } = req.body;

      // se valida que no exista otro rol con el mismo nombre
      const existe = await Rol.findOne({ where: { nombre_rol } });
      if (existe) {
        return res.status(409).json({ ok: false, mensaje: 'Ese rol ya existe.' });
      }

      const nuevo = await Rol.create({ nombre_rol });
      res.status(201).json({ ok: true, data: nuevo });
    } catch (err) {
      console.error('Error creando rol:', err);
      res.status(500).json({ ok: false, mensaje: 'ERROR_CREATING_ROLE' });
    }
  }
);

// ========================================
// PUT // se actualiza un rol por id (ruta protegida, solo Administrador)
// ========================================
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('nombre_rol')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 }).withMessage('El rol debe tener entre 3 y 100 caracteres.')
  ],
  async (req, res) => {
    try {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({ ok: false, errores: errores.array() });
      }

      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
      }

      const rol = await Rol.findByPk(id);
      if (!rol) return res.status(404).json({ ok: false, error: 'ROL_NOT_FOUND' });

      const { nombre_rol } = req.body;
      if (typeof nombre_rol !== 'undefined') {
        // se revisa que no exista otro rol con este nombre (evitar duplicados)
        const colision = await Rol.findOne({
          where: {
            [Op.and]: [
              { id_rol: { [Op.ne]: id } },
              { nombre_rol }
            ]
          }
        });
        if (colision) {
          return res.status(409).json({ ok: false, mensaje: 'Ya existe un rol con ese nombre.' });
        }
        rol.nombre_rol = nombre_rol;
      }

      await rol.save();
      res.json({ ok: true, data: rol });
    } catch (err) {
      console.error('Error actualizando rol:', err);
      res.status(500).json({ ok: false, mensaje: 'ERROR_UPDATING_ROLE' });
    }
  }
);

// ========================================
// DELETE // se elimina un rol por id (ruta protegida, solo Administrador)
// ========================================
router.delete(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
      }

      const rol = await Rol.findByPk(id);
      if (!rol) return res.status(404).json({ ok: false, error: 'ROL_NOT_FOUND' });

      // se bloquea el borrado si hay usuarios asociados
      const asociados = await Usuario.count({ where: { id_rol: id } });
      if (asociados > 0) {
        return res.status(409).json({
          ok: false,
          mensaje: 'No se puede eliminar: hay usuarios asociados a este rol.'
        });
      }

      await rol.destroy();
      res.json({ ok: true, mensaje: 'Rol eliminado correctamente.', id_rol: id });
    } catch (err) {
      console.error('Error eliminando rol:', err);
      res.status(500).json({ ok: false, mensaje: 'ERROR_DELETING_ROLE' });
    }
  }
);

module.exports = router;



