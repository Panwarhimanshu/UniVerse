import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import app, { init } from './app.js';

/*
 * Local entry point: serves the built website (web/dist) and listens on PORT.
 * On Vercel, app.ts is loaded directly as a serverless function.
 */
if (!process.env.VERCEL) {
  const webDist = path.resolve(process.cwd(), '../web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }
}

if (!process.env.VERCEL) {
  init()
    .then(() => {
      const port = Number(process.env.PORT) || 4000;
      app.listen(port, '0.0.0.0', () => console.log(`UniVerse API listening on http://localhost:${port}`));
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export default app;
