import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { System } from '../../src/core/System.js';
import { Component } from '../../src/core/Component.js';

describe('System', () => {
  let system;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      mockService: { name: 'mockService' },
      anotherService: { value: 42 }
    };
    system = new System(mockDependencies);
  });

  afterEach(() => {
    if (system && !system.getShutdown()) {
      system.shutdown();
    }
  });

  describe('constructor', () => {
    test('should create a system with default state', () => {
      const newSystem = new System();
      
      expect(newSystem.isInitialized).toBe(false);
      expect(newSystem.isShutdown).toBe(false);
      expect(newSystem.isActive).toBe(true);
      expect(newSystem.id).toBeDefined();
      expect(newSystem.id).toMatch(/^system_\d+_[a-z0-9]+$/);
      expect(newSystem.registeredComponents).toBeInstanceOf(Set);
      expect(newSystem.registeredComponents.size).toBe(0);
    });

    test('should store dependencies', () => {
      expect(system.dependencies).toBe(mockDependencies);
    });

    test('should generate unique IDs', () => {
      const system1 = new System();
      const system2 = new System();
      
      expect(system1.id).not.toBe(system2.id);
    });
  });

  describe('initialize', () => {
    test('should initialize the system', () => {
      expect(system.getInitialized()).toBe(false);
      
      system.initialize();
      
      expect(system.getInitialized()).toBe(true);
    });

    test('should call onInitialize hook', () => {
      const spy = jest.spyOn(system, 'onInitialize');
      
      system.initialize();
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('should not initialize twice', () => {
      const spy = jest.spyOn(system, 'onInitialize');
      
      system.initialize();
      system.initialize();
      
      expect(spy).toHaveBeenCalledTimes(1);
      expect(system.getInitialized()).toBe(true);
    });

    test('should not initialize after shutdown', () => {
      system.shutdown();
      const spy = jest.spyOn(system, 'onInitialize');
      
      system.initialize();
      
      expect(spy).not.toHaveBeenCalled();
      expect(system.getInitialized()).toBe(false);
    });
  });

  describe('update', () => {
    const deltaTime = 0.016;
    const components = [];
    const gameState = { time: 1000 };

    beforeEach(() => {
      system.initialize();
    });

    test('should call onUpdate when active and initialized', () => {
      const spy = jest.spyOn(system, 'onUpdate');
      
      system.update(deltaTime, components, gameState);
      
      expect(spy).toHaveBeenCalledWith(deltaTime, components, gameState);
    });

    test('should not update when not initialized', () => {
      const uninitializedSystem = new System();
      const spy = jest.spyOn(uninitializedSystem, 'onUpdate');
      
      uninitializedSystem.update(deltaTime, components, gameState);
      
      expect(spy).not.toHaveBeenCalled();
    });

    test('should not update when shutdown', () => {
      system.shutdown();
      const spy = jest.spyOn(system, 'onUpdate');
      
      system.update(deltaTime, components, gameState);
      
      expect(spy).not.toHaveBeenCalled();
    });

    test('should not update when inactive', () => {
      system.setActive(false);
      const spy = jest.spyOn(system, 'onUpdate');
      
      system.update(deltaTime, components, gameState);
      
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    beforeEach(() => {
      system.initialize();
    });

    test('should shutdown the system', () => {
      expect(system.getShutdown()).toBe(false);
      
      system.shutdown();
      
      expect(system.getShutdown()).toBe(true);
      expect(system.getActive()).toBe(false);
    });

    test('should call onShutdown hook', () => {
      const spy = jest.spyOn(system, 'onShutdown');
      
      system.shutdown();
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('should clear registered components', () => {
      const component = new Component();
      system.registerComponent(component);
      expect(system.registeredComponents.size).toBe(1);
      
      system.shutdown();
      
      expect(system.registeredComponents.size).toBe(0);
    });

    test('should clear dependencies', () => {
      system.shutdown();
      
      expect(system.dependencies).toBeNull();
    });

    test('should not shutdown twice', () => {
      const spy = jest.spyOn(system, 'onShutdown');
      
      system.shutdown();
      system.shutdown();
      
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('component registration', () => {
    let component1, component2;

    beforeEach(() => {
      component1 = new Component();
      component2 = new Component();
    });

    afterEach(() => {
      component1?.destroy();
      component2?.destroy();
    });

    describe('registerComponent', () => {
      test('should register a component', () => {
        const result = system.registerComponent(component1);
        
        expect(result).toBe(true);
        expect(system.isComponentRegistered(component1)).toBe(true);
        expect(system.getRegisteredComponents().has(component1)).toBe(true);
      });

      test('should call onComponentRegistered hook', () => {
        const spy = jest.spyOn(system, 'onComponentRegistered');
        
        system.registerComponent(component1);
        
        expect(spy).toHaveBeenCalledWith(component1);
      });

      test('should not register null component', () => {
        const result = system.registerComponent(null);
        
        expect(result).toBe(false);
      });

      test('should not register after shutdown', () => {
        system.shutdown();
        
        const result = system.registerComponent(component1);
        
        expect(result).toBe(false);
      });

      test('should register multiple components', () => {
        system.registerComponent(component1);
        system.registerComponent(component2);
        
        expect(system.getRegisteredComponents().size).toBe(2);
        expect(system.isComponentRegistered(component1)).toBe(true);
        expect(system.isComponentRegistered(component2)).toBe(true);
      });
    });

    describe('unregisterComponent', () => {
      beforeEach(() => {
        system.registerComponent(component1);
        system.registerComponent(component2);
      });

      test('should unregister a component', () => {
        const result = system.unregisterComponent(component1);
        
        expect(result).toBe(true);
        expect(system.isComponentRegistered(component1)).toBe(false);
        expect(system.getRegisteredComponents().size).toBe(1);
      });

      test('should call onComponentUnregistered hook', () => {
        const spy = jest.spyOn(system, 'onComponentUnregistered');
        
        system.unregisterComponent(component1);
        
        expect(spy).toHaveBeenCalledWith(component1);
      });

      test('should return false for unregistered component', () => {
        const unregisteredComponent = new Component();
        
        const result = system.unregisterComponent(unregisteredComponent);
        
        expect(result).toBe(false);
        unregisteredComponent.destroy();
      });

      test('should not unregister null component', () => {
        const result = system.unregisterComponent(null);
        
        expect(result).toBe(false);
      });

      test('should not unregister after shutdown', () => {
        system.shutdown();
        
        const result = system.unregisterComponent(component1);
        
        expect(result).toBe(false);
      });
    });

    describe('getRegisteredComponents', () => {
      test('should return a copy of registered components', () => {
        system.registerComponent(component1);
        
        const components = system.getRegisteredComponents();
        
        expect(components).toBeInstanceOf(Set);
        expect(components.has(component1)).toBe(true);
        expect(components).not.toBe(system.registeredComponents); // Should be a copy
      });
    });
  });

  describe('state management', () => {
    describe('setActive/getActive', () => {
      beforeEach(() => {
        system.initialize();
      });

      test('should set and get active state', () => {
        expect(system.getActive()).toBe(true);
        
        system.setActive(false);
        expect(system.getActive()).toBe(false);
        
        system.setActive(true);
        expect(system.getActive()).toBe(true);
      });

      test('should not set active after shutdown', () => {
        system.shutdown();
        
        system.setActive(true);
        
        expect(system.getActive()).toBe(false);
      });

      test('should return false when not initialized', () => {
        const uninitializedSystem = new System();
        
        expect(uninitializedSystem.getActive()).toBe(false);
      });
    });

    describe('getInitialized', () => {
      test('should return initialization state', () => {
        expect(system.getInitialized()).toBe(false);
        
        system.initialize();
        expect(system.getInitialized()).toBe(true);
      });
    });

    describe('getShutdown', () => {
      test('should return shutdown state', () => {
        expect(system.getShutdown()).toBe(false);
        
        system.shutdown();
        expect(system.getShutdown()).toBe(true);
      });
    });
  });

  describe('dependency management', () => {
    describe('getDependency', () => {
      test('should return existing dependency', () => {
        const dependency = system.getDependency('mockService');
        
        expect(dependency).toBe(mockDependencies.mockService);
      });

      test('should return undefined for non-existent dependency', () => {
        const dependency = system.getDependency('nonExistent');
        
        expect(dependency).toBeUndefined();
      });

      test('should return undefined after shutdown', () => {
        system.shutdown();
        
        const dependency = system.getDependency('mockService');
        
        expect(dependency).toBeUndefined();
      });
    });

    describe('hasDependency', () => {
      test('should return true for existing dependency', () => {
        expect(system.hasDependency('mockService')).toBe(true);
        expect(system.hasDependency('anotherService')).toBe(true);
      });

      test('should return false for non-existent dependency', () => {
        expect(system.hasDependency('nonExistent')).toBe(false);
      });

      test('should return false after shutdown', () => {
        system.shutdown();
        
        expect(system.hasDependency('mockService')).toBe(false);
      });
    });
  });

  describe('lifecycle hooks', () => {
    class TestSystem extends System {
      constructor(dependencies) {
        super(dependencies);
        this.initializeCalled = false;
        this.updateCalled = false;
        this.shutdownCalled = false;
        this.componentRegisteredCalled = false;
        this.componentUnregisteredCalled = false;
      }

      onInitialize() {
        this.initializeCalled = true;
      }

      onUpdate(deltaTime, components, gameState) {
        this.updateCalled = true;
        this.lastUpdateArgs = { deltaTime, components, gameState };
      }

      onShutdown() {
        this.shutdownCalled = true;
      }

      onComponentRegistered(component) {
        this.componentRegisteredCalled = true;
        this.lastRegisteredComponent = component;
      }

      onComponentUnregistered(component) {
        this.componentUnregisteredCalled = true;
        this.lastUnregisteredComponent = component;
      }
    }

    let testSystem;

    beforeEach(() => {
      testSystem = new TestSystem();
    });

    afterEach(() => {
      if (testSystem && !testSystem.getShutdown()) {
        testSystem.shutdown();
      }
    });

    test('should call lifecycle hooks in correct order', () => {
      const component = new Component();
      const deltaTime = 0.016;
      const components = [component];
      const gameState = { time: 1000 };

      // Initialize
      testSystem.initialize();
      expect(testSystem.initializeCalled).toBe(true);

      // Register component
      testSystem.registerComponent(component);
      expect(testSystem.componentRegisteredCalled).toBe(true);
      expect(testSystem.lastRegisteredComponent).toBe(component);

      // Update
      testSystem.update(deltaTime, components, gameState);
      expect(testSystem.updateCalled).toBe(true);
      expect(testSystem.lastUpdateArgs).toEqual({ deltaTime, components, gameState });

      // Unregister component
      testSystem.unregisterComponent(component);
      expect(testSystem.componentUnregisteredCalled).toBe(true);
      expect(testSystem.lastUnregisteredComponent).toBe(component);

      // Shutdown
      testSystem.shutdown();
      expect(testSystem.shutdownCalled).toBe(true);

      component.destroy();
    });
  });
});