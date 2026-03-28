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

async function getJSON(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body.transformToString();
    return JSON.parse(body);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

async function putJSON(key, data) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }));
}

async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

async function listObjects(prefix) {
  const items = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
    }));
    if (res.Contents) items.push(...res.Contents);
    token = res.NextContinuationToken;
  } while (token);
  return items;
}

async function getPresignedUploadUrl(key, contentType, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

async function deleteObjects(keys) {
  await Promise.all(keys.map(key => deleteObject(key)));
}

// Auto-create or repair meta.json for a folder
async function getOrCreateMeta(slug) {
  const meta = await getJSON(`${slug}/meta.json`);

  // Check if folder has any image files
  const objects = await listObjects(`${slug}/`);
  const images = objects.filter(o =>
    !o.Key.endsWith('/meta.json') && /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(o.Key)
  );

  // If meta exists and has order/cover, return as-is
  if (meta && meta.order && meta.order.length && meta.cover) return meta;

  // No images at all — nothing to show
  if (!images.length) return meta || null;

  const filenames = images.map(o => o.Key.split('/').pop());

  if (meta) {
    // Repair existing meta: fill in missing order/cover from actual images
    if (!meta.order || !meta.order.length) meta.order = filenames;
    if (!meta.cover) meta.cover = filenames[0];
    await putJSON(`${slug}/meta.json`, meta);
    return meta;
  }

  // Create new meta.json from the folder name and existing images
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const newMeta = {
    title,
    description: '',
    order: filenames,
    cover: filenames[0] || null,
    createdAt: new Date().toISOString(),
  };
  await putJSON(`${slug}/meta.json`, newMeta);
  return newMeta;
}

module.exports = { getJSON, putJSON, deleteObject, listObjects, getPresignedUploadUrl, deleteObjects, getOrCreateMeta };
