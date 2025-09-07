// src/rutas/negociaciones.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const requireAuth = require('../middlewares/requireAuth');
const { requireRoles } = require('../middlewares/requireRoles');

const { Negociacion, Empresa, Sindicato, Minera } = require('../modelos/asociaciones');

// Reutilizamos el mismo include en todos los endpoints que devuelven negociaciones
const NEGOC_INCLUDES = [
  {
    model: Empresa,
    attributes: ['id_empresa', 'nombre_empresa', 'rut_empresa'],
    include: [{ model: Minera, attributes: ['id_minera', 'nombre_minera'] }],
  },
  { model: Sindicato, attributes: ['id_sindicato', 'nombre_sindicato'] },
];

// ---------- Helpers de validación/calculo ----------
function toDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function calcularPersonalDesdePorcentaje(dot, porc) {
  // Redondeo al entero más cercano
  return Math.round((Number(dot) * Number(porc)) / 100);
}

function calcularPorcentajeDesdePersonal(dot, pers) {
  if (!dot || Number(dot) === 0) return 0;
  const v = (Number(pers) / Number(dot)) * 100;
  // 2 decimales
  return Math.round(v * 100) / 100;
}

function validarReglasNegocio(body) {
  const {
    fecha_inicio,
    fecha_termino,
    vencimiento_contrato_comercial,
    dotacion_total,
    personal_sindicalizado,
    porcentaje_sindicalizado,
  } = body;

  // --- Reglas de FECHAS ---
  const dIni = toDate(fecha_inicio);
  const dFin = toDate(fecha_termino);
  const dVig = toDate(vencimiento_contrato_comercial);

  // término >= inicio
  if (dIni && dFin && dFin < dIni) {
    return 'La fecha de término no puede ser anterior a la fecha de inicio.';
  }
  // término <= vigencia contrato
  if (dFin && dVig && dFin > dVig) {
    return 'La fecha de término no puede ser posterior a la vigencia del contrato comercial.';
  }

  // --- Reglas de NÚMEROS ---
  const dot = (dotacion_total ?? '') === '' ? null : Number(dotacion_total);
  const pers = (personal_sindicalizado ?? '') === '' ? null : Number(personal_sindicalizado);
  const porc = (porcentaje_sindicalizado ?? '') === '' ? null : Number(porcentaje_sindicalizado);

  if (dot !== null && dot < 0) return 'La dotación total debe ser mayor o igual a 0.';
  if (pers !== null && pers < 0) return 'El personal sindicalizado debe ser mayor o igual a 0.';
  if (porc !== null && (porc < 0 || porc > 100))
    return 'El porcentaje sindicalizado debe estar entre 0 y 100.';

  // personal <= dotación
  if (dot !== null && pers !== null && pers > dot) {
    return 'El personal sindicalizado no puede ser mayor que la dotación total.';
  }

  // Si dotación y porcentaje llegan, y personal no, lo calculamos
  if (dot !== null && porc !== null && pers === null) {
    body.personal_sindicalizado = calcularPersonalDesdePorcentaje(dot, porc);
  }

  // Si dotación y personal llegan, y porcentaje no, lo calculamos
  if (dot !== null && pers !== null && porc === null) {
    body.porcentaje_sindicalizado = calcularPorcentajeDesdePersonal(dot, pers);
  }

  // Si llegan los tres (dot, pers, porc), validamos consistencia básica
  if (dot !== null && pers !== null && porc !== null) {
    const esperado = calcularPersonalDesdePorcentaje(dot, porc);
    if (esperado !== pers) {
      return 'Los valores de dotación, personal sindicalizado y porcentaje no son consistentes.';
    }
  }

  return null; // ok
}

// ==============================
// GET /api/negociaciones → listar (PROTEGIDO)
// ==============================
router.get('/', requireAuth, async (_req, res) => {
  try {
    const list = await Negociacion.findAll({
      include: NEGOC_INCLUDES,
      order: [['id_negociacion', 'ASC']],
    });
    res.json({ ok: true, data: list });
  } catch (err) {
    console.error('Error listando negociaciones:', err);
    res.status(500).json({ ok: false, error: 'NEGOCIACIONES_LIST_FAILED' });
  }
});

// ========================================
// GET /api/negociaciones/:id → detalle (PROTEGIDO)
// ========================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const item = await Negociacion.findByPk(id, { include: NEGOC_INCLUDES });
    if (!item) return res.status(404).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });

    res.json({ ok: true, data: item });
  } catch (err) {
    console.error('Error obteniendo negociación:', err);
    res.status(500).json({ ok: false, error: 'NEGOCIACION_DETAIL_FAILED' });
  }
});

// ========================================
// POST /api/negociaciones → crear (SOLO ADMIN)
// ========================================
router.post(
  '/',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_empresa').isInt({ gt: 0 }).withMessage('id_empresa debe ser entero positivo.'),
    body('id_sindicato').isInt({ gt: 0 }).withMessage('id_sindicato debe ser entero positivo.'),
    body('contrato').trim().notEmpty().isLength({ max: 100 }).withMessage('Máx 100 caracteres.'),
    body('estado').optional().trim().isLength({ max: 50 }).withMessage('Máx 50 caracteres.'),
    body('fecha_inicio').optional().isISO8601().withMessage('fecha_inicio inválida (YYYY-MM-DD).'),
    body('fecha_termino').optional().isISO8601().withMessage('fecha_termino inválida (YYYY-MM-DD).'),
    body('vencimiento_contrato_comercial').optional().isISO8601()
      .withMessage('vencimiento_contrato_comercial inválida (YYYY-MM-DD).'),
    body('dotacion_total').optional().isInt({ min: 0 }).withMessage('dotacion_total debe ser >= 0.'),
    body('personal_sindicalizado').optional().isInt({ min: 0 }).withMessage('personal_sindicalizado debe ser >= 0.'),
    body('porcentaje_sindicalizado').optional().isFloat({ min: 0, max: 100 })
      .withMessage('porcentaje_sindicalizado debe estar entre 0 y 100.'),
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ ok: false, errores: errores.array() });
    }

    try {
      // Validación FKs
      const { id_empresa, id_sindicato } = req.body;
      const empresa = await Empresa.findByPk(id_empresa);
      if (!empresa) return res.status(400).json({ ok: false, error: 'EMPRESA_NOT_FOUND' });
      const sindicato = await Sindicato.findByPk(id_sindicato);
      if (!sindicato) return res.status(400).json({ ok: false, error: 'SINDICATO_NOT_FOUND' });

      // Reglas de negocio adicionales + autocalculo
      const msg = validarReglasNegocio(req.body);
      if (msg) return res.status(400).json({ ok: false, mensaje: msg });

      const creado = await Negociacion.create(req.body);
      const creadoFull = await Negociacion.findByPk(creado.id_negociacion, { include: NEGOC_INCLUDES });
      res.status(201).json({ ok: true, data: creadoFull });
    } catch (err) {
      console.error('Error creando negociación:', err);
      res.status(500).json({ ok: false, error: 'NEGOCIACION_CREATE_FAILED' });
    }
  }
);

// ========================================
// PUT /api/negociaciones/:id → actualizar (SOLO ADMIN)
// ========================================
router.put(
  '/:id',
  requireAuth,
  requireRoles(['Administrador']),
  [
    body('id_empresa').optional().isInt({ gt: 0 }),
    body('id_sindicato').optional().isInt({ gt: 0 }),
    body('contrato').optional().trim().notEmpty().isLength({ max: 100 }),
    body('estado').optional().trim().isLength({ max: 50 }),
    body('fecha_inicio').optional().isISO8601(),
    body('fecha_termino').optional().isISO8601(),
    body('vencimiento_contrato_comercial').optional().isISO8601(),
    body('dotacion_total').optional().isInt({ min: 0 }),
    body('personal_sindicalizado').optional().isInt({ min: 0 }),
    body('porcentaje_sindicalizado').optional().isFloat({ min: 0, max: 100 }),
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

      const item = await Negociacion.findByPk(id);
      if (!item) return res.status(404).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });

      const { id_empresa, id_sindicato } = req.body;

      // Validar FKs si llegan
      if (typeof id_empresa !== 'undefined') {
        const empresa = await Empresa.findByPk(id_empresa);
        if (!empresa) return res.status(400).json({ ok: false, error: 'EMPRESA_NOT_FOUND' });
      }
      if (typeof id_sindicato !== 'undefined') {
        const sindicato = await Sindicato.findByPk(id_sindicato);
        if (!sindicato) return res.status(400).json({ ok: false, error: 'SINDICATO_NOT_FOUND' });
      }

      // Aplicar reglas de negocio + autocalculo (sobre la mezcla de item + body)
      const body = { ...item.toJSON(), ...req.body };
      const msg = validarReglasNegocio(body);
      if (msg) return res.status(400).json({ ok: false, mensaje: msg });

      // Guardar cambios
      Object.assign(item, req.body, {
        personal_sindicalizado: body.personal_sindicalizado,
        porcentaje_sindicalizado: body.porcentaje_sindicalizado,
      });
      await item.save();

      const actualizado = await Negociacion.findByPk(item.id_negociacion, { include: NEGOC_INCLUDES });
      res.json({ ok: true, data: actualizado });
    } catch (err) {
      console.error('Error actualizando negociación:', err);
      res.status(500).json({ ok: false, error: 'NEGOCIACION_UPDATE_FAILED' });
    }
  }
);

// ========================================
// DELETE /api/negociaciones/:id → eliminar (SOLO ADMIN)
// ========================================
router.delete('/:id', requireAuth, requireRoles(['Administrador']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'ID_INVALIDO' });
    }

    const item = await Negociacion.findByPk(id);
    if (!item) return res.status(404).json({ ok: false, error: 'NEGOCIACION_NOT_FOUND' });

    await item.destroy();
    res.json({ ok: true, mensaje: 'Negociación eliminada correctamente.', id_negociacion: id });
  } catch (err) {
    console.error('Error eliminando negociación:', err);
    res.status(500).json({ ok: false, error: 'NEGOCIACION_DELETE_FAILED' });
  }
});

module.exports = router;


