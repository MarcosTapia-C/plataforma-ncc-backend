// src/rutas/monitoreos.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const requireAuth = require('../middlewares/requireAuth');
const { requireRoles } = require('../middlewares/requireRoles');

const { Monitoreo, Negociacion } = require('../modelos/asociaciones');

// ==============================
// GET /api/monitoreos → listar (PROTEGIDO)
// ==============================
router.get('/', requireAuth, async (_req, res) => {
  try {
    const list = await Monitoreo.findAll({
      include: [{ model: Negociacion, attributes: ['id_negociacion', 'contrato', 'fecha_inicio'] }],
      order: [['id_monitoreo', 'ASC']],
    });
    res.json({ ok: true, data: list });
  } catch (err) {
    console.error('Error listando monitoreos:', err);
    res.status(500).json({ ok: false, error: 'MONITOREOS_LIST_FAILED' });
  }
});

// ========================================
// GET /api/monitoreos/:id → detalle (PROTEGIDO)
// ========================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const item = await Monitoreo.findByPk(id, {
      include: [{ model: Negociacion, attributes: ['id_negociacion', 'contrato', 'fecha_inicio'] }],
    });
    if (!item) return res.status(404).json({ ok: false, error: 'MONITOREO_NOT_FOUND' });

    res.json({ ok: true, data: item });
  } catch (err) {
    console.error('Error obteniendo monitoreo:', err);
    res.status(500).json({ ok: false, error: 'MONITOREO_DETAIL_FAILED' });
  }
});

// ========================================
// POST /api/monitoreos → crear (SOLO ADMIN)
// - fecha_inicio_monitoreo es OBLIGATORIA
// - comentarios se guarda EXACTAMENTE como lo escribe el admin
// ========================================
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_negociacion').isInt({ gt: 0 }).withMessage('id_negociacion debe ser entero positivo.'),
    body('fecha_inicio_monitoreo')
      .exists().withMessage('fecha_inicio_monitoreo es obligatoria.')
      .bail()
      .isISO8601().withMessage('fecha_inicio_monitoreo inválida (YYYY-MM-DD).'),
    body('comentarios').optional().isString(),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }

    try {
      const { id_negociacion, fecha_inicio_monitoreo, comentarios } = req.body;

      // Validar FK (no usamos su fecha, solo verificamos que exista)
      const neg = await Negociacion.findByPk(id_negociacion);
      if (!neg) return res.status(400).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });

      const creado = await Monitoreo.create({
        id_negociacion,
        fecha_inicio_monitoreo,
        comentarios: comentarios && comentarios.trim() ? comentarios : null,
      });

      res.status(201).json({ ok: true, data: creado });
    } catch (err) {
      console.error('Error creando monitoreo:', err);
      res.status(500).json({ ok: false, error: 'MONITOREO_CREATE_FAILED' });
    }
  }
);

// ========================================
// PUT /api/monitoreos/:id → actualizar (SOLO ADMIN)
// ========================================
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_negociacion').optional().isInt({ gt: 0 }),
    body('fecha_inicio_monitoreo').optional().custom((value) => {
      if (value === '' || value === null) {
        throw new Error('fecha_inicio_monitoreo no puede quedar vacía.');
      }
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof value !== 'undefined' && !isoRegex.test(value)) {
        throw new Error('fecha_inicio_monitoreo inválida (YYYY-MM-DD).');
      }
      return true;
    }),
    body('comentarios').optional().isString(),
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

      const item = await Monitoreo.findByPk(id);
      if (!item) return res.status(404).json({ ok: false, error: 'MONITOREO_NOT_FOUND' });

      if (typeof req.body.id_negociacion !== 'undefined') {
        const nuevaNeg = await Negociacion.findByPk(req.body.id_negociacion);
        if (!nuevaNeg) return res.status(400).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });
        item.id_negociacion = req.body.id_negociacion;
      }

      if (typeof req.body.fecha_inicio_monitoreo !== 'undefined') {
        item.fecha_inicio_monitoreo = req.body.fecha_inicio_monitoreo; // ya validada
      }

      if (typeof req.body.comentarios !== 'undefined') {
        item.comentarios = req.body.comentarios && req.body.comentarios.trim()
          ? req.body.comentarios
          : null;
      }

      await item.save();
      res.json({ ok: true, data: item });
    } catch (err) {
      console.error('Error actualizando monitoreo:', err);
      res.status(500).json({ ok: false, error: 'MONITOREO_UPDATE_FAILED' });
    }
  }
);

// ========================================
// DELETE /api/monitoreos/:id → eliminar (SOLO ADMIN)
// ========================================
router.delete('/:id', requireAuth, requireRoles(['Administrador']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const item = await Monitoreo.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: 'MONITOREO_NOT_FOUND' });

    await item.destroy();
    res.json({ ok: true, mensaje: 'Monitoreo eliminado correctamente.', id_monitoreo: id });
  } catch (err) {
    console.error('Error eliminando monitoreo:', err);
    res.status(500).json({ ok: false, error: 'MONITOREO_DELETE_FAILED' });
  }
});

module.exports = router;
