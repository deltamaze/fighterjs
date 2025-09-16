import InputService from '../../src/services/InputService.js';

// Mock TimeManager for testing
class MockTimeManager {
  constructor() {
    this.currentTime = 0;
  }

  getGameTime() {
    return this.currentTime;
  }

  setTime(time) {
    this.currentTime = time;
  }

  advance(deltaTime) {
    this.currentTime += deltaTime;
  }
}

// Mock DOM events
const createKeyEvent = (type, code) => ({
  code,
  type,
  preventDefault: () => {},
  stopPropagation: () => {}
});

describe('InputService', () => {
  let inputService;
  let mockTimeManager;

  beforeEach(() => {
    mockTimeManager = new MockTimeManager();
    inputService = new InputService({ timeManager: mockTimeManager });
    
    // Clear any existing inputs
    inputService.clearInputs();
  });

  afterEach(() => {
    inputService.destroy();
  });

  describe('Key Binding Registration', () => {
    test('should register key bindings correctly', () => {
      inputService.registerKeyBinding('KeyW', 'moveForward');
      inputService.registerKeyBinding('Space', 'jump');

      const keyBindings = inputService.getKeyBindings();
      const actionBindings = inputService.getActionBindings();

      expect(keyBindings.get('KeyW')).toBe('moveForward');
      expect(keyBindings.get('Space')).toBe('jump');
      expect(actionBindings.get('moveForward')).toBe('KeyW');
      expect(actionBindings.get('jump')).toBe('Space');
    });

    test('should throw error for invalid key binding parameters', () => {
      expect(() => {
        inputService.registerKeyBinding(123, 'action');
      }).toThrow('Key and action must be strings');

      expect(() => {
        inputService.registerKeyBinding('KeyW', null);
      }).toThrow('Key and action must be strings');
    });

    test('should replace existing key bindings', () => {
      inputService.registerKeyBinding('KeyW', 'moveForward');
      inputService.registerKeyBinding('KeyW', 'jump');

      const keyBindings = inputService.getKeyBindings();
      const actionBindings = inputService.getActionBindings();

      expect(keyBindings.get('KeyW')).toBe('jump');
      expect(actionBindings.get('jump')).toBe('KeyW');
      expect(actionBindings.has('moveForward')).toBe(false);
    });

    test('should replace existing action bindings', () => {
      inputService.registerKeyBinding('KeyW', 'jump');
      inputService.registerKeyBinding('Space', 'jump');

      const keyBindings = inputService.getKeyBindings();
      const actionBindings = inputService.getActionBindings();

      expect(actionBindings.get('jump')).toBe('Space');
      expect(keyBindings.get('Space')).toBe('jump');
      expect(keyBindings.has('KeyW')).toBe(false);
    });
  });

  describe('Input State Tracking', () => {
    beforeEach(() => {
      inputService.registerKeyBinding('KeyW', 'moveForward');
      inputService.registerKeyBinding('Space', 'jump');
      inputService.registerKeyBinding('KeyA', 'moveLeft');
    });

    test('should track key press states', () => {
      // Simulate key press
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();

      expect(inputService.isActionPressed('moveForward')).toBe(true);
      expect(inputService.isActionJustPressed('moveForward')).toBe(true);
      expect(inputService.isActionJustReleased('moveForward')).toBe(false);
    });

    test('should track key release states', () => {
      // Press and hold
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();

      expect(inputService.isActionPressed('moveForward')).toBe(true);
      expect(inputService.isActionJustPressed('moveForward')).toBe(true);

      // Next frame - still pressed but not just pressed
      inputService.update();
      expect(inputService.isActionPressed('moveForward')).toBe(true);
      expect(inputService.isActionJustPressed('moveForward')).toBe(false);

      // Release key
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      inputService.update();

      expect(inputService.isActionPressed('moveForward')).toBe(false);
      expect(inputService.isActionJustPressed('moveForward')).toBe(false);
      expect(inputService.isActionJustReleased('moveForward')).toBe(true);
    });

    test('should handle multiple simultaneous inputs', () => {
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyA'));
      inputService.update();

      expect(inputService.isActionPressed('moveForward')).toBe(true);
      expect(inputService.isActionPressed('moveLeft')).toBe(true);
      expect(inputService.isActionJustPressed('moveForward')).toBe(true);
      expect(inputService.isActionJustPressed('moveLeft')).toBe(true);
    });

    test('should prevent key repeat events', () => {
      // First press
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();

      expect(inputService.isActionJustPressed('moveForward')).toBe(true);

      // Simulate repeat event (should be ignored)
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();

      expect(inputService.isActionJustPressed('moveForward')).toBe(false);
      expect(inputService.isActionPressed('moveForward')).toBe(true);
    });

    test('should track press time', () => {
      mockTimeManager.setTime(1000);
      
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();

      expect(inputService.getActionPressTime('moveForward')).toBe(1000);
    });

    test('should return false for unregistered actions', () => {
      expect(inputService.isActionPressed('unregistered')).toBe(false);
      expect(inputService.isActionJustPressed('unregistered')).toBe(false);
      expect(inputService.isActionJustReleased('unregistered')).toBe(false);
      expect(inputService.getActionPressTime('unregistered')).toBe(0);
    });
  });

  describe('Input Buffering', () => {
    beforeEach(() => {
      inputService.registerKeyBinding('KeyW', 'moveForward');
      inputService.registerKeyBinding('Space', 'jump');
      inputService.registerKeyBinding('KeyX', 'attack');
      mockTimeManager.setTime(0);
    });

    test('should buffer input events with timestamps', () => {
      mockTimeManager.setTime(100);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(150);
      inputService.handleKeyDown(createKeyEvent('keydown', 'Space'));
      
      const buffer = inputService.getInputBuffer();
      
      expect(buffer).toHaveLength(2);
      expect(buffer[0]).toMatchObject({
        key: 'KeyW',
        type: 'press',
        timestamp: 100,
        action: 'moveForward'
      });
      expect(buffer[1]).toMatchObject({
        key: 'Space',
        type: 'press',
        timestamp: 150,
        action: 'jump'
      });
    });

    test('should maintain buffer size limit', () => {
      // Add more inputs than buffer size
      for (let i = 0; i < 15; i++) {
        mockTimeManager.setTime(i * 10);
        inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
        inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      }

      const buffer = inputService.getInputBuffer();
      expect(buffer.length).toBeLessThanOrEqual(inputService.bufferSize);
    });

    test('should clean old entries from buffer', () => {
      mockTimeManager.setTime(0);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      // Advance time beyond buffer window
      mockTimeManager.setTime(1200); // Beyond 1000ms window
      inputService.update();
      
      const buffer = inputService.getInputBuffer();
      expect(buffer).toHaveLength(0);
    });

    test('should filter buffer by time window', () => {
      mockTimeManager.setTime(0);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(50);
      inputService.handleKeyDown(createKeyEvent('keydown', 'Space'));
      
      mockTimeManager.setTime(120);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyX'));
      
      // Get buffer with 100ms window from current time (120)
      const buffer = inputService.getInputBuffer(100);
      
      // Should only include Space and KeyX (within 100ms of time 120)
      expect(buffer).toHaveLength(2);
      expect(buffer.find(input => input.key === 'KeyW')).toBeUndefined();
      expect(buffer.find(input => input.key === 'Space')).toBeDefined();
      expect(buffer.find(input => input.key === 'KeyX')).toBeDefined();
    });
  });

  describe('Input Sequence Detection', () => {
    beforeEach(() => {
      inputService.registerKeyBinding('KeyW', 'forward');
      inputService.registerKeyBinding('KeyS', 'back');
      inputService.registerKeyBinding('KeyX', 'attack');
      inputService.registerKeyBinding('KeyZ', 'special');
      mockTimeManager.setTime(0);
    });

    test('should detect simple input sequences', () => {
      // Input sequence: forward -> attack
      mockTimeManager.setTime(10);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(20);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyX'));
      
      mockTimeManager.setTime(30);
      const hasSequence = inputService.checkInputSequence(['forward', 'attack'], 100);
      
      expect(hasSequence).toBe(true);
    });

    test('should detect complex input sequences', () => {
      // Input sequence: forward -> back -> forward -> attack
      const sequence = ['forward', 'back', 'forward', 'attack'];
      
      mockTimeManager.setTime(10);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(20);
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW')); // Release first forward
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyS'));
      
      mockTimeManager.setTime(30);
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyS')); // Release back
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(40);
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW')); // Release second forward
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyX'));
      
      mockTimeManager.setTime(50);
      const hasSequence = inputService.checkInputSequence(sequence, 100);
      
      expect(hasSequence).toBe(true);
    });

    test('should not detect incomplete sequences', () => {
      mockTimeManager.setTime(10);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(20);
      const hasSequence = inputService.checkInputSequence(['forward', 'attack'], 100);
      
      expect(hasSequence).toBe(false);
    });

    test('should not detect sequences outside time window', () => {
      mockTimeManager.setTime(10);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      mockTimeManager.setTime(150); // Outside 100ms window
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyX'));
      
      mockTimeManager.setTime(160);
      const hasSequence = inputService.checkInputSequence(['forward', 'attack'], 100);
      
      expect(hasSequence).toBe(false);
    });

    test('should handle invalid sequence parameters', () => {
      expect(inputService.checkInputSequence([], 100)).toBe(false);
      expect(inputService.checkInputSequence(null, 100)).toBe(false);
      expect(inputService.checkInputSequence('invalid', 100)).toBe(false);
    });
  });

  describe('Player Input State', () => {
    test('should provide player-specific input state', () => {
      const playerState = inputService.getInputState('player1');
      
      expect(playerState).toHaveProperty('actions');
      expect(playerState).toHaveProperty('buffer');
      expect(playerState.actions).toBeInstanceOf(Map);
      expect(Array.isArray(playerState.buffer)).toBe(true);
    });

    test('should maintain separate states for different players', () => {
      const player1State = inputService.getInputState('player1');
      const player2State = inputService.getInputState('player2');
      
      expect(player1State).not.toBe(player2State);
    });
  });

  describe('Utility Methods', () => {
    test('should clear all inputs', () => {
      inputService.registerKeyBinding('KeyW', 'moveForward');
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();
      
      expect(inputService.isActionPressed('moveForward')).toBe(true);
      
      inputService.clearInputs();
      
      expect(inputService.isActionPressed('moveForward')).toBe(false);
      expect(inputService.getInputBuffer()).toHaveLength(0);
    });

    test('should work without TimeManager dependency', () => {
      const serviceWithoutTime = new InputService();
      serviceWithoutTime.registerKeyBinding('KeyW', 'moveForward');
      
      serviceWithoutTime.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      serviceWithoutTime.update();
      
      expect(serviceWithoutTime.isActionPressed('moveForward')).toBe(true);
      
      serviceWithoutTime.destroy();
    });
  });

  describe('Input Configuration Integration', () => {
    let mockInputConfiguration;

    beforeEach(() => {
      // Mock InputConfiguration
      mockInputConfiguration = {
        getCurrentBindings: () => ({
          'KeyW': 'moveForward',
          'KeyS': 'moveBackward',
          'KeyJ': 'lightAttack',
          'KeyK': 'heavyAttack',
          'Space': 'jump'
        }),
        getAllInputCombinations: () => ({
          'dashForward': {
            sequence: ['moveForward', 'moveForward'],
            timeWindow: 300,
            simultaneous: false
          },
          'superMove': {
            sequence: ['lightAttack', 'heavyAttack'],
            timeWindow: 50,
            simultaneous: true
          },
          'perfectBlock': {
            sequence: ['block'],
            timeWindow: 100,
            requiresPreciseTiming: true
          }
        })
      };

      inputService.initializeFromConfiguration(mockInputConfiguration);
    });

    test('should initialize bindings from configuration', () => {
      expect(inputService.isActionPressed('moveForward')).toBe(false);
      expect(inputService.getActionBindings().get('moveForward')).toBe('KeyW');
      expect(inputService.getActionBindings().get('lightAttack')).toBe('KeyJ');
    });

    test('should detect sequential input combinations', () => {
      mockTimeManager.setTime(100);
      
      // Input dash forward sequence
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      
      mockTimeManager.setTime(200);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      
      inputService.update();
      
      expect(inputService.isCombinationDetected('dashForward')).toBe(true);
    });

    test('should detect simultaneous input combinations', () => {
      mockTimeManager.setTime(100);
      
      // Press both buttons simultaneously
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyJ')); // lightAttack
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyK')); // heavyAttack
      
      inputService.update();
      
      expect(inputService.isCombinationDetected('superMove')).toBe(true);
    });

    test('should not detect simultaneous combinations when inputs are too far apart', () => {
      mockTimeManager.setTime(100);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyJ'));
      inputService.update(); // Update to register the first press
      
      mockTimeManager.setTime(200); // 100ms later, outside 50ms window
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyK'));
      inputService.update(); // Update to check combinations
      
      expect(inputService.isCombinationDetected('superMove')).toBe(false);
    });

    test('should handle combination cooldowns', () => {
      mockTimeManager.setTime(100);
      
      // Trigger combination
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      mockTimeManager.setTime(200);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();
      
      expect(inputService.isCombinationDetected('dashForward')).toBe(true);
      expect(inputService.isCombinationOnCooldown('dashForward')).toBe(true);
      
      // Try to trigger again immediately
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      mockTimeManager.setTime(250);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();
      
      expect(inputService.isCombinationDetected('dashForward')).toBe(false); // Should be on cooldown
    });

    test('should clear combination cooldowns after time expires', () => {
      mockTimeManager.setTime(100);
      
      // Trigger combination
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      mockTimeManager.setTime(200);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();
      
      expect(inputService.isCombinationOnCooldown('dashForward')).toBe(true);
      
      // Advance time past cooldown (300ms cooldown)
      mockTimeManager.setTime(600);
      inputService.update();
      
      expect(inputService.isCombinationOnCooldown('dashForward')).toBe(false);
    });

    test('should get remaining cooldown time', () => {
      mockTimeManager.setTime(100);
      
      // Trigger combination
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      mockTimeManager.setTime(200);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();
      
      mockTimeManager.setTime(250);
      const remainingCooldown = inputService.getCombinationCooldown('dashForward');
      
      expect(remainingCooldown).toBeGreaterThan(0);
      expect(remainingCooldown).toBeLessThanOrEqual(300);
    });

    test('should get all detected combinations', () => {
      mockTimeManager.setTime(100);
      
      // Trigger multiple combinations
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyJ'));
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyK'));
      
      inputService.update();
      
      const detected = inputService.getDetectedCombinations();
      expect(detected.has('superMove')).toBe(true);
    });

    test('should clear all combination states', () => {
      mockTimeManager.setTime(100);
      
      // Trigger combination
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      mockTimeManager.setTime(200);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.update();
      
      expect(inputService.isCombinationOnCooldown('dashForward')).toBe(true);
      
      inputService.clearCombinations();
      
      expect(inputService.isCombinationOnCooldown('dashForward')).toBe(false);
      expect(inputService.getDetectedCombinations().size).toBe(0);
    });
  });

  describe('Advanced Combination Detection', () => {
    let mockInputConfiguration;

    beforeEach(() => {
      mockInputConfiguration = {
        getCurrentBindings: () => ({
          'KeyW': 'moveForward',
          'KeyS': 'moveBackward',
          'KeyA': 'moveLeft',
          'KeyD': 'moveRight',
          'KeyJ': 'lightAttack',
          'KeyV': 'block'
        }),
        getAllInputCombinations: () => ({
          'hadoken': {
            sequence: ['moveBackward', 'moveForward', 'lightAttack'],
            timeWindow: 600,
            simultaneous: false
          },
          'perfectBlock': {
            sequence: ['block'],
            timeWindow: 100,
            requiresPreciseTiming: true
          },
          'complexCombo': {
            sequence: ['moveLeft', 'moveBackward', 'moveRight', 'moveForward', 'lightAttack'],
            timeWindow: 1000,
            simultaneous: false
          }
        })
      };

      inputService.initializeFromConfiguration(mockInputConfiguration);
    });

    test('should detect complex fighting game inputs', () => {
      mockTimeManager.setTime(100);
      
      // Input hadoken sequence: back, forward, punch
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyS')); // back
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyS'));
      
      mockTimeManager.setTime(200);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW')); // forward
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      
      mockTimeManager.setTime(300);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyJ')); // light attack
      
      inputService.update();
      
      expect(inputService.isCombinationDetected('hadoken')).toBe(true);
    });

    test('should handle precise timing requirements', () => {
      // Mock the configuration to return precise timing requirement
      mockInputConfiguration.getAllInputCombinations = () => ({
        'perfectBlock': {
          sequence: ['block'],
          timeWindow: 100,
          requiresPreciseTiming: true
        }
      });

      mockTimeManager.setTime(100);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyV'));
      inputService.update();

      // For precise timing, we need to check the internal buffer validation
      // This is a simplified test - in practice, precise timing would require
      // more complex validation logic
      expect(inputService.isCombinationDetected('perfectBlock')).toBe(true);
    });

    test('should detect very complex input sequences', () => {
      // Input complex combo: left, back, right, forward, attack
      const sequence = [
        { key: 'KeyA', time: 100 }, // left
        { key: 'KeyS', time: 200 }, // back  
        { key: 'KeyD', time: 300 }, // right
        { key: 'KeyW', time: 400 }, // forward
        { key: 'KeyJ', time: 500 }  // attack
      ];

      for (const input of sequence) {
        mockTimeManager.setTime(input.time);
        inputService.handleKeyDown(createKeyEvent('keydown', input.key));
        inputService.handleKeyUp(createKeyEvent('keyup', input.key));
      }

      mockTimeManager.setTime(600);
      inputService.update();
      
      expect(inputService.isCombinationDetected('complexCombo')).toBe(true);
    });

    test('should not detect combinations outside time window', () => {
      mockTimeManager.setTime(100);
      
      // Input hadoken but too slowly
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyS'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyS'));
      
      mockTimeManager.setTime(800); // Too much time passed
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyW'));
      inputService.handleKeyUp(createKeyEvent('keyup', 'KeyW'));
      
      mockTimeManager.setTime(900);
      inputService.handleKeyDown(createKeyEvent('keydown', 'KeyJ'));
      
      inputService.update();
      
      expect(inputService.isCombinationDetected('hadoken')).toBe(false);
    });
  });

  describe('Event Listener Management', () => {
    test('should initialize and destroy event listeners properly', () => {
      const originalAddEventListener = window.addEventListener;
      const originalRemoveEventListener = window.removeEventListener;
      
      let addEventListenerCalls = [];
      let removeEventListenerCalls = [];
      
      window.addEventListener = (event, handler) => {
        addEventListenerCalls.push({ event, handler });
      };
      
      window.removeEventListener = (event, handler) => {
        removeEventListenerCalls.push({ event, handler });
      };
      
      const service = new InputService();
      
      expect(addEventListenerCalls.length).toBe(2);
      expect(addEventListenerCalls.some(call => call.event === 'keydown')).toBe(true);
      expect(addEventListenerCalls.some(call => call.event === 'keyup')).toBe(true);
      
      service.destroy();
      
      expect(removeEventListenerCalls.length).toBe(2);
      expect(removeEventListenerCalls.some(call => call.event === 'keydown')).toBe(true);
      expect(removeEventListenerCalls.some(call => call.event === 'keyup')).toBe(true);
      
      // Restore original functions
      window.addEventListener = originalAddEventListener;
      window.removeEventListener = originalRemoveEventListener;
    });
  });
});