const { isAuthenticated } = require('../../_utils/auth');
const { getJSON, putJSON, isValidSlug } = require('../../_utils/r2');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query;
  if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug' });
  const { cover } = req.body || {};

  if (!cover) return res.status(400).json({ error: 'cover filename required' });

  const meta = await getJSON(`${slug}/meta.json`);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  meta.cover = cover;
  await putJSON(`${slug}/meta.json`, meta);
  return res.json({ ok: true });
};
