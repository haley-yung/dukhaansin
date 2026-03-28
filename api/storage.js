const { isAuthenticated } = require('./_utils/auth');
const { listObjects } = require('./_utils/r2');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const objects = await listObjects('');
  const totalBytes = objects.reduce((sum, o) => sum + (o.Size || 0), 0);
  const limitBytes = 10 * 1024 * 1024 * 1024; // 10 GB
  const percentage = Math.round((totalBytes / limitBytes) * 1000) / 10; // one decimal

  return res.json({ totalBytes, limitBytes, percentage });
};
