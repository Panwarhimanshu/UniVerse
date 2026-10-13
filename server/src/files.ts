import path from 'node:path';
import mongoose, { mongo } from 'mongoose';
import type { Response } from 'express';
import { HttpError } from './middleware/auth.js';

/* Uploaded documents live in MongoDB (GridFS), so they survive restarts and work on serverless hosting. */

/** Vercel caps request bodies at 4.5 MB, so uploads stay under that everywhere. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const bucket = () => new mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'uploads' });

export async function saveFile(buffer: Buffer, name: string, contentType: string) {
  const stream = bucket().openUploadStream(name, { metadata: { contentType } });
  await new Promise<void>((resolve, reject) => {
    stream.once('finish', () => resolve());
    stream.once('error', reject);
    stream.end(buffer);
  });
  return String(stream.id);
}

export async function deleteFile(id: string) {
  if (!mongo.ObjectId.isValid(id)) return;
  try {
    await bucket().delete(new mongo.ObjectId(id));
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
