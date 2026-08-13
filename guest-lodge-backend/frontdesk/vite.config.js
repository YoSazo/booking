import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function collectReferencedWebAssets(outDir) {
  const found = new Set();
  const queue = [];
  const add = (file) => {
    const normalized = String(file || '').replace(/^\.\//, '').replace(/^assets\//, '');
    if (!/\.(?:js|css)$/.test(normalized)) return;
    const key = `assets/${normalized}`;
    if (found.has(key)) return;
    found.add(key);
    if (normalized.endsWith('.js')) queue.push(normalized);
  };
  const indexPath = path.join(outDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    for (const match of html.matchAll(/(?:\/frontdesk\/)?assets\/([^"'?]+\.(?:js|css))/g)) add(match[1]);
  }
  while (queue.length) {
    const filename = queue.shift();
    const assetPath = path.join(outDir, 'assets', filename);
    if (!fs.existsSync(assetPath)) continue;
    const source = fs.readFileSync(assetPath, 'utf8');
    for (const match of source.matchAll(/["']\.\/([^"']+\.(?:js|css))["']/g)) add(match[1]);
  }
  return found;
}

function loadWebAssetHistory(historyPath, outDir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    return {
      current: new Set(Array.isArray(parsed.current) ? parsed.current : []),
      previous: new Set(Array.isArray(parsed.previous) ? parsed.previous : []),
    };
  } catch (_) {
    return { current: collectReferencedWebAssets(outDir), previous: new Set() };
  }
}

function sameAssetSet(left, right) {
  return left.size === right.size && [...left].every((file) => right.has(file));
}

function rollingWebAssetsPlugin(outDir, historyPath, assetHistory) {
  let emittedAssets = new Set();
  return {
    name: 'marketel-rolling-web-assets',
    generateBundle(_options, bundle) {
      emittedAssets = new Set(Object.keys(bundle).filter((name) => /\.(?:js|css)$/.test(name)));
    },
    closeBundle() {
      // Render can briefly serve old and new instances during a deploy. Keep
      // the complete previous bundle in the new release so old HTML never
      // points at an asset that has already disappeared.
      const unchangedBuild = sameAssetSet(assetHistory.current, emittedAssets);
      const previousAssets = unchangedBuild ? assetHistory.previous : assetHistory.current;
      const keep = new Set([...previousAssets, ...emittedAssets]);
      const assetDir = path.join(outDir, 'assets');
      if (!fs.existsSync(assetDir)) return;
      for (const filename of fs.readdirSync(assetDir)) {
        if (!/\.(?:js|css)$/.test(filename)) continue;
        if (!keep.has(`assets/${filename}`)) fs.rmSync(path.join(assetDir, filename));
      }
      fs.writeFileSync(historyPath, `${JSON.stringify({
        current: [...emittedAssets].sort(),
        previous: [...previousAssets].sort(),
      }, null, 2)}\n`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const isNativeBuild = mode === 'native';
  const nativeWwwRoot = path.resolve(__dirname, '../../marketel-frontdesk-ios/www');
  const webOutDir = path.resolve(__dirname, '../public/frontdesk');
  const webAssetHistoryPath = path.resolve(__dirname, '.web-asset-history.json');
  const webAssetHistory = isNativeBuild
    ? { current: new Set(), previous: new Set() }
    : loadWebAssetHistory(webAssetHistoryPath, webOutDir);
  const apiTarget = process.env.FRONTDESK_API_PROXY
    || env.FRONTDESK_API_PROXY
    || 'http://localhost:3001';

  return {
    root: __dirname,
    base: isNativeBuild ? './' : '/frontdesk/',
    build: {
      outDir: isNativeBuild
        ? path.join(nativeWwwRoot, 'frontdesk')
        : webOutDir,
      emptyOutDir: isNativeBuild,
      target: 'es2020',
      rollupOptions: {
        output: {
          // JS chunks must be content-addressed. The server cache-busts the
          // generated HTML, so Cloudflare sees fresh URLs for updated modules.
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Keep font files in assets/ but don't rename them
            if (/\.(woff2?|ttf|eot)$/i.test(assetInfo.name || '')) {
              return 'assets/fonts/[name][extname]';
            }
            // CSS is served with immutable caching alongside JS. It must be
            // content-addressed too, otherwise a new reveal chunk can load
            // against an older cached reveal.css and render as raw markup.
            return 'assets/[name]-[hash][extname]';
          },
          manualChunks(id) {
            if (id.endsWith('settings.js')) return 'settings';
            if (id.endsWith('apps.js')) return 'apps';
          }
        },
      },
    },
    esbuild: {
      drop: (mode === 'production' || isNativeBuild) ? ['console', 'debugger'] : [],
    },
    plugins: isNativeBuild ? [{
      name: 'marketel-native-static-assets',
      transformIndexHtml(html) {
        return html
          .replace(/<script id="marketel-web-analytics">[\s\S]*?<\/script>/, '')
          .replace(/\s*<script[^>]*src="\/marketel-journey\.js"[^>]*><\/script>/, '')
          .replace(/\s*<script id="frontdesk-boot-guard">[\s\S]*?<\/script>/, '')
          .replace(/\s*<link rel="manifest"[^>]*>/, '');
      },
      closeBundle() {
        const publicRoot = path.resolve(__dirname, '../public');
        fs.mkdirSync(nativeWwwRoot, { recursive: true });
        for (const filename of [
          'apple-touch-icon.png',
          'manifest-simple-crm.json',
          'marketel.svg',
          'marketellogo.svg',
        ]) {
          fs.copyFileSync(path.join(publicRoot, filename), path.join(nativeWwwRoot, filename));
        }
      },
    }] : [rollingWebAssetsPlugin(webOutDir, webAssetHistoryPath, webAssetHistory)],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/frontdesk-sw.js': 'http://localhost:3001',
        '/manifest-simple-crm.json': 'http://localhost:3001',
        '/marketellogo.svg': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/marketel.svg': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/marketel-sprite.png': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
