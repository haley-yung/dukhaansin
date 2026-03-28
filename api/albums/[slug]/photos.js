const { isAuthenticated } = require('../../_utils/auth');
const { getJSON, listObjects, getPresignedUploadUrl, getOrCreateMeta } = require('../../_utils/r2');

module.exports = async (req, res) => {
  const { slug } = req.query;

  if (req.method === 'GET') return handleGet(req, res, slug);
  if (req.method === 'POST') return handleUploadUrls(req, res, slug);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handleGet(req, res, slug) {
  const meta = await getOrCreateMeta(slug);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const objects = await listObjects(`${slug}/`);
  const photos = objects
    .filter(o => !o.Key.endsWith('/meta.json') && /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(o.Key))
    .map(o => {
      const filename = o.Key.split('/').pop();
      return { filename, key: o.Key };
    });

  if (meta.order && meta.order.length) {
    photos.sort((a, b) => {
      const ia = meta.order.indexOf(a.filename);
      const ib = meta.order.indexOf(b.filename);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  const r2Url = process.env.R2_PUBLIC_URL;
  return res.json(photos.map(p => ({
    filename: p.filename,
    src: `${r2Url}/${p.key}`,
    isCover: meta.cover === p.filename,
  })));
}

// Returns presigned upload URLs for direct-to-R2 upload
async function handleUploadUrls(req, res, slug) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const meta = await getOrCreateMeta(slug);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const { files } = req.body || {};
  if (!files || !Array.isArray(files) || !files.length) {
    return res.status(400).json({ error: 'files array required (each with name and contentType)' });
  }

  // Find highest existing image number
  const objects = await listObjects(`${slug}/`);
  const existingNums = objects
    .map(o => o.Key.split('/').pop())
    .filter(f => /^img_\d+\.\w+$/.test(f))
    .map(f => parseInt(f.match(/^img_(\d+)/)[1], 10));

  let nextNum = existingNums.length ? Math.max(...existingNums) + 1 : 1;

  const uploads = [];
  for (const file of files) {
    const ext = (file.name || 'image.jpg').split('.').pop().toLowerCase();
    const filename = `img_${String(nextNum).padStart(3, '0')}.${ext}`;
    const key = `${slug}/${filename}`;
    const url = await getPresignedUploadUrl(key, file.contentType || 'image/jpeg');
    uploads.push({ filename, key, uploadUrl: url });
    nextNum++;
  }

  return res.json({ uploads });
}
