/**
 * Base Component class for all game objects
 * Provides standardized interface for update, render, and lifecycle management
 */
export class Component {
  /**
   * Create a new Component
   * @param {Object} dependencies - Injected dependencies for the component
   */
  constructor(dependencies = {}) {
    this.dependencies = dependencies;
    this.isActive = true;
    this.isDestroyed = false;
    this.id = this.generateId();
  }

  /**
   * Generate a unique ID for this component
   * @returns {string} Unique identifier
   */
  generateId() {
    return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update the component state
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {Object} gameState - Current game state
   */
  update(deltaTime, gameState) {
    if (!this.isActive || this.isDestroyed) {
      return;
    }
    
    // Base implementation - override in subclasses
    this.onUpdate(deltaTime, gameState);
  }

  /**
   * Render the component
   * @param {THREE.WebGLRenderer} renderer - Three.js renderer
   * @param {THREE.Camera} camera - Three.js camera
   */
  render(renderer, camera) {
    if (!this.isActive || this.isDestroyed) {
      return;
    }
    
    // Base implementation - override in subclasses
    this.onRender(renderer, camera);
  }

  /**
   * Clean up resources and prepare for garbage collection
   */
  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.isActive = false;
    
    // Call cleanup hook
    this.onDestroy();
    
    // Clear dependencies
    this.dependencies = null;
  }

  /**
   * Override this method in subclasses for custom update logic
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {Object} gameState - Current game state
   */
  onUpdate(deltaTime, gameState) {
    // Override in subclasses
  }

  /**
   * Override this method in subclasses for custom render logic
   * @param {THREE.WebGLRenderer} renderer - Three.js renderer
   * @param {THREE.Camera} camera - Three.js camera
   */
  onRender(renderer, camera) {
    // Override in subclasses
  }

  /**
   * Override this method in subclasses for custom cleanup logic
   */
  onDestroy() {
    // Override in subclasses
  }

  /**
   * Set the active state of the component
   * @param {boolean} active - Whether the component should be active
   */
  setActive(active) {
    if (this.isDestroyed) {
      return;
    }
    this.isActive = active;
  }

  /**
   * Get the active state of the component
   * @returns {boolean} Whether the component is active
   */
  getActive() {
    return this.isActive && !this.isDestroyed;
  }

  /**
   * Check if the component has been destroyed
   * @returns {boolean} Whether the component is destroyed
   */
  getDestroyed() {
    return this.isDestroyed;
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