// src/rutas/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// IMPORTA Usuario desde asociaciones
const { Usuario } = require('../modelos/asociaciones');

router.post(
  '/login',
  [
    body('identificador').trim().notEmpty().withMessage('El identificador (usuario o email) es obligatorio.'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria.')
  ],
  async (req, res) => {
    try {
      const errores = validationResult(req);
      if (!errores.isEmpty()) {
        return res.status(400).json({ ok: false, errores: errores.array() });
      }

      const { identificador, password } = req.body;

      const user = await Usuario.findOne({
        where: { [Op.or]: [{ usuario: identificador }, { email: identificador }] }
      });
      if (!user) return res.status(400).json({ ok: false, mensaje: 'Credenciales inválidas.' });

      const ok = await bcrypt.compare(password, user.contrasena);
      if (!ok) return res.status(400).json({ ok: false, mensaje: 'Credenciales inválidas.' });

      const payload = { uid: user.id_usuario, usuario: user.usuario, rolId: user.id_rol };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '8h' });

      const data = user.toJSON();
      delete data['contrasena'];
      return res.json({ ok: true, token, usuario: data });
    } catch (err) {
      console.error('Error en /login:', err);
      return res.status(500).json({ ok: false, mensaje: 'Error interno.' });
    }
  }
);

module.exports = router;



