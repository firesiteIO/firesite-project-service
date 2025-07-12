/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./src/lib/kaiban/**/*.{js,ts,jsx,tsx,html}" // Include KaibanJS components
  ],
  theme: {
    extend: {
      // Firesite brand colors
      colors: {
        firesite: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        ai: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        kanban: {
          todo: '#f3f4f6',
          progress: '#fef3c7',
          review: '#fed7d7',
          done: '#d1fae5'
        }
      },
      
      // Animation for drag and drop
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-out': 'slideOut 0.2s ease-in',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        }
      },
      
      // Typography for project content
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
      
      // Spacing for Kanban layout
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Shadows for card depth
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'card-dragging': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'ai-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      
      // Transitions for smooth interactions
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      
      // Grid for responsive Kanban layout
      gridTemplateColumns: {
        'kanban': 'repeat(auto-fit, minmax(300px, 1fr))',
        'kanban-fixed': 'repeat(3, 1fr)',
        'kanban-mobile': '1fr',
      },
      
      // Z-index scale
      zIndex: {
        'modal': 1000,
        'dropdown': 500,
        'tooltip': 300,
        'card-dragging': 200,
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
  
  // Dark mode configuration
  darkMode: 'class',
  
  // Safelist for dynamic classes
  safelist: [
    'bg-kanban-todo',
    'bg-kanban-progress', 
    'bg-kanban-review',
    'bg-kanban-done',
    'shadow-ai-glow',
    'animate-pulse-slow',
    'z-card-dragging'
  ]
};