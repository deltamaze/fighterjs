/**
 * Unit tests for Component base class
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Component } from '../../src/core/Component.js';

describe('Component', () => {
  let component;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      mockService: { name: 'test-service' },
      mockRenderer: { render: jest.fn() }
    };
    component = new Component(mockDependencies);
  });

  afterEach(() => {
    if (component && !component.getDestroyed()) {
      component.destroy();
    }
  });

  describe('Constructor', () => {
    test('should create component with dependencies', () => {
      expect(component.dependencies).toBe(mockDependencies);
      expect(component.isActive).toBe(true);
      expect(component.isDestroyed).toBe(false);
      expect(component.id).toBeDefined();
      expect(typeof component.id).toBe('string');
    });

    test('should create component without dependencies', () => {
      const comp = new Component();
      expect(comp.dependencies).toEqual({});
      expect(comp.isActive).toBe(true);
      expect(comp.isDestroyed).toBe(false);
      comp.destroy();
    });

    test('should generate unique IDs for different components', () => {
      const comp1 = new Component();
      const comp2 = new Component();
      expect(comp1.id).not.toBe(comp2.id);
      comp1.destroy();
      comp2.destroy();
    });
  });

  describe('Update lifecycle', () => {
    test('should call onUpdate when active', () => {
      const spy = jest.spyOn(component, 'onUpdate');
      const deltaTime = 0.016;
      const gameState = { time: 1000 };

      component.update(deltaTime, gameState);

      expect(spy).toHaveBeenCalledWith(deltaTime, gameState);
    });

    test('should not call onUpdate when inactive', () => {
      const spy = jest.spyOn(component, 'onUpdate');
      component.setActive(false);

      component.update(0.016, {});

      expect(spy).not.toHaveBeenCalled();
    });

    test('should not call onUpdate when destroyed', () => {
      const spy = jest.spyOn(component, 'onUpdate');
      component.destroy();

      component.update(0.016, {});

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Render lifecycle', () => {
    test('should call onRender when active', () => {
      const spy = jest.spyOn(component, 'onRender');
      const mockRenderer = { render: jest.fn() };
      const mockCamera = { position: { x: 0, y: 0, z: 0 } };

      component.render(mockRenderer, mockCamera);

      expect(spy).toHaveBeenCalledWith(mockRenderer, mockCamera);
    });

    test('should not call onRender when inactive', () => {
      const spy = jest.spyOn(component, 'onRender');
      component.setActive(false);

      component.render({}, {});

      expect(spy).not.toHaveBeenCalled();
    });

    test('should not call onRender when destroyed', () => {
      const spy = jest.spyOn(component, 'onRender');
      component.destroy();

      component.render({}, {});

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Destroy lifecycle', () => {
    test('should call onDestroy and set destroyed state', () => {
      const spy = jest.spyOn(component, 'onDestroy');

      component.destroy();

      expect(spy).toHaveBeenCalled();
      expect(component.isDestroyed).toBe(true);
      expect(component.isActive).toBe(false);
      expect(component.dependencies).toBeNull();
    });

    test('should not call onDestroy multiple times', () => {
      const spy = jest.spyOn(component, 'onDestroy');

      component.destroy();
      component.destroy();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('should prevent operations after destruction', () => {
      component.destroy();

      component.setActive(true);
      expect(component.getActive()).toBe(false);
    });
  });

  describe('Active state management', () => {
    test('should set and get active state', () => {
      expect(component.getActive()).toBe(true);

      component.setActive(false);
      expect(component.getActive()).toBe(false);

      component.setActive(true);
      expect(component.getActive()).toBe(true);
    });

    test('should not allow activation after destruction', () => {
      component.destroy();
      component.setActive(true);

      expect(component.getActive()).toBe(false);
    });
  });

  describe('Dependency management', () => {
    test('should get dependency by name', () => {
      const service = component.getDependency('mockService');
      expect(service).toBe(mockDependencies.mockService);
    });

    test('should return undefined for non-existent dependency', () => {
      const service = component.getDependency('nonExistent');
      expect(service).toBeUndefined();
    });

    test('should check if dependency exists', () => {
      expect(component.hasDependency('mockService')).toBe(true);
      expect(component.hasDependency('nonExistent')).toBe(false);
    });

    test('should handle null dependencies after destruction', () => {
      component.destroy();
      expect(component.getDependency('mockService')).toBeUndefined();
      expect(component.hasDependency('mockService')).toBe(false);
    });
  });

  describe('Subclass behavior', () => {
    class TestComponent extends Component {
      constructor(dependencies) {
        super(dependencies);
        this.updateCalled = false;
        this.renderCalled = false;
        this.destroyCalled = false;
      }

      onUpdate(deltaTime, gameState) {
        this.updateCalled = true;
        this.lastDeltaTime = deltaTime;
        this.lastGameState = gameState;
      }

      onRender(renderer, camera) {
        this.renderCalled = true;
        this.lastRenderer = renderer;
        this.lastCamera = camera;
      }

      onDestroy() {
        this.destroyCalled = true;
      }
    }

    test('should call subclass lifecycle methods', () => {
      const testComponent = new TestComponent(mockDependencies);
      const deltaTime = 0.016;
      const gameState = { time: 1000 };
      const mockRenderer = { render: jest.fn() };
      const mockCamera = { position: { x: 0, y: 0, z: 0 } };

      testComponent.update(deltaTime, gameState);
      expect(testComponent.updateCalled).toBe(true);
      expect(testComponent.lastDeltaTime).toBe(deltaTime);
      expect(testComponent.lastGameState).toBe(gameState);

      testComponent.render(mockRenderer, mockCamera);
      expect(testComponent.renderCalled).toBe(true);
      expect(testComponent.lastRenderer).toBe(mockRenderer);
      expect(testComponent.lastCamera).toBe(mockCamera);

      testComponent.destroy();
      expect(testComponent.destroyCalled).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle update with null parameters', () => {
      expect(() => component.update(null, null)).not.toThrow();
    });

    test('should handle render with null parameters', () => {
      expect(() => component.render(null, null)).not.toThrow();
    });

    test('should handle component without dependencies', () => {
      const comp = new Component();
      expect(comp.hasDependency('anything')).toBe(false);
      expect(comp.getDependency('anything')).toBeUndefined();
      comp.destroy();
    });
  });
});