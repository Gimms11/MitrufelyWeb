/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isAnalyze = process.env['ANALYZE'] === 'true'

  return {
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
    plugins: [
      react({
        // Activa React Compiler vía Rolldown Babel preset
        include: /\.[tj]sx?$/,
      }),
      tailwindcss(),
      // Compresión Brotli + Gzip pre-generada para servir con nginx
      compression({
        algorithms: ['brotliCompress', 'gzip'],
        exclude: [/\.png$/, /\.jpg$/, /\.jpeg$/, /\.webp$/, /\.avif$/, /\.svg$/],
        // Solo comprimir archivos > 1KB (no vale la pena para archivos tiny)
        threshold: 1024,
      }),
      // Visualizador de bundle (solo cuando ANALYZE=true)
      isAnalyze &&
        visualizer({
          filename: 'dist/stats.html',
          template: 'treemap',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },

    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: env['VITE_API_BASE_URL'] ?? 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ''),
        },
      },
    },

    preview: {
      port: 4173,
    },

    build: {
      target: 'es2022',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Separar vendors estables en chunks dedicados para mejor caching
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) {
                return 'react-vendor'
              }
              if (id.includes('@tanstack')) {
                return 'query-vendor'
              }
              if (id.includes('react-hook-form') || id.includes('/zod/') || id.includes('@hookform')) {
                return 'form-vendor'
              }
              if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('/sonner/')) {
                return 'ui-vendor'
              }
              if (id.includes('recharts') || id.includes('/d3-') || id.includes('/victory-')) {
                return 'chart-vendor'
              }
            }
          },
        },
      },
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router',
        '@tanstack/react-query',
        'zustand',
        'axios',
        'clsx',
        'tailwind-merge',
      ],
    },
  }
})

// Exporta el preset para uso en configuraciones avanzadas
export { reactCompilerPreset }
