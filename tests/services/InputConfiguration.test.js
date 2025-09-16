import InputConfiguration from '../../src/services/InputConfiguration.js';

describe('InputConfiguration', () => {
  let config;

  beforeEach(() => {
    config = new InputConfiguration();
  });

  describe('Control Schemes', () => {
    test('should provide default key bindings', () => {
      const bindings = config.getCurrentBindings();
      
      expect(bindings['KeyW']).toBe('moveForward');
      expect(bindings['KeyS']).toBe('moveBackward');
      expect(bindings['KeyA']).toBe('moveLeft');
      expect(bindings['KeyD']).toBe('moveRight');
      expect(bindings['Space']).toBe('jump');
      expect(bindings['KeyJ']).toBe('lightAttack');
      expect(bindings['KeyK']).toBe('heavyAttack');
    });

    test('should switch between control schemes', () => {
      config.setControlScheme('arrows');
      const bindings = config.getCurrentBindings();
      
      expect(bindings['ArrowUp']).toBe('moveForward');
      expect(bindings['ArrowDown']).toBe('moveBackward');
      expect(bindings['ArrowLeft']).toBe('moveLeft');
      expect(bindings['ArrowRight']).toBe('moveRight');
      expect(bindings['KeyW']).toBeUndefined();
    });

    test('should throw error for invalid control scheme', () => {
      expect(() => {
        config.setControlScheme('nonexistent');
      }).toThrow("Control scheme 'nonexistent' does not exist");
    });

    test('should list available control schemes', () => {
      const schemes = config.getAvailableSchemes();
      
      expect(schemes).toContain('default');
      expect(schemes).toContain('wasd');
      expect(schemes).toContain('arrows');
      expect(schemes).toContain('gamepad');
    });

    test('should add custom control scheme', () => {
      const customBindings = {
        'KeyQ': 'moveForward',
        'KeyE': 'moveBackward',
        'KeyZ': 'lightAttack'
      };
      
      config.addControlScheme('custom', customBindings);
      config.setControlScheme('custom');
      
      const bindings = config.getCurrentBindings();
      expect(bindings['KeyQ']).toBe('moveForward');
      expect(bindings['KeyE']).toBe('moveBackward');
      expect(bindings['KeyZ']).toBe('lightAttack');
    });

    test('should remove custom control scheme', () => {
      config.addControlScheme('temporary', { 'KeyX': 'test' });
      config.setControlScheme('temporary');
      
      config.removeControlScheme('temporary');
      
      expect(config.getAvailableSchemes()).not.toContain('temporary');
      expect(config.currentScheme).toBe('default'); // Should revert to default
    });

    test('should not allow removing default scheme', () => {
      expect(() => {
        config.removeControlScheme('default');
      }).toThrow('Cannot remove default control scheme');
    });
  });

  describe('Input Combinations', () => {
    test('should provide predefined input combinations', () => {
      const dashForward = config.getInputCombination('dashForward');
      
      expect(dashForward).toMatchObject({
        sequence: ['moveForward', 'moveForward'],
        timeWindow: 300,
        description: 'Double-tap forward to dash forward'
      });
    });

    test('should return null for non-existent combination', () => {
      const result = config.getInputCombination('nonexistent');
      expect(result).toBeNull();
    });

    test('should get all input combinations', () => {
      const combinations = config.getAllInputCombinations();
      
      expect(combinations).toHaveProperty('dashForward');
      expect(combinations).toHaveProperty('hadoken');
      expect(combinations).toHaveProperty('comboAttack1');
      expect(combinations).toHaveProperty('wavedash');
    });

    test('should filter combinations by category', () => {
      const movementCombos = config.getCombinationsByCategory('movement');
      const combatCombos = config.getCombinationsByCategory('combat');
      const specialCombos = config.getCombinationsByCategory('special');
      
      expect(movementCombos).toHaveProperty('dashForward');
      expect(movementCombos).toHaveProperty('wavedash');
      expect(combatCombos).toHaveProperty('comboAttack1');
      expect(combatCombos).toHaveProperty('launchers');
      expect(specialCombos).toHaveProperty('hadoken');
      expect(specialCombos).toHaveProperty('shoryuken');
    });

    test('should add custom input combination', () => {
      const customCombo = {
        sequence: ['jump', 'lightAttack', 'heavyAttack'],
        timeWindow: 500,
        description: 'Custom aerial combo'
      };
      
      config.addInputCombination('customCombo', customCombo);
      
      const result = config.getInputCombination('customCombo');
      expect(result).toMatchObject(customCombo);
    });

    test('should validate combination parameters when adding', () => {
      expect(() => {
        config.addInputCombination('invalid', { timeWindow: 500 });
      }).toThrow('Combination must have a sequence array');

      expect(() => {
        config.addInputCombination('invalid', { sequence: ['test'] });
      }).toThrow('Combination must have a numeric timeWindow');
    });

    test('should remove custom input combination', () => {
      config.addInputCombination('temporary', {
        sequence: ['test'],
        timeWindow: 100
      });
      
      config.removeInputCombination('temporary');
      
      expect(config.getInputCombination('temporary')).toBeNull();
    });
  });

  describe('Action Categories', () => {
    test('should get actions by movement category', () => {
      const movementActions = config.getActionsByCategory('movement');
      
      expect(movementActions).toContain('moveForward');
      expect(movementActions).toContain('moveBackward');
      expect(movementActions).toContain('moveLeft');
      expect(movementActions).toContain('moveRight');
      expect(movementActions).toContain('jump');
      expect(movementActions).toContain('dash');
      expect(movementActions).toContain('dodge');
    });

    test('should get actions by combat category', () => {
      const combatActions = config.getActionsByCategory('combat');
      
      expect(combatActions).toContain('lightAttack');
      expect(combatActions).toContain('heavyAttack');
      expect(combatActions).toContain('grab');
      expect(combatActions).toContain('block');
    });

    test('should get actions by special category', () => {
      const specialActions = config.getActionsByCategory('special');
      
      expect(specialActions).toContain('special1');
      expect(specialActions).toContain('special2');
      expect(specialActions).toContain('special3');
    });

    test('should get actions by system category', () => {
      const systemActions = config.getActionsByCategory('system');
      
      expect(systemActions).toContain('pause');
      expect(systemActions).toContain('confirm');
      expect(systemActions).toContain('cancel');
    });

    test('should return all actions for unknown category', () => {
      const allActions = config.getActionsByCategory('unknown');
      const currentBindings = config.getCurrentBindings();
      const expectedActions = Object.values(currentBindings);
      
      expect(allActions.sort()).toEqual(expectedActions.sort());
    });
  });

  describe('Sequence Validation', () => {
    test('should validate valid sequences', () => {
      const result = config.validateSequence(['moveForward', 'lightAttack'], 300);
      
      expect(result.isValid).toBe(true);
      expect(result.reason).toBe('Sequence is valid');
    });

    test('should reject empty or invalid sequences', () => {
      let result = config.validateSequence([], 300);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Sequence must be a non-empty array');

      result = config.validateSequence(null, 300);
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Sequence must be a non-empty array');
    });

    test('should reject conflicting simultaneous inputs with short time window', () => {
      const result = config.validateSequence(['moveForward', 'moveBackward'], 50);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Conflicting inputs');
    });

    test('should allow conflicting inputs with sufficient time window', () => {
      const result = config.validateSequence(['moveForward', 'moveBackward'], 200);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject sequences with insufficient time window', () => {
      const longSequence = ['moveForward', 'moveBackward', 'lightAttack', 'heavyAttack'];
      const result = config.validateSequence(longSequence, 100);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Time window');
      expect(result.reason).toContain('too short');
    });

    test('should accept sequences with adequate time window', () => {
      const sequence = ['moveForward', 'lightAttack'];
      const result = config.validateSequence(sequence, 200);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Combination Types', () => {
    test('should handle simultaneous input combinations', () => {
      const superMove = config.getInputCombination('superMove1');
      
      expect(superMove.simultaneous).toBe(true);
      expect(superMove.timeWindow).toBe(50); // Short window for simultaneous
      expect(superMove.sequence).toEqual(['special1', 'special2']);
    });

    test('should handle sequential input combinations', () => {
      const hadoken = config.getInputCombination('hadoken');
      
      expect(hadoken.simultaneous).toBeFalsy();
      expect(hadoken.timeWindow).toBe(600);
      expect(hadoken.sequence).toEqual(['moveBackward', 'moveForward', 'lightAttack']);
    });

    test('should handle precise timing combinations', () => {
      const perfectBlock = config.getInputCombination('perfectBlock');
      
      expect(perfectBlock.requiresPreciseTiming).toBe(true);
      expect(perfectBlock.timeWindow).toBe(100); // Very tight window
    });

    test('should handle complex multi-directional combinations', () => {
      const spinAttack = config.getInputCombination('spinAttack');
      
      expect(spinAttack.sequence).toEqual([
        'moveLeft', 'moveBackward', 'moveRight', 'moveForward', 'lightAttack'
      ]);
      expect(spinAttack.timeWindow).toBe(1000); // Longer window for complex input
    });
  });

  describe('Gamepad Support', () => {
    test('should provide gamepad control scheme', () => {
      config.setControlScheme('gamepad');
      const bindings = config.getCurrentBindings();
      
      expect(bindings['Button0']).toBe('lightAttack');
      expect(bindings['Button1']).toBe('dodge');
      expect(bindings['Button2']).toBe('heavyAttack');
      expect(bindings['Button3']).toBe('jump');
      expect(bindings['Button12']).toBe('moveForward'); // D-pad up
    });
  });
});