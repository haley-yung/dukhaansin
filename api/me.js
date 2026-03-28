const { isAuthenticated } = require('./_utils/auth');

module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = isAuthenticated(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({ role: user.role });
};
