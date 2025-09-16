import { describe, test, expect, beforeEach } from '@jest/globals';
import { DIContainer } from '../../src/core/DIContainer.js';

describe('DIContainer', () => {
  let container;

  beforeEach(() => {
    container = new DIContainer();
  });

  test('should register and resolve singleton services', () => {
    let instanceCount = 0;
    
    container.registerSingleton('testService', () => {
      instanceCount++;
      return { id: instanceCount };
    });

    const instance1 = container.resolve('testService');
    const instance2 = container.resolve('testService');

    expect(instance1).toBe(instance2);
    expect(instanceCount).toBe(1);
    expect(instance1.id).toBe(1);
  });

  test('should register and resolve factory services', () => {
    let instanceCount = 0;
    
    container.registerFactory('testFactory', () => {
      instanceCount++;
      return { id: instanceCount };
    });

    const instance1 = container.resolve('testFactory');
    const instance2 = container.resolve('testFactory');

    expect(instance1).not.toBe(instance2);
    expect(instanceCount).toBe(2);
    expect(instance1.id).toBe(1);
    expect(instance2.id).toBe(2);
  });

  test('should register and resolve direct instances', () => {
    const testInstance = { name: 'test' };
    
    container.registerInstance('testInstance', testInstance);
    
    const resolved = container.resolve('testInstance');
    expect(resolved).toBe(testInstance);
  });

  test('should throw error for unregistered services', () => {
    expect(() => {
      container.resolve('nonExistentService');
    }).toThrow("Service 'nonExistentService' not found in container");
  });

  test('should check if service exists', () => {
    container.registerSingleton('existingService', () => ({}));
    
    expect(container.has('existingService')).toBe(true);
    expect(container.has('nonExistentService')).toBe(false);
  });

  test('should clear all services', () => {
    container.registerSingleton('service1', () => ({}));
    container.registerFactory('service2', () => ({}));
    container.registerInstance('service3', {});
    
    expect(container.has('service1')).toBe(true);
    expect(container.has('service2')).toBe(true);
    expect(container.has('service3')).toBe(true);
    
    container.clear();
    
    expect(container.has('service1')).toBe(false);
    expect(container.has('service2')).toBe(false);
    expect(container.has('service3')).toBe(false);
  });

  test('should support dependency injection in factories', () => {
    container.registerSingleton('dependency', () => ({ value: 'injected' }));
    container.registerSingleton('service', (container) => {
      const dep = container.resolve('dependency');
      return { dependency: dep };
    });

    const service = container.resolve('service');
    expect(service.dependency.value).toBe('injected');
  });

  test('should create child containers with inheritance', () => {
    container.registerSingleton('parentService', () => ({ type: 'parent' }));
    
    const child = container.createChild();
    child.registerSingleton('childService', () => ({ type: 'child' }));
    
    // Child can access parent services
    expect(child.resolve('parentService').type).toBe('parent');
    
    // Child has its own services
    expect(child.resolve('childService').type).toBe('child');
    
    // Parent cannot access child services
    expect(() => container.resolve('childService')).toThrow();
  });
});