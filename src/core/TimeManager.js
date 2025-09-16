/**
 * TimeManager handles frame-independent timing for consistent gameplay
 * Provides delta time, game time, and time scaling functionality
 */
class TimeManager {
  constructor() {
    this.lastFrameTime = performance.now();
    this.gameStartTime = performance.now();
    this.deltaTime = 0;
    this.timeScale = 1.0;
    this.fixedTimeStep = 1000 / 60; // 60 FPS in milliseconds
    this.maxDeltaTime = 1000 / 30; // Cap at 30 FPS to prevent large jumps
  }

  /**
   * Updates the time manager - should be called once per frame
   */
  update() {
    const currentTime = performance.now();
    const rawDeltaTime = currentTime - this.lastFrameTime;
    
    // Cap delta time to prevent large jumps during lag spikes
    this.deltaTime = Math.min(rawDeltaTime, this.maxDeltaTime) * this.timeScale;
    
    this.lastFrameTime = currentTime;
  }

  /**
   * Gets the time elapsed since the last frame in milliseconds
   * @returns {number} Delta time in milliseconds
   */
  getDeltaTime() {
    return this.deltaTime;
  }

  /**
   * Gets the total elapsed game time since initialization
   * @returns {number} Game time in milliseconds
   */
  getGameTime() {
    return (performance.now() - this.gameStartTime) * this.timeScale;
  }

  /**
   * Gets the fixed timestep for physics calculations
   * @returns {number} Fixed timestep in milliseconds
   */
  getFixedDeltaTime() {
    return this.fixedTimeStep * this.timeScale;
  }

  /**
   * Sets the time scale for slow motion or speed up effects
   * @param {number} scale - Time scale multiplier (1.0 = normal speed)
   */
  setTimeScale(scale) {
    if (typeof scale !== 'number' || scale < 0) {
      throw new Error('Time scale must be a non-negative number');
    }
    this.timeScale = scale;
  }

  /**
   * Gets the current time scale
   * @returns {number} Current time scale
   */
  getTimeScale() {
    return this.timeScale;
  }

  /**
   * Resets the time manager to initial state
   */
  reset() {
    this.lastFrameTime = performance.now();
    this.gameStartTime = performance.now();
    this.deltaTime = 0;
    this.timeScale = 1.0;
  }
}

export default TimeManager;