import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Reuses Vite's transform pipeline, so the project's TypeScript and plugin setup applies to
// tests with no duplicate build configuration (research.md Decision 4).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // The unit tier must stay fast enough to run on every change (FR-003).
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'cobertura'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/main.tsx',
        'src/lib/types.ts', // type declarations only, no executable code
      ],
      // Two-tier gate per contracts/test-conventions.md. Enforced as separate thresholds,
      // never averaged — a global average lets covered types mask untested money formatting.
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 70,
        functions: 80,
        'src/lib/format.ts': {
          lines: 95,
          branches: 95,
          functions: 95,
          statements: 95,
        },
      },
    },
  },
})
