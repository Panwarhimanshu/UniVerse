// Full copy of the database, including uploaded documents and photos, to backups/<date-time>/ (one file per collection).
// Run from server/:  npm run backup
// Restore a collection with:  mongoimport --uri "<MONGODB_URI>" --db universe --collection <name> --file <name>.json --jsonArray
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const { EJSON } = mongoose.mongo.BSON;
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set in server/.env');

await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || 'universe' });
const db = mongoose.connection.db;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = path.resolve('..', 'backups', stamp);
fs.mkdirSync(dir, { recursive: true });

let total = 0;
for (const { name } of await db.listCollections().toArray()) {
  const out = fs.createWriteStream(path.join(dir, `${name}.json`));
  out.write('[\n');
  let n = 0;
  for await (const doc of db.collection(name).find()) {
    out.write((n++ ? ',\n' : '') + EJSON.stringify(doc, { relaxed: false }));
  }
  out.write('\n]\n');
  await new Promise((r) => out.end(r));
  console.log(`${name.padEnd(28)} ${n}`);
  total += n;
}
await mongoose.disconnect();
console.log(`\nSaved ${total} records to ${dir}`);
