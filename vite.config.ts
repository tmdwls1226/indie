import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Lists the image files present in public/assets as /assets/manifest.json so the game only requests art that
// exists (everything else falls back to emoji). Served live in dev, emitted into dist/ on build.
const IMAGE = /\.(png|webp|gif)$/i;
function walk(dir: string, rel = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    return e.isDirectory() ? walk(path.join(dir, e.name), r) : IMAGE.test(e.name) ? [r] : [];
  });
}
function assetManifest(): Plugin {
  let root = process.cwd();
  const body = () => JSON.stringify({ files: walk(path.join(root, 'public', 'assets')).sort() });
  return {
    name: 'turnbound-asset-manifest',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/assets/manifest.json') return next();
        res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(body());
      });
    },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'assets/manifest.json', source: body() }); }
  };
}
export default defineConfig({ plugins: [react(), assetManifest()] });
