const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'change-me', 10);

function createToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

function isAuthenticated(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)token=([^\s;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], JWT_SECRET); } catch { return null; }
}

async function checkPassword(password) {
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

module.exports = { createToken, isAuthenticated, checkPassword, ADMIN_USERNAME };
