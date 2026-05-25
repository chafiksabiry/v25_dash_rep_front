import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import qiankun from 'vite-plugin-qiankun';
import * as cheerio from 'cheerio';

// Plugin to remove React Refresh preamble
const removeReactRefreshScript = () => {
  return {
    name: 'remove-react-refresh',
    transformIndexHtml(html: any) {
      const $ = cheerio.load(html);
      $('script[src="/@react-refresh"]').remove();
      return $.html();
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: 'https://harxv25dashboardrepfront.netlify.app/',
    plugins: [
      react(),
      qiankun('repdashboard', {
        useDevMode: true,
      }),
      removeReactRefreshScript(), // Add the script removal plugin
    ],

    define: {
      'import.meta.env': env,
    },
    server: {
      port: 5183,
      cors: true,
      hmr: false,
      fs: {
        strict: true, // Ensure static assets are correctly resolved
      },
    },
    build: {
      target: 'esnext',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          // 'es' (not 'umd') is required for dynamic imports to produce
          // separate chunks. UMD inlines everything into one big file,
          // which prevents code splitting and blows the 4 s single-spa
          // bootstrap budget on the host shell.
          format: 'es',
          entryFileNames: 'index.js',
          chunkFileNames: 'chunk-[name].js',
          assetFileNames: (assetInfo) => {
            // Ensure CSS files are consistently named
            const isCss = assetInfo.name?.endsWith('.css') || (assetInfo.names && assetInfo.names.some(n => n.endsWith('.css')));
            if (isCss) {
              return 'index.css';
            }
            return '[name].[ext]'; // Default for other asset types
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
