import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RenderSystem } from '../../src/systems/RenderSystem.js';

// Mock CameraController
jest.mock('../../src/components/CameraController.js', () => ({
  CameraController: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    setTarget: jest.fn()
  }))
}));

describe('RenderSystem', () => {
  let renderSystem;

  beforeEach(() => {
    renderSystem = new RenderSystem();
  });

  afterEach(() => {
    if (renderSystem) {
      renderSystem.shutdown();
    }
  });

  describe('initialization', () => {
    test('should initialize with default state', () => {
      expect(renderSystem.scene).toBeNull();
      expect(renderSystem.camera).toBeNull();
      expect(renderSystem.renderer).toBeNull();
      expect(renderSystem.canvas).toBeNull();
      expect(renderSystem.cameraController).toBeNull();
      expect(renderSystem.isInitialized).toBe(false);
      expect(renderSystem.renderables).toBeInstanceOf(Set);
      expect(renderSystem.renderables.size).toBe(0);
    });

    test('should handle initialization errors gracefully', () => {
      // Test that initialization errors are caught and logged
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => renderSystem.initialize()).toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize RenderSystem:', 
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('renderable management', () => {
    test('should add renderable components', () => {
      const mockComponent = { render: jest.fn() };
      
      renderSystem.addRenderable(mockComponent);
      
      expect(renderSystem.renderables.has(mockComponent)).toBe(true);
      expect(renderSystem.renderables.size).toBe(1);
    });

    test('should not add components without render method', () => {
      const mockComponent = {};
      
      renderSystem.addRenderable(mockComponent);
      
      expect(renderSystem.renderables.has(mockComponent)).toBe(false);
      expect(renderSystem.renderables.size).toBe(0);
    });

    test('should not add null or undefined components', () => {
      renderSystem.addRenderable(null);
      renderSystem.addRenderable(undefined);
      
      expect(renderSystem.renderables.size).toBe(0);
    });

    test('should remove renderable components', () => {
      const mockComponent = { render: jest.fn() };
      
      renderSystem.addRenderable(mockComponent);
      expect(renderSystem.renderables.size).toBe(1);
      
      renderSystem.removeRenderable(mockComponent);
      
      expect(renderSystem.renderables.has(mockComponent)).toBe(false);
      expect(renderSystem.renderables.size).toBe(0);
    });

    test('should handle removing non-existent components', () => {
      const mockComponent = { render: jest.fn() };
      
      // Should not throw when removing component that was never added
      expect(() => renderSystem.removeRenderable(mockComponent)).not.toThrow();
      expect(renderSystem.renderables.size).toBe(0);
    });
  });

  describe('update and rendering', () => {
    test('should handle update when not initialized', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      renderSystem.update(16.67, [], {});

      expect(consoleSpy).toHaveBeenCalledWith('RenderSystem not initialized');
      
      consoleSpy.mockRestore();
    });

    test('should not call render on components when not initialized', () => {
      const mockComponent = { render: jest.fn() };
      renderSystem.addRenderable(mockComponent);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      renderSystem.update(16.67, [], {});

      expect(mockComponent.render).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getters', () => {
    test('should return null for uninitialized components', () => {
      expect(renderSystem.getScene()).toBeNull();
      expect(renderSystem.getCamera()).toBeNull();
      expect(renderSystem.getRenderer()).toBeNull();
      expect(renderSystem.getCanvas()).toBeNull();
    });
  });

  describe('shutdown', () => {
    test('should handle shutdown when not initialized', () => {
      expect(() => renderSystem.shutdown()).not.toThrow();
      
      expect(renderSystem.scene).toBeNull();
      expect(renderSystem.camera).toBeNull();
      expect(renderSystem.renderer).toBeNull();
      expect(renderSystem.canvas).toBeNull();
      expect(renderSystem.isInitialized).toBe(false);
      expect(renderSystem.renderables.size).toBe(0);
    });

    test('should clear renderables on shutdown', () => {
      const mockComponent = { render: jest.fn() };
      renderSystem.addRenderable(mockComponent);
      
      expect(renderSystem.renderables.size).toBe(1);
      
      renderSystem.shutdown();
      
      expect(renderSystem.renderables.size).toBe(0);
    });
  });

  describe('system interface compliance', () => {
    test('should extend System base class', () => {
      expect(renderSystem.update).toBeDefined();
      expect(renderSystem.initialize).toBeDefined();
      expect(renderSystem.shutdown).toBeDefined();
      expect(typeof renderSystem.update).toBe('function');
      expect(typeof renderSystem.initialize).toBe('function');
      expect(typeof renderSystem.shutdown).toBe('function');
    });

    test('should accept dependencies in constructor', () => {
      const dependencies = { mockDep: 'test' };
      const systemWithDeps = new RenderSystem(dependencies);
      
      expect(systemWithDeps).toBeInstanceOf(RenderSystem);
    });
  });

  describe('resize handling setup', () => {
    test('should have setupResizeHandler method', () => {
      expect(renderSystem.setupResizeHandler).toBeDefined();
      expect(typeof renderSystem.setupResizeHandler).toBe('function');
    });
  });

  describe('lighting setup', () => {
    test('should have setupLighting method', () => {
      expect(renderSystem.setupLighting).toBeDefined();
      expect(typeof renderSystem.setupLighting).toBe('function');
    });
  });

  describe('camera controller integration', () => {
    test('should create camera controller during initialization', () => {
      // Since initialization will fail in test environment, we check that cameraController is created
      expect(() => renderSystem.initialize()).toThrow();
      expect(renderSystem.cameraController).not.toBeNull();
    });

    test('should have setCameraTarget method', () => {
      expect(renderSystem.setCameraTarget).toBeDefined();
      expect(typeof renderSystem.setCameraTarget).toBe('function');
    });

    test('should have getCameraController method', () => {
      expect(renderSystem.getCameraController).toBeDefined();
      expect(typeof renderSystem.getCameraController).toBe('function');
      expect(renderSystem.getCameraController()).toBeNull(); // Initially null
    });

    test('should set camera target when camera and controller exist', () => {
      // Mock successful initialization
      renderSystem.camera = { position: { set: jest.fn() }, lookAt: jest.fn() };
      renderSystem.cameraController = {
        initialize: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
      };

      const mockTarget = { position: { x: 0, y: 0, z: 0 } };
      renderSystem.setCameraTarget(mockTarget);

      expect(renderSystem.cameraController.initialize).toHaveBeenCalledWith(
        renderSystem.camera,
        mockTarget
      );
    });

    test('should handle setCameraTarget when camera controller is null', () => {
      renderSystem.cameraController = null;
      const mockTarget = { position: { x: 0, y: 0, z: 0 } };
      
      expect(() => renderSystem.setCameraTarget(mockTarget)).not.toThrow();
    });

    test('should update camera controller during update cycle', () => {
      // Mock initialized state
      renderSystem.isInitialized = true;
      renderSystem.cameraController = {
        update: jest.fn(),
        destroy: jest.fn()
      };
      renderSystem.renderer = { 
        render: jest.fn(),
        dispose: jest.fn()
      };
      renderSystem.camera = {};
      renderSystem.scene = {};

      const deltaTime = 0.016;
      const gameState = {};

      renderSystem.update(deltaTime, [], gameState);

      expect(renderSystem.cameraController.update).toHaveBeenCalledWith(deltaTime, gameState);
    });

    test('should handle update when camera controller is null', () => {
      renderSystem.isInitialized = true;
      renderSystem.cameraController = null;
      renderSystem.renderer = { 
        render: jest.fn(),
        dispose: jest.fn()
      };
      renderSystem.camera = {};
      renderSystem.scene = {};

      expect(() => renderSystem.update(0.016, [], {})).not.toThrow();
    });

    test('should cleanup camera controller on shutdown', () => {
      const mockCameraController = {
        destroy: jest.fn(),
        update: jest.fn()
      };
      renderSystem.cameraController = mockCameraController;

      renderSystem.shutdown();

      expect(mockCameraController.destroy).toHaveBeenCalled();
      expect(renderSystem.cameraController).toBeNull();
    });

    test('should handle shutdown when camera controller is null', () => {
      renderSystem.cameraController = null;
      
      expect(() => renderSystem.shutdown()).not.toThrow();
    });
  });
});