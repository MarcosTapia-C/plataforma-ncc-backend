// src/middlewares/requireAuth.js
const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  // se guarda en req.user la info del token (uid, usuario, rolId, iat, exp)
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: 'Token no provisto.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { uid, usuario, rolId, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado.' });
  }
};

