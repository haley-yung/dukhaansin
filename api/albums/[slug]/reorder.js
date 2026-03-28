const { isAuthenticated } = require('../../_utils/auth');
const { getJSON, putJSON } = require('../../_utils/r2');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query;
  const { order } = req.body || {};

  if (!order || !Array.isArray(order)) {
    return res.status(400).json({ error: 'order array required' });
  }

  const meta = await getJSON(`${slug}/meta.json`);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  meta.order = order;
  await putJSON(`${slug}/meta.json`, meta);
  return res.json({ ok: true });
};
