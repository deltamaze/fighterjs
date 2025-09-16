/**
 * InputService handles input capture, processing, and buffering
 * Supports key binding registration and frame-perfect technique detection
 */
class InputService {
  constructor(dependencies = {}) {
    this.timeManager = dependencies.timeManager;

    // Key binding maps
    this.keyBindings = new Map(); // key -> action
    this.actionBindings = new Map(); // action -> key

    // Input state tracking
    this.currentInputs = new Set(); // Currently pressed keys
    this.previousInputs = new Set(); // Previous frame's pressed keys
    this.inputStates = new Map(); // action -> { pressed, justPressed, justReleased, pressTime }

    // Input buffering for frame-perfect techniques
    this.inputBuffer = [];
    this.bufferSize = 10; // Buffer last 10 frames of input
    this.bufferWindow = 100; // 100ms window for buffered inputs

    // Player-specific input tracking (for future multiplayer)
    this.playerInputs = new Map();

    // Event listeners
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);

    this.initialize();
  }

  /**
   * Initialize event listeners
   */
  initialize() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
    }
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
    }
  }

  /**
   * Register a key binding
   * @param {string} key - Key code (e.g., 'KeyW', 'Space')
   * @param {string} action - Action name (e.g., 'jump', 'attack')
   */
  registerKeyBinding(key, action) {
    if (typeof key !== 'string' || typeof action !== 'string') {
      throw new Error('Key and action must be strings');
    }

    // Remove existing binding for this key
    const existingAction = this.keyBindings.get(key);
    if (existingAction) {
      this.actionBindings.delete(existingAction);
    }

    // Remove existing binding for this action
    const existingKey = this.actionBindings.get(action);
    if (existingKey) {
      this.keyBindings.delete(existingKey);
    }

    this.keyBindings.set(key, action);
    this.actionBindings.set(action, key);

    // Initialize input state for this action
    this.inputStates.set(action, {
      pressed: false,
      justPressed: false,
      justReleased: false,
      pressTime: 0
    });
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    const key = event.code;

    // Prevent repeat events
    if (this.currentInputs.has(key)) {
      return;
    }

    this.currentInputs.add(key);

    // Add to input buffer with timestamp
    const currentTime = this.timeManager ? this.timeManager.getGameTime() : performance.now();
    this.addToBuffer(key, 'press', currentTime);
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    const key = event.code;
    this.currentInputs.delete(key);

    // Add to input buffer with timestamp
    const currentTime = this.timeManager ? this.timeManager.getGameTime() : performance.now();
    this.addToBuffer(key, 'release', currentTime);
  }

  /**
   * Add input event to buffer
   * @param {string} key - Key code
   * @param {string} type - 'press' or 'release'
   * @param {number} timestamp - Time of input
   */
  addToBuffer(key, type, timestamp) {
    this.inputBuffer.push({
      key,
      type,
      timestamp,
      action: this.keyBindings.get(key) || null
    });

    // Maintain buffer size
    if (this.inputBuffer.length > this.bufferSize) {
      this.inputBuffer.shift();
    }
  }

  /**
   * Update input states - should be called once per frame
   */
  update() {
    const currentTime = this.timeManager ? this.timeManager.getGameTime() : performance.now();

    // Update input states for all registered actions
    for (const [action, state] of this.inputStates) {
      const key = this.actionBindings.get(action);
      const isPressed = key ? this.currentInputs.has(key) : false;
      const wasPressed = key ? this.previousInputs.has(key) : false;

      state.justPressed = isPressed && !wasPressed;
      state.justReleased = !isPressed && wasPressed;
      state.pressed = isPressed;

      if (state.justPressed) {
        state.pressTime = currentTime;
      }
    }

    // Update previous inputs for next frame
    this.previousInputs.clear();
    for (const input of this.currentInputs) {
      this.previousInputs.add(input);
    }

    // Clean old entries from input buffer
    this.cleanInputBuffer(currentTime);
  }

  /**
   * Clean old entries from input buffer
   * @param {number} currentTime - Current timestamp
   */
  cleanInputBuffer(currentTime) {
    this.inputBuffer = this.inputBuffer.filter(
      input => currentTime - input.timestamp <= this.bufferWindow
    );
  }

  /**
   * Check if an action is currently pressed
   * @param {string} action - Action name
   * @returns {boolean}
   */
  isActionPressed(action) {
    const state = this.inputStates.get(action);
    return state ? state.pressed : false;
  }

  /**
   * Check if an action was just pressed this frame
   * @param {string} action - Action name
   * @returns {boolean}
   */
  isActionJustPressed(action) {
    const state = this.inputStates.get(action);
    return state ? state.justPressed : false;
  }

  /**
   * Check if an action was just released this frame
   * @param {string} action - Action name
   * @returns {boolean}
   */
  isActionJustReleased(action) {
    const state = this.inputStates.get(action);
    return state ? state.justReleased : false;
  }

  /**
   * Get the time when an action was pressed
   * @param {string} action - Action name
   * @returns {number} Press time or 0 if not pressed
   */
  getActionPressTime(action) {
    const state = this.inputStates.get(action);
    return state ? state.pressTime : 0;
  }

  /**
   * Get input buffer for frame-perfect technique detection
   * @param {number} timeWindow - Time window in milliseconds (optional)
   * @returns {Array} Array of buffered input events
   */
  getInputBuffer(timeWindow = this.bufferWindow) {
    const currentTime = this.timeManager ? this.timeManager.getGameTime() : performance.now();
    return this.inputBuffer.filter(
      input => currentTime - input.timestamp <= timeWindow
    );
  }

  /**
   * Check for input sequence in buffer (for combos/techniques)
   * @param {Array<string>} sequence - Array of action names in order
   * @param {number} timeWindow - Time window for the sequence
   * @returns {boolean} True if sequence was found in buffer
   */
  checkInputSequence(sequence, timeWindow = this.bufferWindow) {
    if (!Array.isArray(sequence) || sequence.length === 0) {
      return false;
    }

    const buffer = this.getInputBuffer(timeWindow);
    const pressEvents = buffer.filter(input => input.type === 'press' && input.action);

    if (pressEvents.length < sequence.length) {
      return false;
    }

    // Check if the sequence appears in the buffer (in order)
    let sequenceIndex = 0;
    for (const event of pressEvents) {
      if (event.action === sequence[sequenceIndex]) {
        sequenceIndex++;
        if (sequenceIndex === sequence.length) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get input state for a specific player (for future multiplayer support)
   * @param {string} playerId - Player identifier
   * @returns {Object} Player input state
   */
  getInputState(playerId = 'player1') {
    if (!this.playerInputs.has(playerId)) {
      this.playerInputs.set(playerId, {
        actions: new Map(this.inputStates),
        buffer: [...this.inputBuffer]
      });
    }
    return this.playerInputs.get(playerId);
  }

  /**
   * Clear all input states (useful for testing or game state changes)
   */
  clearInputs() {
    this.currentInputs.clear();
    this.previousInputs.clear();
    this.inputBuffer.length = 0;

    for (const state of this.inputStates.values()) {
      state.pressed = false;
      state.justPressed = false;
      state.justReleased = false;
      state.pressTime = 0;
    }
  }

  /**
   * Get all registered key bindings
   * @returns {Map} Map of key -> action bindings
   */
  getKeyBindings() {
    return new Map(this.keyBindings);
  }

  /**
   * Get all registered action bindings
   * @returns {Map} Map of action -> key bindings
   */
  getActionBindings() {
    return new Map(this.actionBindings);
  }
}

export default InputService;