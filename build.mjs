// Bundles + minifies into dist/ (sources stay untouched). Netlify publishes dist/.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const f of ['index.html', 'data.json', '_redirects']) cpSync(f, `dist/${f}`);

await build({
  entryPoints: ['app.js', 'sw.js', 'style.css'],
  outdir: 'dist',
  bundle: true,
  minify: true,
  define: { __BUILD__: JSON.stringify(process.env.COMMIT_REF || 'dev') },
});
