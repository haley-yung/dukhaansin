const { isAuthenticated } = require('../../../_utils/auth');
const { getJSON, putJSON, deleteObject, isValidSlug } = require('../../../_utils/r2');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { slug, filename } = req.query;
  if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug' });

  const meta = await getJSON(`${slug}/meta.json`);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  await deleteObject(`${slug}/${filename}`);

  meta.order = (meta.order || []).filter(f => f !== filename);

  if (meta.cover === filename) {
    meta.cover = meta.order.length ? meta.order[0] : null;
  }

  await putJSON(`${slug}/meta.json`, meta);
  return res.json({ ok: true });
};
