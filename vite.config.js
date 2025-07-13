import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Development server configuration for WebContainers
  server: {
    port: 5174,
    host: true,
    open: true,
    cors: true,
    strictPort: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    proxy: {
      // Proxy Firebase Functions API calls
      '/api': {
        target: 'http://localhost:5001/firesite-ai-f3bc8/us-central1',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      // Proxy Claude API calls
      '/claude': {
        target: 'http://localhost:5001/firesite-ai-f3bc8/us-central1',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      },
      // Proxy MCP MAX server
      '/mcp-max': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/mcp-max/, '')
      },
      // Proxy MCP Base server
      '/mcp-base': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/mcp-base/, '')
      }
    }
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
          'vendor': ['uuid', 'marked'],
          'ai': ['@anthropic-ai/sdk'],
          'kanban': ['sortablejs'],
          'firebase': ['firebase'],
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

  // Optimization for WebContainers
  optimizeDeps: {
    include: [
      'uuid',
      'dompurify',
      'highlight.js',
      'marked',
      'sortablejs',
      'firebase'
    ],
    exclude: [
      '@anthropic-ai/sdk', // Keep as external for dynamic loading
      '@webcontainer/api' // Exclude WebContainer API for proper loading
    ]
  },

  // Preview configuration
  preview: {
    port: 5174,
    host: true,
    strictPort: true
  }
});