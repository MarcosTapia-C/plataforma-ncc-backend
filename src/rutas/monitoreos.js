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
//  - Si no viene fecha_inicio_monitoreo, se usa la fecha_inicio de la negociación
// ========================================
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_negociacion').isInt({ gt: 0 }).withMessage('id_negociacion debe ser entero positivo.'),
    body('fecha_inicio_monitoreo').optional().isISO8601().withMessage('Fecha inválida (YYYY-MM-DD).'),
    body('comentarios').optional().isString(),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }
    try {
      const { id_negociacion, fecha_inicio_monitoreo, comentarios } = req.body;

      // Validar FK y obtener fecha de la negociación
      const neg = await Negociacion.findByPk(id_negociacion);
      if (!neg) return res.status(400).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });

      const fechaFinal = fecha_inicio_monitoreo ? fecha_inicio_monitoreo : neg.fecha_inicio;

      const creado = await Monitoreo.create({
        id_negociacion,
        fecha_inicio_monitoreo: fechaFinal,
        comentarios,
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
//  - Si el admin borra la fecha (null o ""), se vuelve a usar la fecha de la negociación
// ========================================
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_negociacion').optional().isInt({ gt: 0 }),
    body('fecha_inicio_monitoreo').optional({ nullable: true }).custom((value) => {
      // permitir "", null o fecha ISO
      if (value === '' || value === null) return true;
      // si no es vacío, validar ISO
      const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!isoRegex.test(value)) throw new Error('Fecha inválida (YYYY-MM-DD).');
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

      const item = await Monitoreo.findByPk(id, {
        include: [{ model: Negociacion, attributes: ['id_negociacion', 'fecha_inicio'] }],
      });
      if (!item) return res.status(404).json({ ok: false, error: 'MONITOREO_NOT_FOUND' });

      // Si cambia la negociación, validar y mover la FK
      if (typeof req.body.id_negociacion !== 'undefined') {
        const nuevaNeg = await Negociacion.findByPk(req.body.id_negociacion);
        if (!nuevaNeg) return res.status(400).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });
        item.id_negociacion = req.body.id_negociacion;

        // Si el admin dejó la fecha vacía, re-default con la nueva negociación
        if (req.body.fecha_inicio_monitoreo === '' || req.body.fecha_inicio_monitoreo === null) {
          item.fecha_inicio_monitoreo = nuevaNeg.fecha_inicio;
        }
      }

      // Manejo de fecha según intención
      if (typeof req.body.fecha_inicio_monitoreo !== 'undefined') {
        if (req.body.fecha_inicio_monitoreo === '' || req.body.fecha_inicio_monitoreo === null) {
          // volver al valor por defecto (fecha de la negociación actual)
          // usamos la negociación actual (ya actualizada si correspondía arriba)
          if (!item.Negociacion) {
            // si no vino incluida, la buscamos
            const neg = await Negociacion.findByPk(item.id_negociacion);
            item.fecha_inicio_monitoreo = neg ? neg.fecha_inicio : null;
          } else {
            item.fecha_inicio_monitoreo = item.Negociacion.fecha_inicio;
          }
        } else {
          // establecer la fecha custom del admin
          item.fecha_inicio_monitoreo = req.body.fecha_inicio_monitoreo;
        }
      }

      if (typeof req.body.comentarios !== 'undefined') {
        item.comentarios = req.body.comentarios;
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

