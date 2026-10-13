import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

/**
 * Vendor splitting. Only the libraries every page needs get a named chunk. Recharts and Leaflet
 * are deliberately left to Rollup's default splitting so they load with the pages that import
 * them (home charts and the coverage editor), never in the initial bundle.
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  if (/node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) return 'react'
  if (id.includes('@tanstack/react-query')) return 'query'
  if (id.includes('@radix-ui')) return 'radix'
  if (/node_modules[\\/](i18next|react-i18next)[\\/]/.test(id)) return 'i18n'

  return undefined
}

/**
 * Dev proxy: with `VITE_API_PROXY_TARGET` set (and `VITE_API_BASE_URL` empty), the dev server
 * forwards `/api` and `/uploads` to that API. The browser only ever talks to localhost, so an
 * API whose CORS policy doesn't list localhost (production) still works during development.
 */
function devProxy(target: string | undefined): Record<string, ProxyOptions> | undefined {
  if (!target) return undefined
  const options: ProxyOptions = {
    target,
    changeOrigin: true,
    secure: true,
    // Server-to-server: no browser Origin, so the API's CORS policy doesn't apply.
    configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
  }
  return { '/api': options, '/uploads': options }
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5174,
    strictPort: true,
    host: true,
    proxy: devProxy(loadEnv(mode, process.cwd(), '').VITE_API_PROXY_TARGET),
  },

  preview: {
    port: 4174,
    strictPort: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: { manualChunks },
    },
  },
}))
