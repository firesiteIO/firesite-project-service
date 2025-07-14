/**
 * Vitest Test Setup
 * Global test configuration and mocks for Firesite Project Service
 */

import { vi } from 'vitest';

// Mock DOM globals that might be missing in jsdom
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock SortableJS for drag-and-drop testing
vi.mock('sortablejs', () => ({
  default: {
    create: vi.fn(() => ({
      destroy: vi.fn(),
      option: vi.fn()
    }))
  }
}));

// Mock highlight.js for code syntax highlighting tests
vi.mock('highlight.js', () => ({
  default: {
    highlight: vi.fn((code, options) => ({
      value: `<span class="hljs">${code}</span>`
    })),
    highlightElement: vi.fn(),
    getLanguage: vi.fn(() => true)
  }
}));

// Mock DOMPurify for content sanitization tests
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((content) => content),
    isSupported: true
  }
}));

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn()
}));

// Mock WebContainer API
vi.mock('@webcontainer/api', () => ({
  WebContainer: {
    boot: vi.fn(() => Promise.resolve({
      spawn: vi.fn(),
      fs: {
        writeFile: vi.fn(),
        readFile: vi.fn(),
        readdir: vi.fn()
      },
      on: vi.fn()
    }))
  }
}));

// Mock UUID for deterministic testing
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234')
}));

// Global test utilities
global.createMockTask = (overrides = {}) => ({
  id: 'test-task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'todo',
  priority: 'medium',
  createdAt: '2025-07-14T00:00:00Z',
  updatedAt: '2025-07-14T00:00:00Z',
  ...overrides
});

global.createMockEvent = (type, data = {}) => ({
  type,
  data,
  timestamp: Date.now()
});

global.createMockDOMElement = (tagName = 'div') => {
  const element = document.createElement(tagName);
  element.appendChild = vi.fn((child) => {
    element.children.push || (element.children = []);
    element.children.push(child);
    return child;
  });
  return element;
};

// Mock fetch for API testing
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })
);

// Console suppression for cleaner test output
const originalConsole = { ...console };
global.suppressConsole = () => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
};

global.restoreConsole = () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});