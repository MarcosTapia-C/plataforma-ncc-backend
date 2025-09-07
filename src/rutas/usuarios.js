// src/rutas/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

// IMPORTA DESDE asociaciones (no directamente de cada modelo)
const { Usuario, Rol } = require('../modelos/asociaciones');

/**
 * GET /api/usuarios
 * ...
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let where = {};

    if (q && q.trim()) {
      where = {
        [Op.or]: [
          { nombre:   { [Op.like]: `%${q}%` } },
          { apellido: { [Op.like]: `%${q}%` } },
          { usuario:  { [Op.like]: `%${q}%` } },
          { email:    { [Op.like]: `%${q}%` } }
        ]
      };
    }

    const usuarios = await Usuario.findAll({
      where,
      attributes: { exclude: ['contrasena'] },
      include: [{ model: Rol, attributes: ['id_rol', 'nombre_rol'] }],
      order: [['id_usuario', 'ASC']],
      limit: 100
    });

    res.json(usuarios);
  } catch (e) {
    console.error('Error GET /api/usuarios:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

/**
 * GET /api/usuarios/:id
 * ...
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['contrasena'] },
      include: [{ model: Rol, attributes: ['id_rol', 'nombre_rol'] }]
    });

    if (!usuario) {
      return res.status(404).json({ ok: false, error: 'USUARIO_NO_ENCONTRADO' });
    }

    res.json(usuario);
  } catch (e) {
    console.error('Error GET /api/usuarios/:id:', e);
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' });
  }
});

/**
 * POST /api/usuarios
 * ...
 */
router.post(
  '/',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
    body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio.'),
    body('email').trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('usuario').trim().isLength({ min: 3 }).withMessage('El usuario debe tener al menos 3 caracteres.'),
    body('contrasena').notEmpty().withMessage('La contraseña es obligatoria.').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    body('id_rol').notEmpty().withMessage('El id_rol es obligatorio.').isInt({ min: 1 }).withMessage('El id_rol debe ser un entero válido.')
  ],
  async (req, res) => {
    try {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({ ok: false, errores: errores.array() });
      }

      let { nombre, apellido, email, usuario, contrasena, id_rol } = req.body;
      usuario = usuario.trim().toLowerCase();

      const rol = await Rol.findByPk(id_rol);
      if (!rol) return res.status(400).json({ ok: false, mensaje: 'El rol indicado no existe.' });

      const existe = await Usuario.findOne({ where: { [Op.or]: [{ email }, { usuario }] } });
      if (existe) {
        const ya = existe.email === email ? 'email' : 'usuario';
        return res.status(409).json({ ok: false, mensaje: `El ${ya} ya está registrado.` });
      }

      const hash = await bcrypt.hash(contrasena, 10);
      const nuevo = await Usuario.create({ nombre, apellido, email, usuario, contrasena: hash, id_rol });

      const plano = nuevo.toJSON();
      delete plano['contrasena'];
      return res.status(201).json({ ok: true, data: plano });
    } catch (err) {
      console.error('Error en POST /api/usuarios:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error interno.' });
    }
  }
);

/**
 * PUT /api/usuarios/:id
 * ...
 */
router.put(
  '/:id',
  [
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío.'),
    body('apellido').optional().trim().notEmpty().withMessage('El apellido no puede estar vacío.'),
    body('email').optional().trim().isEmail().withMessage('Email inválido.').normalizeEmail(),
    body('usuario').optional().trim().isLength({ min: 3 }).withMessage('El usuario debe tener al menos 3 caracteres.'),
    body('contrasena').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
    body('id_rol').optional().isInt({ min: 1 }).withMessage('El id_rol debe ser un entero válido.')
  ],
  async (req, res) => {
    try {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({ ok: false, errores: errores.array() });
      }

      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id) || id <= 0) {
        return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
      }

      const user = await Usuario.findByPk(id);
      if (!user) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });

      let { nombre, apellido, email, usuario, contrasena, id_rol } = req.body;
      const updates = {};

      if (typeof nombre !== 'undefined')   updates.nombre = nombre;
      if (typeof apellido !== 'undefined') updates.apellido = apellido;
      if (typeof email !== 'undefined')    updates.email = email;
      if (typeof usuario !== 'undefined')  updates.usuario = usuario.trim().toLowerCase();
      if (typeof id_rol !== 'undefined')   updates.id_rol = id_rol;

      if (typeof id_rol !== 'undefined') {
        const rol = await Rol.findByPk(id_rol);
        if (!rol) return res.status(400).json({ ok: false, mensaje: 'El rol indicado no existe.' });
      }

      if (email || usuario) {
        const orConds = [];
        if (email)   orConds.push({ email });
        if (usuario) orConds.push({ usuario: usuario.trim().toLowerCase() });

        const existe = await Usuario.findOne({
          where: { [Op.and]: [{ id_usuario: { [Op.ne]: id } }, { [Op.or]: orConds }] }
        });
        if (existe) {
          const ya = (email && existe.email === email) ? 'email' : 'usuario';
          return res.status(409).json({ ok: false, mensaje: `El ${ya} ya está registrado.` });
        }
      }

      if (typeof contrasena !== 'undefined') {
        updates.contrasena = await bcrypt.hash(contrasena, 10);
      }

      await user.update(updates);
      const plano = user.toJSON();
      delete plano['contrasena'];

      return res.json({ ok: true, data: plano });
    } catch (err) {
      console.error('Error en PUT /api/usuarios/:id:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error interno.' });
    }
  }
);

/**
 * DELETE /api/usuarios/:id
 * ...
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ ok: false, mensaje: 'ID inválido.' });
    }

    const user = await Usuario.findByPk(id);
    if (!user) return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado.' });

    await user.destroy();
    return res.json({ ok: true, mensaje: 'Usuario eliminado.', id_usuario: id });
  } catch (err) {
    console.error('Error en DELETE /api/usuarios/:id:', err);
    return res.status(500).json({ ok: false, mensaje: 'Error interno.' });
  }
});

module.exports = router;





