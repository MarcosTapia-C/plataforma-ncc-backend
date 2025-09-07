// src/rutas/mineras.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const requireAuth = require('../middlewares/requireAuth');        // export default → sin llaves
const { requireRoles } = require('../middlewares/requireRoles');  // export nombrado → con llaves

const { Minera, Empresa } = require('../modelos/asociaciones');

// ==============================
// GET /api/mineras → listar todas (PROTEGIDO)
// ==============================
router.get('/', requireAuth, async (_req, res) => {
  try {
    const mineras = await Minera.findAll({ order: [['id_minera', 'ASC']] });
    res.json({ ok: true, data: mineras });
  } catch (err) {
    console.error('Error listando mineras:', err);
    res.status(500).json({ ok: false, error: 'MINERAS_LIST_FAILED' });
  }
});

// ========================================
// GET /api/mineras/:id → obtener por ID (PROTEGIDO)
// ========================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const minera = await Minera.findByPk(id);
    if (!minera) {
      return res.status(404).json({ ok: false, error: 'MINERA_NOT_FOUND' });
    }
    res.json({ ok: true, data: minera });
  } catch (err) {
    console.error('Error obteniendo minera:', err);
    res.status(500).json({ ok: false, error: 'MINERA_DETAIL_FAILED' });
  }
});

// ========================================
// POST /api/mineras → crear (PROTEGIDO + SOLO ADMIN)
// ========================================
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('nombre_minera')
      .trim()
      .notEmpty().withMessage('El nombre de la minera es obligatorio.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.')
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }
    try {
      const { nombre_minera } = req.body;
      const nueva = await Minera.create({ nombre_minera });
      res.status(201).json({ ok: true, data: nueva });
    } catch (err) {
      console.error('Error creando minera:', err);
      res.status(500).json({ ok: false, error: 'MINERA_CREATE_FAILED' });
    }
  }
);

// ========================================
// PUT /api/mineras/:id → actualizar (PROTEGIDO + SOLO ADMIN)
// ========================================
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('nombre_minera')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede quedar vacío.')
      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.')
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

      const minera = await Minera.findByPk(id);
      if (!minera) return res.status(404).json({ ok: false, error: 'MINERA_NOT_FOUND' });

      const { nombre_minera } = req.body;
      if (typeof nombre_minera !== 'undefined') {
        minera.nombre_minera = nombre_minera;
      }

      await minera.save();
      res.json({ ok: true, data: minera });
    } catch (err) {
      console.error('Error actualizando minera:', err);
      res.status(500).json({ ok: false, error: 'MINERA_UPDATE_FAILED' });
    }
  }
);

// ========================================
// DELETE /api/mineras/:id → eliminar (PROTEGIDO + SOLO ADMIN)
// - bloquea si hay empresas asociadas
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

      const minera = await Minera.findByPk(id);
      if (!minera) return res.status(404).json({ ok: false, error: 'MINERA_NOT_FOUND' });

      // Evitar borrar si hay empresas que referencian esta minera
      const empresasAsociadas = await Empresa.count({ where: { id_minera: id } });
      if (empresasAsociadas > 0) {
        return res.status(409).json({
          ok: false,
          mensaje: 'No se puede eliminar: existen empresas asociadas a esta minera.'
        });
      }

      await minera.destroy();
      res.json({ ok: true, mensaje: 'Minera eliminada correctamente.', id_minera: id });
    } catch (err) {
      console.error('Error eliminando minera:', err);
      res.status(500).json({ ok: false, error: 'MINERA_DELETE_FAILED' });
    }
  }
);

module.exports = router;
