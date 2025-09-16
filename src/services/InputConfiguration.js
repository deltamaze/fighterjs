/**
 * InputConfiguration defines key bindings and input combinations for fighting game controls
 * Supports movement, combat, and advanced technique configurations
 */
class InputConfiguration {
  constructor() {
    // Default key bindings for fighting game controls
    this.defaultBindings = {
      // Movement controls
      'KeyW': 'moveForward',
      'KeyS': 'moveBackward', 
      'KeyA': 'moveLeft',
      'KeyD': 'moveRight',
      
      // Jump controls
      'Space': 'jump',
      
      // Basic combat
      'KeyJ': 'lightAttack',
      'KeyK': 'heavyAttack',
      'KeyL': 'grab',
      
      // Special techniques
      'KeyI': 'special1',
      'KeyO': 'special2',
      'KeyP': 'special3',
      
      // Advanced movement
      'ShiftLeft': 'dash',
      'KeyC': 'dodge',
      'KeyV': 'block',
      
      // System controls
      'Escape': 'pause',
      'Enter': 'confirm',
      'Backspace': 'cancel'
    };

    // Input combinations for advanced moves and special techniques
    this.inputCombinations = {
      // Movement techniques
      'dashForward': {
        sequence: ['moveForward', 'moveForward'],
        timeWindow: 300, // 300ms window for double-tap dash
        description: 'Double-tap forward to dash forward'
      },
      'dashBackward': {
        sequence: ['moveBackward', 'moveBackward'],
        timeWindow: 300,
        description: 'Double-tap backward to dash backward'
      },
      'dashLeft': {
        sequence: ['moveLeft', 'moveLeft'],
        timeWindow: 300,
        description: 'Double-tap left to dash left'
      },
      'dashRight': {
        sequence: ['moveRight', 'moveRight'],
        timeWindow: 300,
        description: 'Double-tap right to dash right'
      },
      
      // Combat combinations
      'comboAttack1': {
        sequence: ['lightAttack', 'lightAttack', 'heavyAttack'],
        timeWindow: 800,
        description: 'Light -> Light -> Heavy combo'
      },
      'comboAttack2': {
        sequence: ['heavyAttack', 'lightAttack'],
        timeWindow: 500,
        description: 'Heavy -> Light combo'
      },
      'launchers': {
        sequence: ['moveForward', 'heavyAttack'],
        timeWindow: 400,
        description: 'Forward + Heavy Attack launcher'
      },
      
      // Special move inputs (fighting game style)
      'hadoken': {
        sequence: ['moveBackward', 'moveForward', 'lightAttack'],
        timeWindow: 600,
        description: 'Quarter circle forward + Light Attack'
      },
      'shoryuken': {
        sequence: ['moveForward', 'moveBackward', 'moveForward', 'heavyAttack'],
        timeWindow: 700,
        description: 'Dragon punch motion + Heavy Attack'
      },
      'hurricane': {
        sequence: ['moveBackward', 'moveLeft', 'moveForward', 'special1'],
        timeWindow: 800,
        description: 'Half circle + Special button'
      },
      
      // Advanced techniques
      'wavedash': {
        sequence: ['jump', 'dodge'],
        timeWindow: 200,
        description: 'Jump immediately followed by dodge for wavedash'
      },
      'l-cancel': {
        sequence: ['lightAttack', 'dodge'],
        timeWindow: 150,
        description: 'Light attack followed by dodge to cancel lag'
      },
      'dashCancel': {
        sequence: ['heavyAttack', 'dash'],
        timeWindow: 250,
        description: 'Heavy attack cancelled into dash'
      },
      
      // Defensive techniques
      'perfectBlock': {
        sequence: ['block'],
        timeWindow: 100,
        description: 'Frame-perfect block timing',
        requiresPreciseTiming: true
      },
      'counterAttack': {
        sequence: ['block', 'lightAttack'],
        timeWindow: 300,
        description: 'Block followed by immediate counter'
      },
      
      // Multi-input simultaneous combinations
      'superMove1': {
        sequence: ['special1', 'special2'], // Simultaneous press
        timeWindow: 50,
        simultaneous: true,
        description: 'Press Special1 and Special2 simultaneously'
      },
      'superMove2': {
        sequence: ['heavyAttack', 'special3'], // Simultaneous press
        timeWindow: 50,
        simultaneous: true,
        description: 'Press Heavy Attack and Special3 simultaneously'
      },
      
      // Complex multi-directional inputs
      'spinAttack': {
        sequence: ['moveLeft', 'moveBackward', 'moveRight', 'moveForward', 'lightAttack'],
        timeWindow: 1000,
        description: 'Full circle motion + Light Attack'
      }
    };

    // Alternative control schemes
    this.controlSchemes = {
      'default': this.defaultBindings,
      'wasd': {
        ...this.defaultBindings,
        // WASD movement is already default
      },
      'arrows': {
        ...this.defaultBindings,
        'ArrowUp': 'moveForward',
        'ArrowDown': 'moveBackward',
        'ArrowLeft': 'moveLeft',
        'ArrowRight': 'moveRight',
        // Remove WASD bindings
        'KeyW': undefined,
        'KeyS': undefined,
        'KeyA': undefined,
        'KeyD': undefined
      },
      'gamepad': {
        // Gamepad button mappings (for future gamepad support)
        'Button0': 'lightAttack',    // A/X button
        'Button1': 'dodge',          // B/Circle button  
        'Button2': 'heavyAttack',    // X/Square button
        'Button3': 'jump',           // Y/Triangle button
        'Button4': 'block',          // LB/L1
        'Button5': 'grab',           // RB/R1
        'Button6': 'special1',       // LT/L2
        'Button7': 'special2',       // RT/R2
        'Button8': 'cancel',         // Select/Share
        'Button9': 'pause',          // Start/Options
        'Button12': 'moveForward',   // D-pad up
        'Button13': 'moveBackward',  // D-pad down
        'Button14': 'moveLeft',      // D-pad left
        'Button15': 'moveRight'      // D-pad right
      }
    };

    this.currentScheme = 'default';
  }

  /**
   * Get the current key bindings based on selected control scheme
   * @returns {Object} Current key bindings
   */
  getCurrentBindings() {
    const scheme = this.controlSchemes[this.currentScheme];
    const bindings = {};
    
    // Filter out undefined bindings
    for (const [key, action] of Object.entries(scheme)) {
      if (action !== undefined) {
        bindings[key] = action;
      }
    }
    
    return bindings;
  }

  /**
   * Set the active control scheme
   * @param {string} schemeName - Name of the control scheme
   * @throws {Error} If scheme doesn't exist
   */
  setControlScheme(schemeName) {
    if (!this.controlSchemes[schemeName]) {
      throw new Error(`Control scheme '${schemeName}' does not exist`);
    }
    this.currentScheme = schemeName;
  }

  /**
   * Get available control schemes
   * @returns {Array<string>} Array of scheme names
   */
  getAvailableSchemes() {
    return Object.keys(this.controlSchemes);
  }

  /**
   * Get input combination configuration
   * @param {string} combinationName - Name of the combination
   * @returns {Object|null} Combination configuration or null if not found
   */
  getInputCombination(combinationName) {
    return this.inputCombinations[combinationName] || null;
  }

  /**
   * Get all input combinations
   * @returns {Object} All input combinations
   */
  getAllInputCombinations() {
    return { ...this.inputCombinations };
  }

  /**
   * Get combinations by category
   * @param {string} category - Category name (movement, combat, special, etc.)
   * @returns {Object} Filtered combinations
   */
  getCombinationsByCategory(category) {
    const combinations = {};
    
    for (const [name, config] of Object.entries(this.inputCombinations)) {
      // Simple categorization based on name patterns
      let matchesCategory = false;
      
      switch (category) {
        case 'movement':
          matchesCategory = name.includes('dash') || name.includes('wave') || 
                          name.includes('cancel') && name !== 'dashCancel';
          break;
        case 'combat':
          matchesCategory = name.includes('combo') || name.includes('launcher') ||
                          name.includes('cancel') || name.includes('counter');
          break;
        case 'special':
          matchesCategory = name.includes('hadoken') || name.includes('shoryuken') ||
                          name.includes('hurricane') || name.includes('super') ||
                          name.includes('spin');
          break;
        case 'defensive':
          matchesCategory = name.includes('block') || name.includes('counter') ||
                          name.includes('dodge');
          break;
        case 'advanced':
          matchesCategory = name.includes('l-cancel') || name.includes('wavedash') ||
                          name.includes('perfect') || name.includes('frame');
          break;
      }
      
      if (matchesCategory) {
        combinations[name] = config;
      }
    }
    
    return combinations;
  }

  /**
   * Add or modify a custom input combination
   * @param {string} name - Combination name
   * @param {Object} config - Combination configuration
   */
  addInputCombination(name, config) {
    if (!config.sequence || !Array.isArray(config.sequence)) {
      throw new Error('Combination must have a sequence array');
    }
    
    if (!config.timeWindow || typeof config.timeWindow !== 'number') {
      throw new Error('Combination must have a numeric timeWindow');
    }
    
    this.inputCombinations[name] = {
      sequence: [...config.sequence],
      timeWindow: config.timeWindow,
      description: config.description || '',
      simultaneous: config.simultaneous || false,
      requiresPreciseTiming: config.requiresPreciseTiming || false
    };
  }

  /**
   * Remove a custom input combination
   * @param {string} name - Combination name to remove
   */
  removeInputCombination(name) {
    delete this.inputCombinations[name];
  }

  /**
   * Add or modify a custom control scheme
   * @param {string} name - Scheme name
   * @param {Object} bindings - Key bindings object
   */
  addControlScheme(name, bindings) {
    this.controlSchemes[name] = { ...bindings };
  }

  /**
   * Remove a custom control scheme
   * @param {string} name - Scheme name to remove
   */
  removeControlScheme(name) {
    if (name === 'default') {
      throw new Error('Cannot remove default control scheme');
    }
    
    if (this.currentScheme === name) {
      this.currentScheme = 'default';
    }
    
    delete this.controlSchemes[name];
  }

  /**
   * Get action names for a specific category
   * @param {string} category - Category name
   * @returns {Array<string>} Array of action names
   */
  getActionsByCategory(category) {
    const bindings = this.getCurrentBindings();
    const actions = Object.values(bindings);
    
    switch (category) {
      case 'movement':
        return actions.filter(action => 
          action.includes('move') || action === 'jump' || 
          action === 'dash' || action === 'dodge'
        );
      case 'combat':
        return actions.filter(action =>
          action.includes('Attack') || action === 'grab' || 
          action === 'block'
        );
      case 'special':
        return actions.filter(action => action.includes('special'));
      case 'system':
        return actions.filter(action =>
          action === 'pause' || action === 'confirm' || action === 'cancel'
        );
      default:
        return actions;
    }
  }

  /**
   * Validate if a sequence is physically possible to execute
   * @param {Array<string>} sequence - Input sequence to validate
   * @param {number} timeWindow - Time window for the sequence
   * @returns {Object} Validation result with isValid and reason
   */
  validateSequence(sequence, timeWindow) {
    if (!Array.isArray(sequence) || sequence.length === 0) {
      return { isValid: false, reason: 'Sequence must be a non-empty array' };
    }

    // Check for conflicting simultaneous inputs (e.g., moveForward + moveBackward)
    const conflictingPairs = [
      ['moveForward', 'moveBackward'],
      ['moveLeft', 'moveRight']
    ];

    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i];
      const next = sequence[i + 1];
      
      for (const [action1, action2] of conflictingPairs) {
        if ((current === action1 && next === action2) || 
            (current === action2 && next === action1)) {
          // Only invalid if timeWindow is too small for human execution
          if (timeWindow < 100) {
            return { 
              isValid: false, 
              reason: `Conflicting inputs ${action1} and ${action2} too close together` 
            };
          }
        }
      }
    }

    // Check if timeWindow is reasonable for sequence length
    const minTimePerInput = 50; // 50ms minimum between inputs
    const requiredTime = sequence.length * minTimePerInput;
    
    if (timeWindow < requiredTime) {
      return {
        isValid: false,
        reason: `Time window ${timeWindow}ms too short for ${sequence.length} inputs (minimum: ${requiredTime}ms)`
      };
    }

    return { isValid: true, reason: 'Sequence is valid' };
  }
}

export default InputConfiguration;