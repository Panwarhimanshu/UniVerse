import crypto from 'node:crypto';

/*
  Cloudinary for profile photos. Set CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
  (Cloudinary dashboard → API Keys). Without it, photos are stored in MongoDB as before.
  Photos are saved as full https URLs; clients use the URL as it is.
*/

const creds = () => {
  const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec((process.env.CLOUDINARY_URL ?? '').trim());
  return m ? { key: m[1], secret: m[2], cloud: m[3] } : null;
};
export const cloudinaryReady = () => !!creds();

const sign = (params: Record<string, string | number>, secret: string) =>
  crypto.createHash('sha1')
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&') + secret)
    .digest('hex');

/** Uploads an image and returns a delivery URL that crops to a square around the face and compresses. */
export async function uploadImage(buffer: Buffer, mime: string, folder: string) {
  const c = creds();
  if (!c) throw new Error('Cloudinary is not configured');
  const params = { folder, timestamp: Math.floor(Date.now() / 1000) };
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mime }));
  form.append('api_key', c.key);
  form.append('folder', folder);
  form.append('timestamp', String(params.timestamp));
  form.append('signature', sign(params, c.secret));
  const r = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.secure_url) throw new Error(data?.error?.message ?? `Cloudinary upload failed (${r.status})`);
  return String(data.secure_url).replace('/image/upload/', '/image/upload/c_fill,g_face,w_400,h_400,q_auto,f_auto/');
}

/** Deletes an image we uploaded, given its delivery URL. Never throws. */
export async function deleteImage(url: string) {
  const c = creds();
  const m = /\/image\/upload\/(?:[^/]+\/)*?v\d+\/(.+)\.[a-z0-9]+$/i.exec(url);
  if (!c || !m) return;
  const params = { public_id: m[1], timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams({ public_id: params.public_id, timestamp: String(params.timestamp), api_key: c.key, signature: sign(params, c.secret) });
  await fetch(`https://api.cloudinary.com/v1_1/${c.cloud}/image/destroy`, { method: 'POST', body, signal: AbortSignal.timeout(10000) }).catch(() => {});
}
