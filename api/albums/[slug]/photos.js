const { isAuthenticated } = require('../../_utils/auth');
const { listObjects, filterImages, getPresignedUploadUrl, getOrCreateMeta, getNextImageNumber, sortByOrder, isValidSlug } = require('../../_utils/r2');

module.exports = async (req, res) => {
  const { slug } = req.query;
  if (!isValidSlug(slug)) return res.status(400).json({ error: 'Invalid slug' });
  if (req.method === 'GET') return handleGet(req, res, slug);
  if (req.method === 'POST') return handleUploadUrls(req, res, slug);
  return res.status(405).json({ error: 'Method not allowed' });
};

async function handleGet(req, res, slug) {
  const objects = await listObjects(`${slug}/`);
  const meta = await getOrCreateMeta(slug, objects);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const photos = filterImages(objects).map(o => {
    const filename = o.Key.split('/').pop();
    return { filename, key: o.Key };
  });

  sortByOrder(photos, meta.order, p => p.filename);

  const r2Url = process.env.R2_PUBLIC_URL;
  return res.json(photos.map(p => ({
    filename: p.filename,
    src: `${r2Url}/${p.key}`,
    isCover: meta.cover === p.filename,
  })));
}

async function handleUploadUrls(req, res, slug) {
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const objects = await listObjects(`${slug}/`);
  const meta = await getOrCreateMeta(slug, objects);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const { files } = req.body || {};
  if (!files || !Array.isArray(files) || !files.length) {
    return res.status(400).json({ error: 'files array required' });
  }

  let nextNum = getNextImageNumber(objects);
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
