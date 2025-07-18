/**
 * Base Component - Foundation for all UI components
 * Implements Firesite service-first architecture with event-driven communication
 */

import { globalEvents } from '../../events/EnhancedEventBus.js';

/**
 * Base Component class providing common functionality
 */
export class BaseComponent {
  constructor(options = {}) {
    // Core properties
    this.id = options.id || this._generateId();
    this.container = options.container;
    this.className = options.className || '';
    
    // Event system
    this.globalEvents = globalEvents;
    this.eventListeners = new Map();
    
    // State management
    this.state = { ...this.defaultState, ...options.initialState };
    this.previousState = {};
    
    // Component lifecycle
    this.mounted = false;
    this.destroyed = false;
    
    // Configuration
    this.enableAutoRender = options.enableAutoRender !== false;
    this.enableStateLogging = options.enableStateLogging || false;
    
    // Tailwind class system
    this.classes = this.generateClasses();
    
    // Child components
    this.children = new Map();
    
    // Validate container
    if (!this.container) {
      console.warn(`Component ${this.constructor.name} created without container`);
    }
  }

  /**
   * Default state - override in subclasses
   */
  get defaultState() {
    return {
      loading: false,
      error: null,
      visible: true
    };
  }

  /**
   * Generate Tailwind CSS classes - override in subclasses
   */
  generateClasses() {
    return {
      // Base container styles
      container: 'relative bg-slate-900 rounded-xl ring-1 ring-slate-700',
      
      // Layout utilities
      flex: 'flex items-center justify-between',
      grid: 'grid gap-3',
      
      // Text hierarchy
      text: {
        primary: 'text-white font-medium',
        secondary: 'text-slate-200',
        tertiary: 'text-slate-400',
        small: 'text-xs',
        body: 'text-sm'
      },
      
      // Interactive elements
      button: {
        primary: 'bg-indigo-500 py-1.5 px-3 text-white rounded-md hover:bg-indigo-600 transition-colors',
        secondary: 'bg-slate-900 text-slate-400 rounded-md hover:bg-indigo-500/15 hover:text-indigo-500 transition-colors',
        danger: 'bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors'
      },
      
      // Status indicators
      status: {
        success: 'bg-green-500/15 text-green-400',
        warning: 'bg-yellow-500/15 text-yellow-400',
        error: 'bg-red-500/15 text-red-400',
        info: 'bg-blue-500/15 text-blue-400'
      },
      
      // Common patterns
      card: 'bg-slate-800 p-4 rounded-lg ring-1 ring-slate-950',
      badge: 'px-2 py-1 rounded-full text-xs font-medium',
      avatar: 'rounded-full ring-2 ring-slate-700 bg-slate-800',
      
      // Responsive utilities
      mobile: 'block md:hidden',
      desktop: 'hidden md:block',
      
      // Animation classes
      transition: 'transition-all duration-200 ease-in-out',
      fadeIn: 'opacity-0 animate-fade-in',
      slideIn: 'transform translate-y-4 animate-slide-in'
    };
  }

  /**
   * Initialize component
   */
  init() {
    if (this.mounted) return;
    
    this._validateContainer();
    this._setupEventListeners();
    this._initializeState();
    
    if (this.enableAutoRender) {
      this.render();
    }
    
    this.mounted = true;
    this._onMounted();
    
    console.log(`Component ${this.constructor.name} (${this.id}) mounted`);
  }

  /**
   * Render component - override in subclasses
   */
  render() {
    if (!this.container || this.destroyed) return;
    
    this._onBeforeRender();
    
    const html = this.template();
    if (html) {
      this.container.innerHTML = html;
      this._bindEventHandlers();
      this._renderChildren();
    }
    
    this._onAfterRender();
    
    if (this.enableStateLogging) {
      console.log(`${this.constructor.name} rendered with state:`, this.state);
    }
  }

  /**
   * Template method - override in subclasses
   */
  template() {
    return `
      <div class="${this.classes.container} ${this.className}">
        <div class="${this.classes.text.primary}">
          ${this.constructor.name} Component
        </div>
      </div>
    `;
  }

  /**
   * Update component state
   */
  setState(updates, shouldRender = true) {
    this.previousState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    this._onStateChanged(updates);
    
    if (shouldRender && this.enableAutoRender && this.mounted) {
      this.render();
    }
    
    // Emit state change event
    this.globalEvents.emit('ui:component-state-changed', {
      componentId: this.id,
      componentType: this.constructor.name,
      previousState: this.previousState,
      newState: this.state,
      updates
    });
  }

  /**
   * Get component state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Add child component
   */
  addChild(name, component, shouldMount = true) {
    this.children.set(name, component);
    
    if (shouldMount && !component.mounted) {
      component.init();
    }
  }

  /**
   * Remove child component
   */
  removeChild(name) {
    const child = this.children.get(name);
    if (child) {
      child.destroy();
      this.children.delete(name);
    }
  }

  /**
   * Get child component
   */
  getChild(name) {
    return this.children.get(name);
  }

  /**
   * Show component
   */
  show() {
    if (this.container) {
      this.container.style.display = 'block';
      this.setState({ visible: true });
    }
  }

  /**
   * Hide component
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.setState({ visible: false });
    }
  }

  /**
   * Toggle component visibility
   */
  toggle() {
    if (this.state.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading = true) {
    this.setState({ loading });
  }

  /**
   * Set error state
   */
  setError(error) {
    this.setState({ error });
  }

  /**
   * Clear error state
   */
  clearError() {
    this.setState({ error: null });
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.destroyed) return;
    
    this._onBeforeDestroy();
    
    // Destroy children
    for (const child of this.children.values()) {
      child.destroy();
    }
    this.children.clear();
    
    // Remove event listeners
    this._cleanupEventListeners();
    
    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.destroyed = true;
    this.mounted = false;
    
    this._onDestroyed();
    
    console.log(`Component ${this.constructor.name} (${this.id}) destroyed`);
  }

  // Event handling methods

  /**
   * Setup event listeners - override in subclasses
   */
  _setupEventListeners() {
    // Default implementation - override in subclasses
  }

  /**
   * Bind DOM event handlers - override in subclasses
   */
  _bindEventHandlers() {
    // Default implementation - override in subclasses
  }

  /**
   * Add event listener with automatic cleanup
   */
  _addEventListener(element, event, handler, options = {}) {
    if (!element) return;
    
    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler, options);
    
    // Store for cleanup
    const key = `${element.tagName || 'unknown'}_${event}_${Date.now()}`;
    this.eventListeners.set(key, {
      element,
      event,
      handler: boundHandler,
      options
    });
  }

  /**
   * Listen to global events
   */
  _listenToGlobalEvent(eventName, handler, options = {}) {
    const unsubscribe = this.globalEvents.on(eventName, handler.bind(this), options);
    
    // Store unsubscriber for cleanup
    this.eventListeners.set(`global_${eventName}`, { unsubscribe });
  }

  // Lifecycle hooks - override in subclasses

  _onMounted() {
    // Override in subclasses
  }

  _onBeforeRender() {
    // Override in subclasses
  }

  _onAfterRender() {
    // Override in subclasses
  }

  _onStateChanged(updates) {
    // Override in subclasses
  }

  _onBeforeDestroy() {
    // Override in subclasses
  }

  _onDestroyed() {
    // Override in subclasses
  }

  // Utility methods

  _generateId() {
    return `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _validateContainer() {
    if (!this.container) {
      throw new Error(`Component ${this.constructor.name} requires a container`);
    }
    
    if (typeof this.container === 'string') {
      const element = document.querySelector(this.container);
      if (!element) {
        throw new Error(`Container not found: ${this.container}`);
      }
      this.container = element;
    }
  }

  _initializeState() {
    // Emit initial state
    this.globalEvents.emit('ui:component-initialized', {
      componentId: this.id,
      componentType: this.constructor.name,
      initialState: this.state
    });
  }

  _renderChildren() {
    for (const child of this.children.values()) {
      if (!child.mounted) {
        child.init();
      } else if (child.enableAutoRender) {
        child.render();
      }
    }
  }

  _cleanupEventListeners() {
    for (const [key, listener] of this.eventListeners.entries()) {
      if (listener.unsubscribe) {
        // Global event listener
        listener.unsubscribe();
      } else {
        // DOM event listener
        listener.element.removeEventListener(
          listener.event, 
          listener.handler, 
          listener.options
        );
      }
    }
    this.eventListeners.clear();
  }

  // Utility methods for common UI patterns

  /**
   * Create loading spinner HTML
   */
  _createLoadingSpinner(size = 'md') {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8'
    };
    
    return `
      <div class="flex items-center justify-center p-4">
        <div class="${sizeClasses[size]} animate-spin text-indigo-500">
          <svg fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
          </svg>
        </div>
      </div>
    `;
  }

  /**
   * Create error message HTML
   */
  _createErrorMessage(error, canRetry = false) {
    const message = typeof error === 'string' ? error : error?.message || 'An error occurred';
    
    return `
      <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div class="${this.classes.text.body} text-red-400">
          ${message}
        </div>
        ${canRetry ? `
          <button class="${this.classes.button.secondary} mt-2" onclick="this.closest('[data-component]').__component.retry()">
            Try Again
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Create empty state HTML
   */
  _createEmptyState(message = 'No items found', actionText = '', actionHandler = null) {
    return `
      <div class="flex flex-col items-center justify-center p-8">
        <div class="${this.classes.text.tertiary} mb-4">
          ${message}
        </div>
        ${actionText && actionHandler ? `
          <button class="${this.classes.button.primary}" onclick="${actionHandler}">
            ${actionText}
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Create badge HTML
   */
  _createBadge(text, variant = 'default') {
    const variantClasses = {
      default: 'bg-slate-500/15 text-slate-400',
      success: 'bg-green-500/15 text-green-400',
      warning: 'bg-yellow-500/15 text-yellow-400',
      error: 'bg-red-500/15 text-red-400',
      info: 'bg-blue-500/15 text-blue-400'
    };
    
    return `
      <span class="${this.classes.badge} ${variantClasses[variant]}">
        ${text}
      </span>
    `;
  }

  /**
   * Create avatar HTML
   */
  _createAvatar(name, src = null, size = 'md') {
    const sizeClasses = {
      sm: 'w-6 h-6 text-xs',
      md: 'w-9 h-9 text-sm',
      lg: 'w-12 h-12 text-base'
    };
    
    if (src) {
      return `
        <img class="${this.classes.avatar} ${sizeClasses[size]}" 
             src="${src}" 
             alt="${name}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="${this.classes.avatar} ${sizeClasses[size]} flex items-center justify-center font-medium" style="display:none;">
          ${name.charAt(0).toUpperCase()}
        </div>
      `;
    }
    
    return `
      <div class="${this.classes.avatar} ${sizeClasses[size]} flex items-center justify-center font-medium">
        ${name.charAt(0).toUpperCase()}
      </div>
    `;
  }
}

export default BaseComponent;