import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import TimeManager from '../../src/core/TimeManager.js';

describe('TimeManager', () => {
  let timeManager;
  let originalPerformanceNow;
  let mockTime;

  beforeEach(() => {
    // Mock performance.now for predictable testing
    originalPerformanceNow = performance.now;
    mockTime = 0;
    performance.now = () => mockTime;
    
    timeManager = new TimeManager();
    
    // Helper to advance mock time
    global.advanceTime = (ms) => {
      mockTime += ms;
    };
  });

  afterEach(() => {
    performance.now = originalPerformanceNow;
    delete global.advanceTime;
  });

  describe('initialization', () => {
    test('should initialize with default values', () => {
      expect(timeManager.getDeltaTime()).toBe(0);
      expect(timeManager.getTimeScale()).toBe(1.0);
      expect(timeManager.getFixedDeltaTime()).toBe(1000 / 60);
    });

    test('should set initial game time to zero', () => {
      expect(timeManager.getGameTime()).toBe(0);
    });
  });

  describe('update method', () => {
    test('should calculate delta time correctly', () => {
      // First update to establish baseline
      timeManager.update();
      
      // Advance time by 16ms (60 FPS)
      global.advanceTime(16);
      timeManager.update();
      
      expect(timeManager.getDeltaTime()).toBe(16);
    });

    test('should cap delta time to prevent large jumps', () => {
      timeManager.update();
      
      // Advance time by 100ms (simulating lag spike)
      global.advanceTime(100);
      timeManager.update();
      
      // Should be capped at maxDeltaTime (1000/30 = 33.33ms)
      expect(timeManager.getDeltaTime()).toBe(1000 / 30);
    });

    test('should apply time scale to delta time', () => {
      timeManager.setTimeScale(0.5);
      timeManager.update();
      
      global.advanceTime(16);
      timeManager.update();
      
      expect(timeManager.getDeltaTime()).toBe(8); // 16 * 0.5
    });
  });

  describe('getDeltaTime method', () => {
    test('should return frame-independent delta time', () => {
      timeManager.update();
      
      global.advanceTime(20);
      timeManager.update();
      
      expect(timeManager.getDeltaTime()).toBe(20);
    });

    test('should return consistent values between calls', () => {
      timeManager.update();
      global.advanceTime(16);
      timeManager.update();
      
      const deltaTime1 = timeManager.getDeltaTime();
      const deltaTime2 = timeManager.getDeltaTime();
      
      expect(deltaTime1).toBe(deltaTime2);
    });
  });

  describe('getGameTime method', () => {
    test('should return total elapsed game time', () => {
      const startTime = timeManager.getGameTime();
      
      global.advanceTime(100);
      
      expect(timeManager.getGameTime()).toBe(startTime + 100);
    });

    test('should apply time scale to game time', () => {
      timeManager.setTimeScale(2.0);
      
      global.advanceTime(50);
      
      expect(timeManager.getGameTime()).toBe(100); // 50 * 2.0
    });
  });

  describe('getFixedDeltaTime method', () => {
    test('should return fixed timestep for physics', () => {
      expect(timeManager.getFixedDeltaTime()).toBe(1000 / 60);
    });

    test('should apply time scale to fixed delta time', () => {
      timeManager.setTimeScale(0.5);
      
      expect(timeManager.getFixedDeltaTime()).toBe((1000 / 60) * 0.5);
    });
  });

  describe('setTimeScale method', () => {
    test('should set time scale correctly', () => {
      timeManager.setTimeScale(2.0);
      
      expect(timeManager.getTimeScale()).toBe(2.0);
    });

    test('should throw error for negative time scale', () => {
      expect(() => {
        timeManager.setTimeScale(-1);
      }).toThrow('Time scale must be a non-negative number');
    });

    test('should throw error for non-number time scale', () => {
      expect(() => {
        timeManager.setTimeScale('invalid');
      }).toThrow('Time scale must be a non-negative number');
    });

    test('should allow zero time scale for pause functionality', () => {
      expect(() => {
        timeManager.setTimeScale(0);
      }).not.toThrow();
      
      expect(timeManager.getTimeScale()).toBe(0);
    });
  });

  describe('reset method', () => {
    test('should reset all values to initial state', () => {
      // Modify state
      timeManager.setTimeScale(2.0);
      timeManager.update();
      global.advanceTime(100);
      timeManager.update();
      
      // Reset
      timeManager.reset();
      
      expect(timeManager.getDeltaTime()).toBe(0);
      expect(timeManager.getTimeScale()).toBe(1.0);
      expect(timeManager.getGameTime()).toBe(0);
    });
  });

  describe('frame rate independence', () => {
    test('should provide consistent timing at different frame rates', () => {
      // Simulate 60 FPS
      timeManager.update();
      global.advanceTime(16.67); // ~60 FPS
      timeManager.update();
      const deltaTime60fps = timeManager.getDeltaTime();
      
      // Reset and simulate 30 FPS
      timeManager.reset();
      timeManager.update();
      global.advanceTime(33.33); // ~30 FPS
      timeManager.update();
      const deltaTime30fps = timeManager.getDeltaTime();
      
      // Delta times should reflect actual frame durations
      expect(deltaTime60fps).toBeCloseTo(16.67, 1);
      expect(deltaTime30fps).toBeCloseTo(33.33, 1);
    });

    test('should maintain consistent physics timestep regardless of frame rate', () => {
      const fixedDeltaTime = timeManager.getFixedDeltaTime();
      
      // Simulate various frame rates
      timeManager.update();
      global.advanceTime(8); // 120 FPS
      timeManager.update();
      
      expect(timeManager.getFixedDeltaTime()).toBe(fixedDeltaTime);
      
      global.advanceTime(50); // 20 FPS
      timeManager.update();
      
      expect(timeManager.getFixedDeltaTime()).toBe(fixedDeltaTime);
    });
  });

  describe('time scaling effects', () => {
    test('should support slow motion effects', () => {
      timeManager.setTimeScale(0.25); // Quarter speed
      timeManager.update();
      
      global.advanceTime(16); // Use smaller time to avoid capping
      timeManager.update();
      
      expect(timeManager.getDeltaTime()).toBe(4); // 16 * 0.25
    });

    test('should support speed up effects', () => {
      timeManager.setTimeScale(3.0); // Triple speed
      timeManager.update();
      
      global.advanceTime(10);
      timeManager.update();
      
      expect(timeManager.getDeltaTime()).toBe(30); // 10 * 3.0
    });

    test('should support pause functionality', () => {
      timeManager.setTimeScale(0);
      timeManager.update();
      
      global.advanceTime(100);
      timeManager.update();
      
      expect(timeManager.getDeltaTime()).toBe(0);
      expect(timeManager.getFixedDeltaTime()).toBe(0);
    });
  });
});