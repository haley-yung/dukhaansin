const { isAuthenticated } = require('../../_utils/auth');
const { getJSON, putJSON, listObjects, filterImages, deleteObjects, getOrCreateMeta, sortByOrder, isValidSlug } = require('../../_utils/r2');

module.exports = async (req, res) => {
  const { slug } = req.query;
  if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug' });
  if (req.method === 'GET') return handleGet(req, res, slug);
  if (req.method === 'PUT') return handleUpdate(req, res, slug);
  if (req.method === 'DELETE') return handleDelete(req, res, slug);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handleGet(req, res, slug) {
  const objects = await listObjects(`${slug}/`);
  const meta = await getOrCreateMeta(slug, objects);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const photos = filterImages(objects).map(o => o.Key.split('/').pop());
  sortByOrder(photos, meta.order);

  return res.json({ slug, ...meta, photos });
}

async function handleUpdate(req, res, slug) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const meta = await getJSON(`${slug}/meta.json`);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const { title, description } = req.body || {};
  if (title) meta.title = title;
  if (description !== undefined) meta.description = description;

  await putJSON(`${slug}/meta.json`, meta);
  return res.json({ slug, ...meta });
}

async function handleDelete(req, res, slug) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const objects = await listObjects(`${slug}/`);
  if (!objects.length) return res.status(404).json({ error: 'Album not found' });

  await deleteObjects(objects.map(o => o.Key));
  return res.json({ ok: true });
}
