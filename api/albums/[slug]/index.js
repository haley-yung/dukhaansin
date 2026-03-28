const { isAuthenticated } = require('../../_utils/auth');
const { getJSON, putJSON, listObjects, deleteObjects, getOrCreateMeta } = require('../../_utils/r2');

module.exports = async (req, res) => {
  const { slug } = req.query;

  if (req.method === 'GET') return handleGet(req, res, slug);
  if (req.method === 'PUT') return handleUpdate(req, res, slug);
  if (req.method === 'DELETE') return handleDelete(req, res, slug);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handleGet(req, res, slug) {
  const meta = await getOrCreateMeta(slug);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const objects = await listObjects(`${slug}/`);
  const photos = objects
    .map(o => o.Key)
    .filter(k => !k.endsWith('/meta.json') && /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(k))
    .map(k => k.split('/').pop());

  if (meta.order && meta.order.length) {
    photos.sort((a, b) => {
      const ia = meta.order.indexOf(a);
      const ib = meta.order.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

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
