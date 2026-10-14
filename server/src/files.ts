import path from 'node:path';
import mongoose, { mongo } from 'mongoose';
import type { Response } from 'express';
import { HttpError } from './middleware/auth.js';

/* Uploaded documents live in MongoDB (GridFS), so they survive restarts and work on serverless hosting. */

/** Vercel caps request bodies at 4.5 MB, so uploads stay under that everywhere. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/* Case documents and profile photos live in separate buckets, so photos can be served publicly without exposing documents. */
type Bucket = 'uploads' | 'avatars';
const bucket = (name: Bucket = 'uploads') => new mongo.GridFSBucket(mongoose.connection.db!, { bucketName: name });

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function saveFile(buffer: Buffer, name: string, contentType: string, store: Bucket = 'uploads') {
  const stream = bucket(store).openUploadStream(name, { metadata: { contentType } });
  await new Promise<void>((resolve, reject) => {
    stream.once('finish', () => resolve());
    stream.once('error', reject);
    stream.end(buffer);
  });
  return String(stream.id);
}

export async function deleteFile(id: string, store: Bucket = 'uploads') {
  if (!mongo.ObjectId.isValid(id)) return;
  try {
    await bucket(store).delete(new mongo.ObjectId(id));
  } catch {
    /* already gone */
  }
}

/** Sends a stored upload as a download, keeping the original extension in the file name. */
export async function sendDocFile(res: Response, id: string, label: string) {
  if (!mongo.ObjectId.isValid(id)) throw new HttpError(404, 'File not found');
  const [file] = await bucket().find({ _id: new mongo.ObjectId(id) }).toArray();
  if (!file) throw new HttpError(404, 'File not found');
  const ext = path.extname(file.filename);
  const name = (label.toLowerCase().endsWith(ext.toLowerCase()) ? label : label + ext).replace(/[^\w.\- ]+/g, '_');
  res.setHeader('Content-Type', (file.metadata?.contentType as string) || 'application/octet-stream');
  res.setHeader('Content-Length', String(file.length));
  res.setHeader('Content-Disposition', `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  await new Promise<void>((resolve, reject) => {
    bucket().openDownloadStream(file._id).on('error', reject).on('end', () => resolve()).pipe(res);
  });
}

/** Serves a profile photo inline. Photo ids are random and change on every upload, so they can be cached for long. */
export async function sendAvatar(res: Response, id: string) {
  if (!mongo.ObjectId.isValid(id)) throw new HttpError(404, 'Photo not found');
  const [file] = await bucket('avatars').find({ _id: new mongo.ObjectId(id) }).toArray();
  if (!file) throw new HttpError(404, 'Photo not found');
  res.setHeader('Content-Type', (file.metadata?.contentType as string) || 'image/jpeg');
  res.setHeader('Content-Length', String(file.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  await new Promise<void>((resolve, reject) => {
    bucket('avatars').openDownloadStream(file._id).on('error', reject).on('end', () => resolve()).pipe(res);
  });
}
