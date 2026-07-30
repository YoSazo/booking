import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const isNativeBuild = mode === 'native';
  const nativeWwwRoot = path.resolve(__dirname, '../../marketel-frontdesk-ios/www');
  const apiTarget = process.env.FRONTDESK_API_PROXY
    || env.FRONTDESK_API_PROXY
    || 'http://localhost:3001';

  return {
    root: __dirname,
    base: isNativeBuild ? './' : '/frontdesk/',
    build: {
      outDir: isNativeBuild
        ? path.join(nativeWwwRoot, 'frontdesk')
        : path.resolve(__dirname, '../public/frontdesk'),
      emptyOutDir: true,
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
    }] : [],
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
