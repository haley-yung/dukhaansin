const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { isAuthenticated } = require('../../_utils/auth');
const { listObjects, getOrCreateMeta } = require('../../_utils/r2');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME;

// Vercel serverless: disable body parsing so we get the raw buffer
module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { slug } = req.query;

  const meta = await getOrCreateMeta(slug);
  if (!meta) return res.status(404).json({ error: 'Album not found' });

  const contentType = req.headers['content-type'] || 'image/jpeg';
  const ext = req.headers['x-file-ext'] || 'jpg';

  // Find highest existing image number
  const objects = await listObjects(`${slug}/`);
  const existingNums = objects
    .map(o => o.Key.split('/').pop())
    .filter(f => /^img_\d+\.\w+$/.test(f))
    .map(f => parseInt(f.match(/^img_(\d+)/)[1], 10));

  const nextNum = existingNums.length ? Math.max(...existingNums) + 1 : 1;
  const filename = `img_${String(nextNum).padStart(3, '0')}.${ext}`;
  const key = `${slug}/${filename}`;

  // Read raw body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return res.json({ filename, key });
};
