import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Development server configuration
  server: {
    port: 5174,
    host: true,
    open: true,
    cors: true,
    strictPort: true
  },

  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'vendor': ['uuid'],
          'ai': ['@anthropic-ai/sdk'],
          'security': ['dompurify'],
          'highlight': ['highlight.js']
        }
      }
    }
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@core': resolve(__dirname, 'src/core'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@lib': resolve(__dirname, 'src/lib')
    }
  },

  // CSS configuration
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString())
  },

  // Test configuration
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.config.js',
        'src/lib/kaiban/**' // Exclude KaibanJS from coverage
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },

  // Plugin configuration
  plugins: [],

  // Optimization
  optimizeDeps: {
    include: [
      'uuid',
      'dompurify',
      'highlight.js'
    ],
    exclude: [
      '@anthropic-ai/sdk' // Keep as external for dynamic loading
    ]
  },

  // Preview configuration
  preview: {
    port: 5174,
    host: true,
    strictPort: true
  }
});