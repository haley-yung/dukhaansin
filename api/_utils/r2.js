const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const IMAGE_RE = /\.(jpg|jpeg|png|gif|webp|avif)$/i;

async function getJSON(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return JSON.parse(await res.Body.transformToString());
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

async function putJSON(key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }));
}

async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function deleteObjects(keys) {
  await Promise.all(keys.map(key => deleteObject(key)));
}

async function listObjects(prefix) {
  const items = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, ContinuationToken: token,
    }));
    if (res.Contents) items.push(...res.Contents);
    token = res.NextContinuationToken;
  } while (token);
  return items;
}

function filterImages(objects) {
  return objects.filter(o => !o.Key.endsWith('/meta.json') && IMAGE_RE.test(o.Key));
}

async function getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
  return getSignedUrl(s3, new PutObjectCommand({
    Bucket: BUCKET, Key: key, ContentType: contentType,
  }), { expiresIn });
}

// Returns the next sequential image number for a slug, given its existing objects
function getNextImageNumber(objects) {
  const nums = objects
    .map(o => o.Key.split('/').pop())
    .filter(f => /^img_\d+\.\w+$/.test(f))
    .map(f => parseInt(f.match(/^img_(\d+)/)[1], 10));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

// Get or auto-create meta.json for a slug. Pass pre-fetched objects to avoid redundant listing.
async function getOrCreateMeta(slug, objects) {
  if (!objects) objects = await listObjects(`${slug}/`);
  const meta = await getJSON(`${slug}/meta.json`);
  const images = filterImages(objects);

  if (meta && meta.order?.length && meta.cover) return meta;
  if (!images.length) return meta || null;

  const filenames = images.map(o => o.Key.split('/').pop());
  if (meta) {
    if (!meta.order?.length) meta.order = filenames;
    if (!meta.cover) meta.cover = filenames[0];
    await putJSON(`${slug}/meta.json`, meta);
    return meta;
  }

  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const newMeta = { title, description: '', order: filenames, cover: filenames[0], createdAt: new Date().toISOString() };
  await putJSON(`${slug}/meta.json`, newMeta);
  return newMeta;
}

function sortByOrder(items, order, keyFn = x => x) {
  if (!order?.length) return items;
  items.sort((a, b) => {
    const ia = order.indexOf(keyFn(a));
    const ib = order.indexOf(keyFn(b));
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return items;
}

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
function isValidSlug(slug) {
  return slug && SAFE_SLUG_RE.test(slug) && !slug.includes('..');
}

module.exports = {
  getJSON, putJSON, deleteObject, deleteObjects,
  listObjects, filterImages, getPresignedUploadUrl,
  getNextImageNumber, getOrCreateMeta, sortByOrder, isValidSlug, IMAGE_RE,
};
