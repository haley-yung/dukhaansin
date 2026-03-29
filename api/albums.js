const { isAuthenticated } = require('./_utils/auth');
const { listObjects, filterImages, getJSON, putJSON, getOrCreateMeta } = require('./_utils/r2');

module.exports = async (req, res) => {
  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handleList(req, res) {
  const allObjects = await listObjects('');

  // Discover unique album slugs from folder prefixes
  const slugSet = new Set();
  for (const o of allObjects) {
    const slash = o.Key.indexOf('/');
    if (slash > 0) slugSet.add(o.Key.slice(0, slash));
  }

  const r2Url = process.env.R2_PUBLIC_URL;
  const albums = [];

  for (const slug of slugSet) {
    const prefix = slug + '/';
    const slugObjects = allObjects.filter(o => o.Key.startsWith(prefix));
    const meta = await getOrCreateMeta(slug, slugObjects);
    if (!meta) continue;

    const photoCount = filterImages(slugObjects).length;
    const coverUrl = meta.cover ? `${r2Url}/${slug}/${meta.cover}` : null;
    albums.push({ slug, ...meta, photoCount, coverUrl });
  }

  albums.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(albums);
}

async function handleCreate(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await getJSON(`${slug}/meta.json`);
  if (existing) return res.status(409).json({ error: 'Album already exists' });

  const meta = { title, description: description || '', order: [], cover: null, createdAt: new Date().toISOString() };
  await putJSON(`${slug}/meta.json`, meta);
  return res.status(201).json({ slug, ...meta });
}
