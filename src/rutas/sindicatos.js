// src/rutas/sindicatos.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const requireAuth = require('../middlewares/requireAuth');        // default export
const { requireRoles } = require('../middlewares/requireRoles');  // named export

// 👇 IMPORTA TAMBIÉN Negociacion para validar dependencias
const { Sindicato, Negociacion } = require('../modelos/asociaciones');

// ==============================
// GET /api/sindicatos → listar (PROTEGIDO)
// ==============================
router.get('/', requireAuth, async (_req, res) => {
  try {
    const sindicatos = await Sindicato.findAll({ order: [['id_sindicato', 'ASC']] });
    res.json({ ok: true, data: sindicatos });
  } catch (err) {
    console.error('Error listando sindicatos:', err);
    res.status(500).json({ ok: false, error: 'SINDICATOS_LIST_FAILED' });
  }
});

// ========================================
// GET /api/sindicatos/:id → detalle (PROTEGIDO)
// ========================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const sindicato = await Sindicato.findByPk(id);
    if (!sindicato) return res.status(404).json({ ok: false, error: 'SINDICATO_NOT_FOUND' });

    res.json({ ok: true, data: sindicato });
  } catch (err) {
    console.error('Error obteniendo sindicato:', err);
    res.status(500).json({ ok: false, error: 'SINDICATO_DETAIL_FAILED' });
  }
});

// ========================================
// POST /api/sindicatos → crear (PROTEGIDO + SOLO ADMIN)
// ========================================
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('nombre_sindicato')
      .trim()
      .notEmpty().withMessage('El nombre del sindicato es obligatorio.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
    body('federacion').optional().trim().isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
    body('tipo_sindicato').optional().trim().isLength({ max: 50 }).withMessage('Máximo 50 caracteres.'),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }
    try {
      const creado = await Sindicato.create(req.body);
      res.status(201).json({ ok: true, data: creado });
    } catch (err) {
      console.error('Error creando sindicato:', err);
      res.status(500).json({ ok: false, error: 'SINDICATO_CREATE_FAILED' });
    }
  }
);

// ========================================
// PUT /api/sindicatos/:id → actualizar (PROTEGIDO + SOLO ADMIN)
// ========================================
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('nombre_sindicato').optional().trim().notEmpty().isLength({ max: 100 }),
    body('federacion').optional().trim().isLength({ max: 100 }),
    body('tipo_sindicato').optional().trim().isLength({ max: 50 }),
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

      const sindicato = await Sindicato.findByPk(id);
      if (!sindicato) return res.status(404).json({ ok: false, error: 'SINDICATO_NOT_FOUND' });

      await sindicato.update(req.body);
      res.json({ ok: true, data: sindicato });
    } catch (err) {
      console.error('Error actualizando sindicato:', err);
      res.status(500).json({ ok: false, error: 'SINDICATO_UPDATE_FAILED' });
    }
  }
);

// ========================================
// DELETE /api/sindicatos/:id → eliminar (PROTEGIDO + SOLO ADMIN)
//  ⛔ Bloquea si hay negociaciones asociadas
// ========================================
router.delete('/:id', requireAuth, requireRoles(['Administrador']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const sindicato = await Sindicato.findByPk(id);
    if (!sindicato) return res.status(404).json({ ok: false, error: 'SINDICATO_NOT_FOUND' });

    // 🔒 Validación de integridad: ¿hay negociaciones que usan este sindicato?
    const enUso = await Negociacion.count({ where: { id_sindicato: id } });
    if (enUso > 0) {
      return res.status(409).json({
        ok: false,
        error: 'SINDICATO_IN_USE',
        mensaje: 'No se puede eliminar: existen negociaciones asociadas a este sindicato.',
        dependencias: enUso,
      });
    }

    await sindicato.destroy();
    res.json({ ok: true, mensaje: 'Sindicato eliminado correctamente.', id_sindicato: id });
  } catch (err) {
    console.error('Error eliminando sindicato:', err);
    res.status(500).json({ ok: false, error: 'SINDICATO_DELETE_FAILED' });
  }
});

module.exports = router;

