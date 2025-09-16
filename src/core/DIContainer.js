/**
 * Dependency Injection Container for service management
 * Provides singleton and factory registration patterns
 */
export class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a singleton service
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   */
  registerSingleton(name, factory) {
    this.singletons.set(name, factory);
    return this;
  }

  /**
   * Register a factory service (new instance each time)
   * @param {string} name - Service name
   * @param {Function} factory - Factory function that creates the service
   */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
    return this;
  }

  /**
   * Register an instance directly
   * @param {string} name - Service name
   * @param {*} instance - Service instance
   */
  registerInstance(name, instance) {
    this.services.set(name, instance);
    return this;
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  resolve(name) {
    // Check for direct instance first
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check for singleton
    if (this.singletons.has(name)) {
      const factory = this.singletons.get(name);
      const instance = factory(this);
      this.services.set(name, instance);
      return instance;
    }

    // Check for factory
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      return factory(this);
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name) || 
           this.singletons.has(name) || 
           this.factories.has(name);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }

  /**
   * Create a child container that inherits from this one
   * @returns {DIContainer}
   */
  createChild() {
    const child = new DIContainer();
    child.parent = this;
    
    // Override resolve to check parent if not found
    const originalResolve = child.resolve.bind(child);
    child.resolve = (name) => {
      try {
        return originalResolve(name);
      } catch (error) {
        if (child.parent) {
          return child.parent.resolve(name);
        }
        throw error;
      }
    };

    return child;
  }
}

// Global container instance
export const container = new DIContainer();