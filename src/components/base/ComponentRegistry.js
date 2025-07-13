/**
 * Component Registry - Manages component lifecycle and dependencies
 * Service-first architecture for UI component management
 */

import { globalEvents } from '../../events/EnhancedEventBus.js';

/**
 * Component Registry for managing component instances and dependencies
 */
export class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.componentTypes = new Map();
    this.mountOrder = [];
    this.globalEvents = globalEvents;
    
    // Component lifecycle tracking
    this.stats = {
      totalComponents: 0,
      mountedComponents: 0,
      destroyedComponents: 0,
      componentsByType: {}
    };
    
    this._setupEventListeners();
  }

  /**
   * Register a component type
   * @param {string} typeName - Component type name
   * @param {Class} ComponentClass - Component class
   * @param {Object} defaultOptions - Default options for this component type
   */
  registerType(typeName, ComponentClass, defaultOptions = {}) {
    this.componentTypes.set(typeName, {
      ComponentClass,
      defaultOptions,
      instances: new Set()
    });
    
    console.log(`Component type registered: ${typeName}`);
  }

  /**
   * Create component instance
   * @param {string} typeName - Component type name
   * @param {Object} options - Component options
   * @returns {Object} Component instance
   */
  create(typeName, options = {}) {
    const typeInfo = this.componentTypes.get(typeName);
    if (!typeInfo) {
      throw new Error(`Unknown component type: ${typeName}`);
    }

    const { ComponentClass, defaultOptions } = typeInfo;
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create component instance
    const component = new ComponentClass(mergedOptions);
    
    // Register instance
    this.components.set(component.id, {
      component,
      typeName,
      createdAt: Date.now(),
      mountedAt: null,
      destroyedAt: null
    });
    
    typeInfo.instances.add(component.id);
    
    // Update stats
    this.stats.totalComponents++;
    this.stats.componentsByType[typeName] = (this.stats.componentsByType[typeName] || 0) + 1;
    
    // Emit creation event
    this.globalEvents.emit('ui:component-created', {
      componentId: component.id,
      componentType: typeName,
      options: mergedOptions
    });
    
    console.log(`Component created: ${typeName} (${component.id})`);
    return component;
  }

  /**
   * Mount component
   * @param {string} componentId - Component ID
   * @returns {Object} Component instance
   */
  mount(componentId) {
    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const { component } = componentInfo;
    
    if (!component.mounted) {
      component.init();
      componentInfo.mountedAt = Date.now();
      this.mountOrder.push(componentId);
      this.stats.mountedComponents++;
      
      this.globalEvents.emit('ui:component-mounted', {
        componentId,
        componentType: componentInfo.typeName
      });
    }
    
    return component;
  }

  /**
   * Unmount component
   * @param {string} componentId - Component ID
   */
  unmount(componentId) {
    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      console.warn(`Component not found for unmounting: ${componentId}`);
      return;
    }

    const { component } = componentInfo;
    
    if (component.mounted) {
      component.destroy();
      componentInfo.destroyedAt = Date.now();
      this.stats.destroyedComponents++;
      this.stats.mountedComponents--;
      
      // Remove from mount order
      const index = this.mountOrder.indexOf(componentId);
      if (index > -1) {
        this.mountOrder.splice(index, 1);
      }
      
      this.globalEvents.emit('ui:component-unmounted', {
        componentId,
        componentType: componentInfo.typeName
      });
    }
  }

  /**
   * Destroy component completely
   * @param {string} componentId - Component ID
   */
  destroy(componentId) {
    const componentInfo = this.components.get(componentId);
    if (!componentInfo) {
      console.warn(`Component not found for destruction: ${componentId}`);
      return;
    }

    // Unmount if still mounted
    this.unmount(componentId);
    
    // Remove from registry
    const { typeName } = componentInfo;
    const typeInfo = this.componentTypes.get(typeName);
    if (typeInfo) {
      typeInfo.instances.delete(componentId);
    }
    
    this.components.delete(componentId);
    
    this.globalEvents.emit('ui:component-destroyed', {
      componentId,
      componentType: typeName
    });
    
    console.log(`Component destroyed: ${componentId}`);
  }

  /**
   * Get component by ID
   * @param {string} componentId - Component ID
   * @returns {Object|null} Component instance
   */
  get(componentId) {
    const componentInfo = this.components.get(componentId);
    return componentInfo ? componentInfo.component : null;
  }

  /**
   * Get components by type
   * @param {string} typeName - Component type name
   * @returns {Array} Array of component instances
   */
  getByType(typeName) {
    const typeInfo = this.componentTypes.get(typeName);
    if (!typeInfo) return [];
    
    return Array.from(typeInfo.instances)
      .map(id => this.get(id))
      .filter(Boolean);
  }

  /**
   * Get all mounted components
   * @returns {Array} Array of mounted components
   */
  getMounted() {
    return this.mountOrder
      .map(id => this.get(id))
      .filter(component => component && component.mounted);
  }

  /**
   * Get component statistics
   * @returns {Object} Component statistics
   */
  getStats() {
    return {
      ...this.stats,
      registeredTypes: this.componentTypes.size,
      activeComponents: this.components.size,
      mountOrder: [...this.mountOrder]
    };
  }

  /**
   * Cleanup destroyed components
   */
  cleanup() {
    const toCleanup = [];
    
    for (const [id, info] of this.components.entries()) {
      if (info.destroyedAt) {
        toCleanup.push(id);
      }
    }
    
    toCleanup.forEach(id => this.destroy(id));
    
    console.log(`Cleaned up ${toCleanup.length} destroyed components`);
  }

  /**
   * Destroy all components
   */
  destroyAll() {
    const componentIds = Array.from(this.components.keys());
    componentIds.forEach(id => this.destroy(id));
    
    console.log(`Destroyed all ${componentIds.length} components`);
  }

  /**
   * Create and mount component in one call
   * @param {string} typeName - Component type name
   * @param {Object} options - Component options
   * @returns {Object} Mounted component instance
   */
  createAndMount(typeName, options = {}) {
    const component = this.create(typeName, options);
    this.mount(component.id);
    return component;
  }

  /**
   * Find component by container element
   * @param {Element} element - Container element
   * @returns {Object|null} Component instance
   */
  findByContainer(element) {
    for (const componentInfo of this.components.values()) {
      if (componentInfo.component.container === element) {
        return componentInfo.component;
      }
    }
    return null;
  }

  /**
   * Find component by selector
   * @param {string} selector - CSS selector
   * @returns {Object|null} Component instance
   */
  findBySelector(selector) {
    const element = document.querySelector(selector);
    return element ? this.findByContainer(element) : null;
  }

  /**
   * Batch operations
   */
  batch() {
    const operations = [];
    
    return {
      create: (typeName, options) => {
        operations.push({ type: 'create', typeName, options });
        return this;
      },
      mount: (componentId) => {
        operations.push({ type: 'mount', componentId });
        return this;
      },
      destroy: (componentId) => {
        operations.push({ type: 'destroy', componentId });
        return this;
      },
      execute: () => {
        const results = [];
        
        for (const op of operations) {
          try {
            switch (op.type) {
              case 'create':
                results.push(this.create(op.typeName, op.options));
                break;
              case 'mount':
                results.push(this.mount(op.componentId));
                break;
              case 'destroy':
                this.destroy(op.componentId);
                results.push(true);
                break;
            }
          } catch (error) {
            console.error(`Batch operation failed:`, error);
            results.push(error);
          }
        }
        
        return results;
      }
    };
  }

  // Private methods

  _setupEventListeners() {
    // Listen for component lifecycle events
    this.globalEvents.on('ui:component-initialized', (data) => {
      console.log(`Component initialized: ${data.componentType} (${data.componentId})`);
    });
    
    this.globalEvents.on('ui:component-state-changed', (data) => {
      // Could implement state history tracking here
    });
    
    // Handle window beforeunload to cleanup
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroyAll();
      });
    }
  }
}

/**
 * Component Manager - Higher level component management
 */
export class ComponentManager {
  constructor() {
    this.registry = new ComponentRegistry();
    this.layouts = new Map();
    this.routes = new Map();
    this.currentLayout = null;
  }

  /**
   * Register standard component types
   */
  registerStandardTypes() {
    // Will register standard types when we create them
    console.log('Standard component types will be registered here');
  }

  /**
   * Define a layout
   * @param {string} name - Layout name
   * @param {Object} config - Layout configuration
   */
  defineLayout(name, config) {
    this.layouts.set(name, config);
  }

  /**
   * Apply layout
   * @param {string} name - Layout name
   * @param {Object} data - Layout data
   */
  applyLayout(name, data = {}) {
    const layout = this.layouts.get(name);
    if (!layout) {
      throw new Error(`Unknown layout: ${name}`);
    }

    // Destroy current layout
    if (this.currentLayout) {
      this.destroyLayout(this.currentLayout);
    }

    // Create new layout components
    const components = [];
    for (const component of layout.components) {
      const instance = this.registry.createAndMount(component.type, {
        ...component.options,
        ...data
      });
      components.push(instance);
    }

    this.currentLayout = { name, components };
    
    this.globalEvents.emit('ui:layout-applied', {
      layoutName: name,
      componentIds: components.map(c => c.id)
    });
  }

  /**
   * Destroy current layout
   */
  destroyLayout(layout) {
    if (layout && layout.components) {
      layout.components.forEach(component => {
        this.registry.destroy(component.id);
      });
    }
  }

  /**
   * Get registry instance
   */
  getRegistry() {
    return this.registry;
  }
}

// Create and export global instances
export const componentRegistry = new ComponentRegistry();
export const componentManager = new ComponentManager();

export default componentRegistry;