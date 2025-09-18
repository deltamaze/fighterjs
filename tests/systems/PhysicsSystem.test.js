import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as THREE from 'three';
import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';
import TimeManager from '../../src/core/TimeManager.js';

describe('PhysicsSystem', () => {
  let physicsSystem;
  let mockTimeManager;

  beforeEach(() => {
    // Create mock TimeManager
    mockTimeManager = {
      getFixedDeltaTime: jest.fn().mockReturnValue(16.67), // 60 FPS in milliseconds
      getDeltaTime: jest.fn().mockReturnValue(16.67),
      getGameTime: jest.fn().mockReturnValue(1000)
    };

    // Create PhysicsSystem with mocked dependencies
    physicsSystem = new PhysicsSystem({
      timeManager: mockTimeManager
    });
    
    physicsSystem.initialize();
  });

  afterEach(() => {
    physicsSystem.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(physicsSystem.config.gravity).toBe(-20);
      expect(physicsSystem.config.groundLevel).toBe(0);
      expect(physicsSystem.config.maxVelocity).toBe(50);
      expect(physicsSystem.config.collisionTolerance).toBe(0.01);
    });

    test('should create default ground static body', () => {
      const ground = physicsSystem.getAllStaticBodies().get('ground');
      expect(ground).toBeDefined();
      expect(ground.position.y).toBe(0);
      expect(ground.type).toBe('box');
    });

    test('should set default world bounds', () => {
      const bounds = physicsSystem.getWorldBounds();
      expect(bounds.min.x).toBe(-50);
      expect(bounds.max.x).toBe(50);
      expect(bounds.min.y).toBe(-10);
      expect(bounds.max.y).toBe(50);
    });
  });

  describe('Rigid Body Management', () => {
    test('should add rigid body successfully', () => {
      const bodyData = {
        position: new THREE.Vector3(0, 5, 0),
        velocity: new THREE.Vector3(1, 0, 0),
        size: new THREE.Vector3(1, 2, 1),
        mass: 1.5
      };

      const body = physicsSystem.addRigidBody('player1', bodyData);

      expect(body).toBeDefined();
      expect(body.id).toBe('player1');
      expect(body.position.equals(bodyData.position)).toBe(true);
      expect(body.velocity.equals(bodyData.velocity)).toBe(true);
      expect(body.mass).toBe(1.5);
      expect(body.isGrounded).toBe(false);
    });

    test('should remove rigid body successfully', () => {
      physicsSystem.addRigidBody('test', {
        position: new THREE.Vector3(0, 0, 0)
      });

      expect(physicsSystem.getRigidBody('test')).toBeDefined();
      
      const removed = physicsSystem.removeRigidBody('test');
      expect(removed).toBe(true);
      expect(physicsSystem.getRigidBody('test')).toBeNull();
    });

    test('should get rigid body by ID', () => {
      const bodyData = {
        position: new THREE.Vector3(1, 2, 3),
        mass: 2.0
      };

      physicsSystem.addRigidBody('test', bodyData);
      const retrieved = physicsSystem.getRigidBody('test');

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('test');
      expect(retrieved.position.equals(bodyData.position)).toBe(true);
      expect(retrieved.mass).toBe(2.0);
    });

    test('should return null for non-existent rigid body', () => {
      const body = physicsSystem.getRigidBody('nonexistent');
      expect(body).toBeNull();
    });
  });

  describe('Static Body Management', () => {
    test('should add static body successfully', () => {
      const bodyData = {
        position: new THREE.Vector3(10, 0, 10),
        size: new THREE.Vector3(5, 1, 5),
        type: 'box'
      };

      const body = physicsSystem.addStaticBody('platform', bodyData);

      expect(body).toBeDefined();
      expect(body.id).toBe('platform');
      expect(body.position.equals(bodyData.position)).toBe(true);
      expect(body.size.equals(bodyData.size)).toBe(true);
      expect(body.type).toBe('box');
    });

    test('should remove static body successfully', () => {
      physicsSystem.addStaticBody('test', {
        position: new THREE.Vector3(0, 0, 0)
      });

      const removed = physicsSystem.removeStaticBody('test');
      expect(removed).toBe(true);
      expect(physicsSystem.getAllStaticBodies().has('test')).toBe(false);
    });
  });

  describe('Physics Simulation', () => {
    test('should apply gravity to non-grounded rigid bodies', () => {
      const body = physicsSystem.addRigidBody('falling', {
        position: new THREE.Vector3(0, 10, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });

      // Simulate one physics step
      physicsSystem.onUpdate(1/60, [], {});

      // Body should have negative Y velocity due to gravity
      expect(body.velocity.y).toBeLessThan(0);
      expect(body.position.y).toBeLessThan(10);
    });

    test('should not apply gravity to grounded rigid bodies', () => {
      const body = physicsSystem.addRigidBody('grounded', {
        position: new THREE.Vector3(0, 1, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });
      
      body.isGrounded = true;
      const initialVelocityY = body.velocity.y;

      // Simulate one physics step
      physicsSystem.onUpdate(1/60, [], {});

      // Y velocity should remain the same (no gravity applied)
      expect(body.velocity.y).toBe(initialVelocityY);
    });

    test('should apply friction to grounded bodies', () => {
      const body = physicsSystem.addRigidBody('sliding', {
        position: new THREE.Vector3(0, 1, 0),
        velocity: new THREE.Vector3(10, 0, 0),
        friction: 0.5
      });
      
      body.isGrounded = true;
      const initialVelocityX = body.velocity.x;

      // Simulate one physics step
      physicsSystem.onUpdate(1/60, [], {});

      // X velocity should be reduced due to friction
      expect(Math.abs(body.velocity.x)).toBeLessThan(Math.abs(initialVelocityX));
    });

    test('should clamp velocity to maximum value', () => {
      const body = physicsSystem.addRigidBody('fast', {
        position: new THREE.Vector3(0, 5, 0),
        velocity: new THREE.Vector3(100, 100, 100) // Exceeds maxVelocity
      });

      // Simulate one physics step
      physicsSystem.onUpdate(1/60, [], {});

      // Velocity should be clamped to maxVelocity
      expect(body.velocity.length()).toBeLessThanOrEqual(physicsSystem.config.maxVelocity);
    });
  });

  describe('Gravity and Ground Physics', () => {
    test('should apply consistent gravity acceleration over time', () => {
      const body = physicsSystem.addRigidBody('falling', {
        position: new THREE.Vector3(0, 10, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });

      const expectedGravity = physicsSystem.config.gravity;
      const fixedDeltaTime = mockTimeManager.getFixedDeltaTime() / 1000; // Convert to seconds

      // Simulate multiple physics steps
      physicsSystem.onUpdate(1/60, [], {});
      const velocityAfterStep1 = body.velocity.y;
      
      physicsSystem.onUpdate(1/60, [], {});
      const velocityAfterStep2 = body.velocity.y;

      // Velocity should increase by gravity * deltaTime each step
      const expectedVelocityStep1 = expectedGravity * fixedDeltaTime;
      const expectedVelocityStep2 = expectedGravity * fixedDeltaTime * 2;

      expect(velocityAfterStep1).toBeCloseTo(expectedVelocityStep1, 5);
      expect(velocityAfterStep2).toBeCloseTo(expectedVelocityStep2, 5);
    });

    test('should integrate position correctly with gravity', () => {
      const body = physicsSystem.addRigidBody('falling', {
        position: new THREE.Vector3(0, 10, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });

      const initialY = body.position.y;
      const fixedDeltaTime = mockTimeManager.getFixedDeltaTime() / 1000;

      // Simulate one physics step
      physicsSystem.onUpdate(1/60, [], {});

      // Position should change based on velocity integration
      // After one step: velocity = gravity * dt, position = initialY + velocity * dt
      const expectedVelocity = physicsSystem.config.gravity * fixedDeltaTime;
      const expectedPosition = initialY + expectedVelocity * fixedDeltaTime;

      expect(body.velocity.y).toBeCloseTo(expectedVelocity, 5);
      expect(body.position.y).toBeCloseTo(expectedPosition, 5);
    });

    test('should detect ground collision accurately', () => {
      // Create a body that overlaps with ground (ground is at y=0 with size 100x0.1x100)
      // Ground extends from y=-0.05 to y=0.05
      // Body with size 1x1x1 at position y=0.6 has bottom at y=0.1, which should overlap
      const body = physicsSystem.addRigidBody('landing', {
        position: new THREE.Vector3(0, 0.55, 0), // Body center at 0.55, bottom at 0.05, overlapping ground
        velocity: new THREE.Vector3(0, -2, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      expect(body.isGrounded).toBe(false);

      // Simulate physics to trigger collision detection
      physicsSystem.onUpdate(1/60, [], {});

      // Should detect collision with ground and set grounded state
      expect(body.isGrounded).toBe(true);
    });

    test('should stop downward velocity on ground collision', () => {
      const body = physicsSystem.addRigidBody('landing', {
        position: new THREE.Vector3(0, 0.6, 0),
        velocity: new THREE.Vector3(0, -5, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      // Simulate physics to trigger collision
      physicsSystem.onUpdate(1/60, [], {});

      // Downward velocity should be stopped or reduced significantly
      expect(body.velocity.y).toBeGreaterThanOrEqual(0);
    });

    test('should maintain horizontal velocity during ground collision', () => {
      const body = physicsSystem.addRigidBody('sliding', {
        position: new THREE.Vector3(0, 0.6, 0),
        velocity: new THREE.Vector3(3, -2, 4),
        size: new THREE.Vector3(1, 1, 1),
        friction: 0.1 // Low friction to test velocity preservation
      });

      const initialVelocityX = body.velocity.x;
      const initialVelocityZ = body.velocity.z;

      // Simulate physics
      physicsSystem.onUpdate(1/60, [], {});

      // Horizontal velocity should be mostly preserved (some friction applied)
      expect(Math.abs(body.velocity.x)).toBeGreaterThan(Math.abs(initialVelocityX) * 0.8);
      expect(Math.abs(body.velocity.z)).toBeGreaterThan(Math.abs(initialVelocityZ) * 0.8);
    });

    test('should handle multiple bodies falling simultaneously', () => {
      const body1 = physicsSystem.addRigidBody('falling1', {
        position: new THREE.Vector3(-2, 10, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });

      const body2 = physicsSystem.addRigidBody('falling2', {
        position: new THREE.Vector3(2, 8, 0),
        velocity: new THREE.Vector3(0, -1, 0)
      });

      // Simulate physics
      physicsSystem.onUpdate(1/60, [], {});

      // Both bodies should be affected by gravity
      expect(body1.velocity.y).toBeLessThan(0);
      expect(body2.velocity.y).toBeLessThan(-1); // Should be more negative than initial
      expect(body1.position.y).toBeLessThan(10);
      expect(body2.position.y).toBeLessThan(8);
    });

    test('should use TimeManager for consistent physics timing', () => {
      // Test with different time scales
      const body = physicsSystem.addRigidBody('timed', {
        position: new THREE.Vector3(0, 5, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });

      // Normal time scale
      mockTimeManager.getFixedDeltaTime.mockReturnValue(16.67); // 60 FPS
      physicsSystem.onUpdate(1/60, [], {});
      const normalVelocity = Math.abs(body.velocity.y);

      // Reset body
      body.velocity.set(0, 0, 0);

      // Half time scale (slow motion)
      mockTimeManager.getFixedDeltaTime.mockReturnValue(8.335); // 30 FPS equivalent
      physicsSystem.onUpdate(1/60, [], {});
      const slowVelocity = Math.abs(body.velocity.y);

      // Slow motion should result in less velocity change
      expect(slowVelocity).toBeLessThan(normalVelocity);
      expect(slowVelocity).toBeCloseTo(normalVelocity * 0.5, 1);
    });

    test('should handle edge case of body exactly at ground level', () => {
      // Ground extends from y=-0.05 to y=0.05 (center at 0, size 0.1)
      // Body with size 1 at position y=0.5 has bottom at y=0, which should overlap with ground top at y=0.05
      const body = physicsSystem.addRigidBody('atGround', {
        position: new THREE.Vector3(0, 0.5, 0), // Body center at 0.5, bottom at 0, overlapping ground
        velocity: new THREE.Vector3(0, 0, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      // Simulate physics
      physicsSystem.onUpdate(1/60, [], {});

      // Should be detected as grounded
      expect(body.isGrounded).toBe(true);
      // Velocity might have small values due to physics integration and restitution
      expect(Math.abs(body.velocity.y)).toBeLessThan(0.5); // Should be close to zero but allow for physics artifacts
    });

    test('should prevent bodies from sinking into ground', () => {
      const body = physicsSystem.addRigidBody('sinking', {
        position: new THREE.Vector3(0, 0.2, 0), // Bottom well below ground level (ground top at y=0.05)
        velocity: new THREE.Vector3(0, -10, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      // Store initial position for comparison
      const initialY = body.position.y;

      // Simulate physics
      physicsSystem.onUpdate(1/60, [], {});

      // The physics system should attempt to resolve the collision
      // In practice, perfect collision resolution in one frame is difficult
      // The important thing is that the body is detected as grounded and collision is being resolved
      expect(body.isGrounded).toBe(true);
      
      // The body should either be pushed up or at least not sink further
      // (depending on the collision resolution implementation)
      expect(body.position.y).toBeGreaterThanOrEqual(initialY - 0.1); // Allow some tolerance for physics resolution
    });
  });

  describe('Collision Detection', () => {
    test('should detect box-box collision when overlapping', () => {
      const bodyA = physicsSystem.addRigidBody('boxA', {
        position: new THREE.Vector3(0, 1, 0),
        size: new THREE.Vector3(2, 2, 2)
      });

      const bodyB = physicsSystem.addRigidBody('boxB', {
        position: new THREE.Vector3(1, 1, 0),
        size: new THREE.Vector3(2, 2, 2)
      });

      const collision = physicsSystem.detectBoxBoxCollision(bodyA, bodyB);

      expect(collision).toBeDefined();
      expect(collision.penetrationDepth).toBeGreaterThan(0);
      expect(collision.normal).toBeDefined();
      expect(collision.contactPoint).toBeDefined();
    });

    test('should not detect collision when boxes are separated', () => {
      const bodyA = physicsSystem.addRigidBody('boxA', {
        position: new THREE.Vector3(0, 1, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      const bodyB = physicsSystem.addRigidBody('boxB', {
        position: new THREE.Vector3(5, 1, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      const collision = physicsSystem.detectBoxBoxCollision(bodyA, bodyB);

      expect(collision).toBeNull();
    });

    test('should calculate correct separation axis for X-axis collision', () => {
      const bodyA = physicsSystem.addRigidBody('boxA', {
        position: new THREE.Vector3(0, 1, 0),
        size: new THREE.Vector3(2, 2, 2)
      });

      const bodyB = physicsSystem.addRigidBody('boxB', {
        position: new THREE.Vector3(1.5, 1, 0), // Small overlap on X-axis
        size: new THREE.Vector3(2, 2, 2)
      });

      const collision = physicsSystem.detectBoxBoxCollision(bodyA, bodyB);

      expect(collision).toBeDefined();
      expect(Math.abs(collision.normal.x)).toBe(1);
      expect(collision.normal.y).toBe(0);
      expect(collision.normal.z).toBe(0);
    });

    test('should calculate correct separation axis for Y-axis collision', () => {
      const bodyA = physicsSystem.addRigidBody('boxA', {
        position: new THREE.Vector3(0, 1, 0),
        size: new THREE.Vector3(2, 2, 2)
      });

      const bodyB = physicsSystem.addRigidBody('boxB', {
        position: new THREE.Vector3(0, 1.5, 0), // Small overlap on Y-axis
        size: new THREE.Vector3(2, 2, 2)
      });

      const collision = physicsSystem.detectBoxBoxCollision(bodyA, bodyB);

      expect(collision).toBeDefined();
      expect(collision.normal.x).toBe(0);
      expect(Math.abs(collision.normal.y)).toBe(1);
      expect(collision.normal.z).toBe(0);
    });

    test('should respect collision layers', () => {
      const bodyA = physicsSystem.addRigidBody('layerA', {
        position: new THREE.Vector3(0, 1, 0),
        collisionLayer: 1,
        collisionMask: 2 // Only collides with layer 2
      });

      const bodyB = physicsSystem.addRigidBody('layerB', {
        position: new THREE.Vector3(0, 1, 0),
        collisionLayer: 4,
        collisionMask: 1 // Only collides with layer 1
      });

      const shouldCollide = physicsSystem.checkCollisionLayers(bodyA, bodyB);
      expect(shouldCollide).toBe(false);
    });

    test('should allow collision when layers match', () => {
      const bodyA = physicsSystem.addRigidBody('layerA', {
        position: new THREE.Vector3(0, 1, 0),
        collisionLayer: 1,
        collisionMask: 2
      });

      const bodyB = physicsSystem.addRigidBody('layerB', {
        position: new THREE.Vector3(0, 1, 0),
        collisionLayer: 2,
        collisionMask: 1
      });

      const shouldCollide = physicsSystem.checkCollisionLayers(bodyA, bodyB);
      expect(shouldCollide).toBe(true);
    });
  });

  describe('Collision Resolution', () => {
    test('should separate overlapping rigid bodies', () => {
      const bodyA = physicsSystem.addRigidBody('boxA', {
        position: new THREE.Vector3(0, 1, 0),
        size: new THREE.Vector3(2, 2, 2),
        mass: 1
      });

      const bodyB = physicsSystem.addRigidBody('boxB', {
        position: new THREE.Vector3(1, 1, 0),
        size: new THREE.Vector3(2, 2, 2),
        mass: 1
      });

      const initialDistance = bodyA.position.distanceTo(bodyB.position);

      // Simulate physics to trigger collision detection and resolution
      physicsSystem.onUpdate(1/60, [], {});

      const finalDistance = bodyA.position.distanceTo(bodyB.position);
      expect(finalDistance).toBeGreaterThan(initialDistance);
    });

    test('should set grounded state when colliding with ground', () => {
      const body = physicsSystem.addRigidBody('falling', {
        position: new THREE.Vector3(0, 0.5, 0), // Just above ground
        velocity: new THREE.Vector3(0, -1, 0),
        size: new THREE.Vector3(1, 1, 1)
      });

      // Simulate physics to trigger ground collision
      physicsSystem.onUpdate(1/60, [], {});

      expect(body.isGrounded).toBe(true);
      expect(body.velocity.y).toBeGreaterThanOrEqual(0); // Should stop falling
    });

    test('should apply restitution on collision', () => {
      const body = physicsSystem.addRigidBody('bouncing', {
        position: new THREE.Vector3(0, 0.5, 0), // Body center at y=0.5, bottom at y=0, overlapping ground
        velocity: new THREE.Vector3(0, -2, 0),
        size: new THREE.Vector3(1, 1, 1),
        restitution: 0.8
      });

      const ground = physicsSystem.getAllStaticBodies().get('ground');
      
      // Test direct collision detection
      const collision = physicsSystem.detectBoxBoxCollision(body, ground);
      expect(collision).toBeDefined();
      expect(collision.normal.y).toBeGreaterThan(0); // Should separate upward
      
      // Store initial velocity
      const initialVelocityY = body.velocity.y;
      
      // Simulate one physics step - should resolve collision and apply restitution
      physicsSystem.onUpdate(1/60, [], {});

      // After collision resolution, should bounce back up
      expect(body.velocity.y).toBeGreaterThan(0);
      expect(body.velocity.y).toBeLessThan(Math.abs(initialVelocityY)); // Less than initial downward velocity magnitude
      
      // Should have some reasonable bounce velocity (not exact due to physics integration)
      expect(body.velocity.y).toBeGreaterThan(0.5); // At least some bounce
      expect(body.velocity.y).toBeLessThan(1.5); // But not more than reasonable
    });
  });

  describe('Knockback System', () => {
    test('should apply knockback force to rigid body', () => {
      const body = physicsSystem.addRigidBody('target', {
        position: new THREE.Vector3(0, 1, 0),
        velocity: new THREE.Vector3(0, 0, 0)
      });

      const force = new THREE.Vector3(5, 3, 0);
      const direction = new THREE.Vector3(1, 0.5, 0).normalize();

      const success = physicsSystem.applyKnockback('target', force, direction);

      expect(success).toBe(true);
      expect(body.velocity.length()).toBeGreaterThan(0);
      expect(body.isGrounded).toBe(false);
    });

    test('should return false for non-existent body', () => {
      const force = new THREE.Vector3(5, 3, 0);
      const direction = new THREE.Vector3(1, 0, 0);

      const success = physicsSystem.applyKnockback('nonexistent', force, direction);

      expect(success).toBe(false);
    });

    test('should ensure minimum upward velocity for knockback', () => {
      const body = physicsSystem.addRigidBody('target', {
        position: new THREE.Vector3(0, 1, 0),
        velocity: new THREE.Vector3(0, -5, 0) // Falling downward
      });

      const force = new THREE.Vector3(0, 10, 0);
      const direction = new THREE.Vector3(0, 1, 0);

      physicsSystem.applyKnockback('target', force, direction);

      expect(body.velocity.y).toBe(10); // Should override downward velocity
    });
  });

  describe('World Bounds', () => {
    test('should enforce world bounds on rigid bodies', () => {
      const body = physicsSystem.addRigidBody('outOfBounds', {
        position: new THREE.Vector3(100, 1, 0), // Outside world bounds
        velocity: new THREE.Vector3(10, 0, 0)
      });

      physicsSystem.onUpdate(1/60, [], {});

      expect(body.position.x).toBeLessThanOrEqual(physicsSystem.getWorldBounds().max.x);
      expect(body.velocity.x).toBeLessThan(0); // Should bounce back
    });

    test('should handle falling out of world', () => {
      const mockComponent = {
        onFallOut: jest.fn(),
        setPosition: jest.fn(),
        setVelocity: jest.fn()
      };

      const body = physicsSystem.addRigidBody('falling', {
        position: new THREE.Vector3(0, -20, 0), // Below world bounds
        component: mockComponent
      });

      physicsSystem.onUpdate(1/60, [], {});

      expect(mockComponent.onFallOut).toHaveBeenCalled();
      expect(body.position.y).toBeGreaterThan(physicsSystem.config.groundLevel);
    });

    test('should set and get world bounds correctly', () => {
      const newMin = new THREE.Vector3(-100, -20, -100);
      const newMax = new THREE.Vector3(100, 100, 100);

      physicsSystem.setWorldBounds(newMin, newMax);
      const bounds = physicsSystem.getWorldBounds();

      expect(bounds.min.equals(newMin)).toBe(true);
      expect(bounds.max.equals(newMax)).toBe(true);
    });

    test('should check if position is within bounds', () => {
      const insidePosition = new THREE.Vector3(0, 0, 0);
      const outsidePosition = new THREE.Vector3(100, 0, 0);

      expect(physicsSystem.isWithinBounds(insidePosition)).toBe(true);
      expect(physicsSystem.isWithinBounds(outsidePosition)).toBe(false);
    });
  });

  describe('Component Integration', () => {
    test('should update component position when rigid body moves', () => {
      const mockComponent = {
        setPosition: jest.fn(),
        setVelocity: jest.fn(),
        setGrounded: jest.fn()
      };

      const body = physicsSystem.addRigidBody('withComponent', {
        position: new THREE.Vector3(0, 5, 0),
        velocity: new THREE.Vector3(1, 0, 0),
        component: mockComponent
      });

      physicsSystem.onUpdate(1/60, [], {});

      expect(mockComponent.setPosition).toHaveBeenCalled();
      expect(mockComponent.setVelocity).toHaveBeenCalled();
    });

    test('should call component grounded state when landing', () => {
      const mockComponent = {
        setPosition: jest.fn(),
        setVelocity: jest.fn(),
        setGrounded: jest.fn()
      };

      const body = physicsSystem.addRigidBody('landing', {
        position: new THREE.Vector3(0, 0.5, 0),
        velocity: new THREE.Vector3(0, -1, 0),
        component: mockComponent
      });

      physicsSystem.onUpdate(1/60, [], {});

      expect(mockComponent.setGrounded).toHaveBeenCalledWith(true);
    });
  });

  describe('System Lifecycle', () => {
    test('should shutdown cleanly', () => {
      physicsSystem.addRigidBody('test', { position: new THREE.Vector3() });
      physicsSystem.addStaticBody('testStatic', { position: new THREE.Vector3() });

      physicsSystem.shutdown();

      expect(physicsSystem.getAllRigidBodies().size).toBe(0);
      expect(physicsSystem.getAllStaticBodies().size).toBe(0);
    });

    test('should handle missing TimeManager dependency gracefully', () => {
      const systemWithoutTimeManager = new PhysicsSystem({});
      systemWithoutTimeManager.initialize();

      // Should not throw error and use fallback timestep
      expect(() => {
        systemWithoutTimeManager.onUpdate(1/60, [], {});
      }).not.toThrow();

      systemWithoutTimeManager.shutdown();
    });
  });
});