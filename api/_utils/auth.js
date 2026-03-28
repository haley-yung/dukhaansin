const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Hysh1324@', 10);

function createToken() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function isAuthenticated(/* req */) {
  // Auth disabled — everyone has admin access
  return { role: 'admin' };
}

async function checkPassword(password) {
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

module.exports = { createToken, isAuthenticated, checkPassword, ADMIN_USERNAME };
