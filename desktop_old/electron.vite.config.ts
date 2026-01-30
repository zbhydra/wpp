import { defineConfig } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import type { Plugin } from 'vite';

// 移除 modulepreload 链接的插件
function removeModulePreload(): Plugin {
  return {
    name: 'remove-modulepreload',
    transformIndexHtml(html) {
      return html.replace(/<link rel="modulepreload"[^>]*>/g, '');
    },
  };
}

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/electron/main',
    },
  },
  preload: {
    build: {
      outDir: 'dist/electron/preload',
      rollupOptions: {
        input: {
          index: 'src/preload/index.ts',
          'whatsapp-preload': 'src/preload/whatsapp-preload/index.ts',
        },
      },
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'dist/electron/renderer',
      rollupOptions: {
        input: {
          index: 'src/renderer/index.html',
          test: 'src/renderer/test.html',
        },
        output: {
          // 不使用 code splitting，打包成单个文件
          manualChunks: undefined,
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // 设置 chunk 大小警告阈值（KB）
      chunkSizeWarningLimit: 500,
    },
    // 禁用预加载以提高在 Electron 中的性能
    modulePreload: false,
    plugins: [
      vue(),
      removeModulePreload(), // 移除 modulepreload 链接
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
  },
});
