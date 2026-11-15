import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      // Forks with at most two workers, as in the admin dashboard: unbounded threads timed out starting
      // ("Failed to start threads worker") on a full run, and so did unbounded forks before that.
      pool: 'forks',
      maxWorkers: 2,
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
    },
  }),
)
