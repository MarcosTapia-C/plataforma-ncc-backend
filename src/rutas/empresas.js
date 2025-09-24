// src/rutas/empresas.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');

const requireAuth = require('../middlewares/requireAuth');
const { requireRoles } = require('../middlewares/requireRoles');
const { Empresa, Minera, Negociacion } = require('../modelos/asociaciones');

// LISTAR
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

// OBTENER POR ID
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

// CREAR (Administrador)
// Reglas: (rut_empresa, id_minera) único y (nombre_empresa, id_minera) único
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_minera').isInt({ gt: 0 }).withMessage('id_minera debe ser entero positivo.'),
    body('nombre_empresa')
  .trim()
  .notEmpty().withMessage('El nombre de la empresa es obligatorio.')
  .isLength({ max: 100 }).withMessage('El nombre no puede superar los 100 caracteres.'),

body('rut_empresa')
  .trim()
  .notEmpty().withMessage('El RUT es obligatorio.')
  .isLength({ max: 100 }).withMessage('El RUT no puede superar los 100 caracteres.'),

  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }
    try {
      const { id_minera, nombre_empresa, rut_empresa } = req.body;

      // validar FK minera
      const minera = await Minera.findByPk(id_minera);
      if (!minera) return res.status(400).json({ ok: false, error: 'MINERA_NOT_FOUND' });

      // === Cambios clave: unicidad POR MINERA ===
      // RUT + MINERA
      const rutDuplicadoMismaMinera = await Empresa.findOne({
        where: { rut_empresa, id_minera },
      });
      if (rutDuplicadoMismaMinera) {
        return res.status(409).json({
          ok: false,
          error: 'RUT_MINERA_DUPLICADO',
          mensaje: 'Ya existe una empresa con ese RUT en la minera indicada.',
        });
      }

      // NOMBRE + MINERA
      const nombreDuplicadoMismaMinera = await Empresa.findOne({
        where: { nombre_empresa, id_minera },
      });
      if (nombreDuplicadoMismaMinera) {
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

// ACTUALIZAR (Administrador)
// Mantiene la unicidad por minera en RUT y NOMBRE
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_minera').optional().isInt({ gt: 0 }).withMessage('id_minera debe ser entero positivo.'),
    body('nombre_empresa').optional().trim().notEmpty().isLength({ max: 100 })
      .withMessage('Nombre inválido (máx 100).'),
    body('rut_empresa').optional().trim().notEmpty().isLength({ max: 100 })
      .withMessage('RUT inválido (máx 100).'),
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

      // validar FK minera si cambia
      if (typeof id_minera !== 'undefined') {
        const minera = await Minera.findByPk(id_minera);
        if (!minera) return res.status(400).json({ ok: false, error: 'MINERA_NOT_FOUND' });
      }

      // destino final de los campos (considerando los que no cambian)
      const mineraFinal = typeof id_minera !== 'undefined' ? id_minera : empresa.id_minera;
      const rutFinal    = typeof rut_empresa !== 'undefined' ? rut_empresa : empresa.rut_empresa;
      const nombreFinal = typeof nombre_empresa !== 'undefined' ? nombre_empresa : empresa.nombre_empresa;

      // === Unicidad POR MINERA excluyendo el propio registro ===
      // RUT + MINERA
      const collisionRut = await Empresa.findOne({
        where: {
          rut_empresa: rutFinal,
          id_minera: mineraFinal,
          id_empresa: { [Op.ne]: id },
        },
      });
      if (collisionRut) {
        return res.status(409).json({
          ok: false,
          error: 'RUT_MINERA_DUPLICADO',
          mensaje: 'Ya existe otra empresa con ese RUT en la minera indicada.',
        });
      }

      // NOMBRE + MINERA
      const collisionNombre = await Empresa.findOne({
        where: {
          nombre_empresa: nombreFinal,
          id_minera: mineraFinal,
          id_empresa: { [Op.ne]: id },
        },
      });
      if (collisionNombre) {
        return res.status(409).json({
          ok: false,
          error: 'NOMBRE_MINERA_DUPLICADO',
          mensaje: 'Ya existe otra empresa con ese nombre en la misma minera.',
        });
      }

      // aplicar cambios
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

// ELIMINAR (Administrador)
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

