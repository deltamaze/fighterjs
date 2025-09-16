/**
 * Base System class for all game systems
 * Provides standardized interface for system lifecycle and component management
 */
export class System {
  /**
   * Create a new System
   * @param {Object} dependencies - Injected dependencies for the system
   */
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
    this.isInitialized = false;
    this.isShutdown = false;
    this.isActive = true;
    this.id = this.generateId();
    this.registeredComponents = new Set();
  }

  /**
   * Generate a unique ID for this system
   * @returns {string} Unique identifier
   */
  generateId() {
    return `system_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Initialize the system
   * Called once when the system is first created
   */
  initialize() {
    if (this.isInitialized || this.isShutdown) {
      return;
    }

    this.isInitialized = true;
    
    // Call initialization hook
    this.onInitialize();
  }

  /**
   * Update the system and its managed components
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {Array} components - Array of components to process
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, components, gameState) {
    if (!this.isInitialized || this.isShutdown || !this.isActive) {
      return;
    }
    
    // Base implementation - override in subclasses
    this.onUpdate(deltaTime, components, gameState);
  }

  /**
   * Shutdown the system and clean up resources
   */
  shutdown() {
    if (this.isShutdown) {
      return;
    }

    this.isShutdown = true;
    this.isActive = false;
    
    // Call shutdown hook
    this.onShutdown();
    
    // Clear registered components
    this.registeredComponents.clear();
    
    // Clear dependencies
    this.dependencies = null;
  }

  /**
   * Register a component with this system
   * @param {Component} component - Component to register
   */
  registerComponent(component) {
    if (this.isShutdown || !component) {
      return false;
    }

    this.registeredComponents.add(component);
    this.onComponentRegistered(component);
    return true;
  }

  /**
   * Unregister a component from this system
   * @param {Component} component - Component to unregister
   */
  unregisterComponent(component) {
    if (this.isShutdown || !component) {
      return false;
    }

    const wasRegistered = this.registeredComponents.delete(component);
    if (wasRegistered) {
      this.onComponentUnregistered(component);
    }
    return wasRegistered;
  }

  /**
   * Get all registered components
   * @returns {Set} Set of registered components
   */
  getRegisteredComponents() {
    return new Set(this.registeredComponents);
  }

  /**
   * Check if a component is registered with this system
   * @param {Component} component - Component to check
   * @returns {boolean} Whether the component is registered
   */
  isComponentRegistered(component) {
    return this.registeredComponents.has(component);
  }

  /**
   * Override this method in subclasses for custom initialization logic
   */
  onInitialize() {
    // Override in subclasses
  }

  /**
   * Override this method in subclasses for custom update logic
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {Array} components - Array of components to process
   * @param {Object} gameState - Current game state
   */
  onUpdate(deltaTime, components, gameState) {
    // Override in subclasses
  }

  /**
   * Override this method in subclasses for custom shutdown logic
   */
  onShutdown() {
    // Override in subclasses
  }

  /**
   * Override this method in subclasses for custom component registration logic
   * @param {Component} component - Component that was registered
   */
  onComponentRegistered(component) {
    // Override in subclasses
  }

  /**
   * Override this method in subclasses for custom component unregistration logic
   * @param {Component} component - Component that was unregistered
   */
  onComponentUnregistered(component) {
    // Override in subclasses
  }

  /**
   * Set the active state of the system
   * @param {boolean} active - Whether the system should be active
   */
  setActive(active) {
    if (this.isShutdown) {
      return;
    }
    this.isActive = active;
  }

  /**
   * Get the active state of the system
   * @returns {boolean} Whether the system is active
   */
  getActive() {
    return this.isActive && this.isInitialized && !this.isShutdown;
  }

  /**
   * Check if the system has been initialized
   * @returns {boolean} Whether the system is initialized
   */
  getInitialized() {
    return this.isInitialized;
  }

  /**
   * Check if the system has been shutdown
   * @returns {boolean} Whether the system is shutdown
   */
  getShutdown() {
    return this.isShutdown;
  }

  /**
   * Get a dependency by name
   * @param {string} name - Dependency name
   * @returns {*} The dependency instance
   */
  getDependency(name) {
    return this.dependencies ? this.dependencies[name] : undefined;
  }

  /**
   * Check if a dependency exists
   * @param {string} name - Dependency name
   * @returns {boolean} Whether the dependency exists
   */
  hasDependency(name) {
    return Boolean(this.dependencies && this.dependencies.hasOwnProperty(name));
  }
}