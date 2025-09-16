// src/rutas/empresas.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

const requireAuth = require('../middlewares/requireAuth');        // se importa el middleware de autenticación
const { requireRoles } = require('../middlewares/requireRoles');  // se importa el middleware de roles

// se importa Negociacion para validar dependencias antes de eliminar
const { Empresa, Minera, Negociacion } = require('../modelos/asociaciones');

// se listan todas las empresas (ruta protegida)
router.get('/', requireAuth, async (_req, res) => {
  try {
    const empresas = await Empresa.findAll({
      include: [{ model: Minera, attributes: ['id_minera', 'nombre_minera'] }],
      order: [['id_empresa', 'ASC']],
    });
    res.json({ ok: true, data: empresas });
  } catch (err) {
    console.error('Error listando empresas:', err);
    res.status(500).json({ ok: false, error: 'EMPRESAS_LIST_FAILED' });
  }
});

// se obtiene una empresa por id (ruta protegida)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const empresa = await Empresa.findByPk(id, {
      include: [{ model: Minera, attributes: ['id_minera', 'nombre_minera'] }],
    });

    if (!empresa) {
      return res.status(404).json({ ok: false, error: 'EMPRESA_NOT_FOUND' });
    }
    res.json({ ok: true, data: empresa });
  } catch (err) {
    console.error('Error obteniendo empresa:', err);
    res.status(500).json({ ok: false, error: 'EMPRESA_DETAIL_FAILED' });
  }
});

// se crea una empresa (ruta protegida, solo Administrador)
// reglas: id_minera válido; nombre_empresa y rut_empresa obligatorios (máx 100);
// RUT único a nivel plataforma; (nombre_empresa, id_minera) único dentro de la misma minera
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_minera').isInt({ gt: 0 }).withMessage('id_minera debe ser entero positivo.'),
    body('nombre_empresa')
      .trim()
      .notEmpty().withMessage('El nombre de la empresa es obligatorio.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
    body('rut_empresa')
      .trim()
      .notEmpty().withMessage('El RUT es obligatorio.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }
    try {
      const { id_minera, nombre_empresa, rut_empresa } = req.body;

      // se valida que exista la minera (FK)
      const minera = await Minera.findByPk(id_minera);
      if (!minera) {
        return res.status(400).json({ ok: false, error: 'MINERA_NOT_FOUND' });
      }

      // se valida RUT único a nivel plataforma
      const rutDuplicado = await Empresa.findOne({ where: { rut_empresa } });
      if (rutDuplicado) {
        return res.status(409).json({
          ok: false,
          error: 'RUT_DUPLICADO',
          mensaje: 'El RUT ya está registrado en otra empresa.',
        });
      }

      // se valida nombre único dentro de la misma minera
      const nombreEnMinera = await Empresa.findOne({ where: { id_minera, nombre_empresa } });
      if (nombreEnMinera) {
        return res.status(409).json({
          ok: false,
          error: 'NOMBRE_MINERA_DUPLICADO',
          mensaje: 'Ya existe una empresa con ese nombre en la misma minera.',
        });
      }

      const nueva = await Empresa.create({ id_minera, nombre_empresa, rut_empresa });
      res.status(201).json({ ok: true, data: nueva });
    } catch (err) {
      console.error('Error creando empresa:', err);
      res.status(500).json({ ok: false, error: 'EMPRESA_CREATE_FAILED' });
    }
  }
);

// se actualiza una empresa por id (ruta protegida, solo Administrador)
// se mantienen las reglas y se asegura RUT único global al actualizar
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_minera').optional().isInt({ gt: 0 }).withMessage('id_minera debe ser entero positivo.'),
    body('nombre_empresa')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede quedar vacío.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
    body('rut_empresa')
      .optional()
      .trim()
      .notEmpty().withMessage('El RUT no puede quedar vacío.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
      }

      const empresa = await Empresa.findByPk(id);
      if (!empresa) {
        return res.status(404).json({ ok: false, error: 'EMPRESA_NOT_FOUND' });
      }

      const { id_minera, nombre_empresa, rut_empresa } = req.body;

      // si cambia la minera, se valida la FK
      if (typeof id_minera !== 'undefined') {
        const minera = await Minera.findByPk(id_minera);
        if (!minera) {
          return res.status(400).json({ ok: false, error: 'MINERA_NOT_FOUND' });
        }
      }

      // se valida RUT único a nivel plataforma (excluyendo el propio registro)
      if (typeof rut_empresa !== 'undefined') {
        const rutDuplicado = await Empresa.findOne({
          where: { rut_empresa, id_empresa: { [Op.ne]: id } },
        });
        if (rutDuplicado) {
          return res.status(409).json({
            ok: false,
            error: 'RUT_DUPLICADO',
            mensaje: 'El RUT ya está registrado en otra empresa.',
          });
        }
      }

      // se valida nombre único dentro de la misma minera (considerando cambios)
      const mineraFinal = typeof id_minera !== 'undefined' ? id_minera : empresa.id_minera;
      const nombreFinal =
        typeof nombre_empresa !== 'undefined' ? nombre_empresa : empresa.nombre_empresa;

      const nombreEnMinera = await Empresa.findOne({
        where: {
          id_minera: mineraFinal,
          nombre_empresa: nombreFinal,
          id_empresa: { [Op.ne]: id },
        },
      });
      if (nombreEnMinera) {
        return res.status(409).json({
          ok: false,
          error: 'NOMBRE_MINERA_DUPLICADO',
          mensaje: 'Ya existe una empresa con ese nombre en la misma minera.',
        });
      }

      // se aplican los cambios permitidos
      if (typeof id_minera !== 'undefined') empresa.id_minera = id_minera;
      if (typeof nombre_empresa !== 'undefined') empresa.nombre_empresa = nombre_empresa;
      if (typeof rut_empresa !== 'undefined') empresa.rut_empresa = rut_empresa;

      await empresa.save();
      res.json({ ok: true, data: empresa });
    } catch (err) {
      console.error('Error actualizando empresa:', err);
      res.status(500).json({ ok: false, error: 'EMPRESA_UPDATE_FAILED' });
    }
  }
);

// se elimina una empresa por id (ruta protegida, solo Administrador)
// se bloquea la eliminación si existen negociaciones asociadas
router.delete('/:id', requireAuth, requireRoles(['Administrador']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const empresa = await Empresa.findByPk(id);
    if (!empresa) {
      return res.status(404).json({ ok: false, error: 'EMPRESA_NOT_FOUND' });
    }

    // se verifica si existen negociaciones asociadas a la empresa
    const hijos = await Negociacion.count({ where: { id_empresa: id } });
    if (hijos > 0) {
      return res.status(409).json({
        ok: false,
        mensaje: 'No se puede eliminar: existen negociaciones asociadas a esta empresa.',
      });
    }

    await empresa.destroy();
    res.json({ ok: true, mensaje: 'Empresa eliminada correctamente.', id_empresa: id });
  } catch (err) {
    console.error('Error eliminando empresa:', err);
    res.status(500).json({ ok: false, error: 'EMPRESA_DELETE_FAILED' });
  }
});

module.exports = router;
