import { jest } from '@jest/globals';
import { Player } from '../../src/components/Player.js';
import * as THREE from 'three';

// Mock Three.js to avoid WebGL context issues in tests
jest.mock('three', () => {
  const originalModule = jest.requireActual('three');
  
  return {
    ...originalModule,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn()
    })),
    BoxGeometry: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    MeshLambertMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn()
    })),
    Mesh: jest.fn().mockImplementation((geometry, material) => ({
      geometry,
      material,
      position: new originalModule.Vector3(),
      rotation: new originalModule.Euler(),
      scale: new originalModule.Vector3(1, 1, 1)
    })),
    Group: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
      traverse: jest.fn(),
      position: new originalModule.Vector3(),
      rotation: new originalModule.Euler(),
      parent: null
    }))
  };
});

describe('Player Component', () => {
  let player;
  let mockDependencies;

  beforeEach(() => {
    mockDependencies = {
      inputService: { getInputState: jest.fn() },
      physicsService: { applyForce: jest.fn() },
      audioService: { playSound: jest.fn() }
    };
    
    player = new Player(mockDependencies);
  });

  afterEach(() => {
    if (player) {
      player.destroy();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should create player with default configuration', () => {
      expect(player).toBeInstanceOf(Player);
      expect(player.config.size.width).toBe(1);
      expect(player.config.size.height).toBe(2);
      expect(player.config.size.depth).toBe(0.5);
      expect(player.config.color).toBe(0x4a90e2);
      expect(player.config.playerId).toBe(1);
    });

    test('should create player with custom configuration', () => {
      const customConfig = {
        size: { width: 2, height: 3, depth: 1 },
        color: 0xff0000,
        playerId: 2
      };
      const customPlayer = new Player({}, customConfig);
      
      expect(customPlayer.config.size.width).toBe(2);
      expect(customPlayer.config.size.height).toBe(3);
      expect(customPlayer.config.size.depth).toBe(1);
      expect(customPlayer.config.color).toBe(0xff0000);
      expect(customPlayer.config.playerId).toBe(2);
      
      customPlayer.destroy();
    });

    test('should initialize with correct default state', () => {
      const state = player.getState();
      
      expect(state.position).toEqual(new THREE.Vector3(0, 1, 0));
      expect(state.rotation).toEqual(new THREE.Euler(0, 0, 0));
      expect(state.velocity).toEqual(new THREE.Vector3(0, 0, 0));
      expect(state.damagePercentage).toBe(0);
      expect(state.isGrounded).toBe(false);
      expect(state.hasDoubleJump).toBe(true);
      expect(state.currentAction).toBe('idle');
      expect(state.actionFrames).toBe(0);
      expect(state.invulnerabilityFrames).toBe(0);
    });

    test('should initialize with correct stats', () => {
      const stats = player.getStats();
      
      expect(stats.speed).toBe(5.0);
      expect(stats.jumpHeight).toBe(8.0);
      expect(stats.dashDistance).toBe(3.0);
      expect(stats.attackPower).toBe(10.0);
    });

    test('should create Three.js group and mesh', () => {
      expect(player.getThreeGroup()).toBeDefined();
      expect(player.getMainMesh()).toBeDefined();
    });
  });

  describe('Position Management', () => {
    test('should get and set position correctly', () => {
      const newPosition = new THREE.Vector3(5, 10, -3);
      player.setPosition(newPosition);
      
      const retrievedPosition = player.getPosition();
      expect(retrievedPosition).toEqual(newPosition);
      expect(retrievedPosition).not.toBe(newPosition); // Should be a clone
    });

    test('should set position from object', () => {
      player.setPosition({ x: 2, y: 4, z: -1 });
      
      const position = player.getPosition();
      expect(position.x).toBe(2);
      expect(position.y).toBe(4);
      expect(position.z).toBe(-1);
    });

    test('should handle partial position object', () => {
      player.setPosition({ x: 3, z: -2 });
      
      const position = player.getPosition();
      expect(position.x).toBe(3);
      expect(position.y).toBe(0);
      expect(position.z).toBe(-2);
    });
  });

  describe('Rotation Management', () => {
    test('should get and set rotation correctly', () => {
      const newRotation = new THREE.Euler(0.5, 1.0, 0.2);
      player.setRotation(newRotation);
      
      const retrievedRotation = player.getRotation();
      expect(retrievedRotation).toEqual(newRotation);
      expect(retrievedRotation).not.toBe(newRotation); // Should be a clone
    });

    test('should set rotation from object', () => {
      player.setRotation({ x: 0.1, y: 0.5, z: 0.3 });
      
      const rotation = player.getRotation();
      expect(rotation.x).toBe(0.1);
      expect(rotation.y).toBe(0.5);
      expect(rotation.z).toBe(0.3);
    });
  });

  describe('Velocity Management', () => {
    test('should get and set velocity correctly', () => {
      const newVelocity = new THREE.Vector3(2, 5, -1);
      player.setVelocity(newVelocity);
      
      const retrievedVelocity = player.getVelocity();
      expect(retrievedVelocity).toEqual(newVelocity);
      expect(retrievedVelocity).not.toBe(newVelocity); // Should be a clone
    });

    test('should set velocity from object', () => {
      player.setVelocity({ x: 1, y: 3, z: -2 });
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(1);
      expect(velocity.y).toBe(3);
      expect(velocity.z).toBe(-2);
    });
  });

  describe('Damage Management', () => {
    test('should get and set damage percentage', () => {
      player.setDamagePercentage(50);
      expect(player.getDamagePercentage()).toBe(50);
    });

    test('should clamp damage percentage to valid range', () => {
      player.setDamagePercentage(-10);
      expect(player.getDamagePercentage()).toBe(0);
      
      player.setDamagePercentage(1000);
      expect(player.getDamagePercentage()).toBe(999);
    });

    test('should apply damage correctly', () => {
      player.setDamagePercentage(20);
      player.takeDamage(30);
      expect(player.getDamagePercentage()).toBe(50);
    });

    test('should clamp damage when applying', () => {
      player.setDamagePercentage(990);
      player.takeDamage(20);
      expect(player.getDamagePercentage()).toBe(999);
    });
  });

  describe('Grounded State Management', () => {
    test('should get and set grounded state', () => {
      expect(player.isGrounded()).toBe(false);
      
      player.setGrounded(true);
      expect(player.isGrounded()).toBe(true);
    });

    test('should reset double jump when landing', () => {
      // Set hasDoubleJump directly on the state object
      player.state.hasDoubleJump = false;
      
      player.setGrounded(true);
      expect(player.getState().hasDoubleJump).toBe(true);
    });
  });

  describe('Action Management', () => {
    test('should get and set current action', () => {
      expect(player.getCurrentAction()).toBe('idle');
      
      player.setAction('attack', 30);
      expect(player.getCurrentAction()).toBe('attack');
      expect(player.getState().actionFrames).toBe(30);
    });

    test('should set action without frames', () => {
      player.setAction('jump');
      expect(player.getCurrentAction()).toBe('jump');
      expect(player.getState().actionFrames).toBe(0);
    });
  });

  describe('Update Logic', () => {
    beforeEach(() => {
      // Mock input service for update logic tests
      const mockInputService = {
        isActionPressed: jest.fn().mockReturnValue(false)
      };
      player.dependencies.inputService = mockInputService;
    });

    test('should update action frames', () => {
      player.setAction('attack', 5);
      
      player.update(0.016, {});
      expect(player.getState().actionFrames).toBe(4);
      
      player.update(0.016, {});
      expect(player.getState().actionFrames).toBe(3);
    });

    test('should not decrement action frames below zero', () => {
      player.setAction('idle', 0);
      
      player.update(0.016, {});
      expect(player.getState().actionFrames).toBe(0);
    });

    test('should update invulnerability frames', () => {
      // Set invulnerability frames directly on the state object
      player.state.invulnerabilityFrames = 3;
      
      player.update(0.016, {});
      expect(player.getState().invulnerabilityFrames).toBe(2);
      
      player.update(0.016, {});
      expect(player.getState().invulnerabilityFrames).toBe(1);
    });

    test('should not update when inactive', () => {
      player.setAction('attack', 5);
      player.setActive(false);
      
      player.update(0.016, {});
      expect(player.getState().actionFrames).toBe(5); // Should not change
    });

    test('should not update when destroyed', () => {
      player.setAction('attack', 5);
      player.destroy();
      
      player.update(0.016, {});
      expect(player.getState().actionFrames).toBe(5); // Should not change
    });
  });

  describe('State Serialization', () => {
    test('should return complete state object', () => {
      player.setPosition({ x: 1, y: 2, z: 3 });
      player.setRotation({ x: 0.1, y: 0.2, z: 0.3 });
      player.setVelocity({ x: 4, y: 5, z: 6 });
      player.setDamagePercentage(75);
      player.setGrounded(true);
      player.setAction('dash', 10);
      
      const state = player.getState();
      
      expect(state.position).toEqual(new THREE.Vector3(1, 2, 3));
      expect(state.rotation).toEqual(new THREE.Euler(0.1, 0.2, 0.3));
      expect(state.velocity).toEqual(new THREE.Vector3(4, 5, 6));
      expect(state.damagePercentage).toBe(75);
      expect(state.isGrounded).toBe(true);
      expect(state.hasDoubleJump).toBe(true);
      expect(state.currentAction).toBe('dash');
      expect(state.actionFrames).toBe(10);
      expect(state.invulnerabilityFrames).toBe(0);
    });

    test('should return cloned state objects', () => {
      const state1 = player.getState();
      const state2 = player.getState();
      
      expect(state1).toEqual(state2);
      expect(state1.position).not.toBe(state2.position);
      expect(state1.rotation).not.toBe(state2.rotation);
      expect(state1.velocity).not.toBe(state2.velocity);
    });
  });

  describe('Resource Management', () => {
    test('should clean up Three.js resources on destroy', () => {
      const mockGeometry = { dispose: jest.fn() };
      const mockMaterial = { dispose: jest.fn() };
      const mockChild = { geometry: mockGeometry, material: mockMaterial };
      
      // Mock the traverse method to call the callback with our mock child
      player.group.traverse = jest.fn((callback) => {
        callback(mockChild);
      });
      
      player.destroy();
      
      expect(player.group.traverse).toHaveBeenCalled();
      expect(mockGeometry.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
    });

    test('should handle material arrays on destroy', () => {
      const mockMaterial1 = { dispose: jest.fn() };
      const mockMaterial2 = { dispose: jest.fn() };
      const mockChild = { 
        geometry: { dispose: jest.fn() }, 
        material: [mockMaterial1, mockMaterial2] 
      };
      
      player.group.traverse = jest.fn((callback) => {
        callback(mockChild);
      });
      
      player.destroy();
      
      expect(mockMaterial1.dispose).toHaveBeenCalled();
      expect(mockMaterial2.dispose).toHaveBeenCalled();
    });

    test('should remove from parent on destroy if has parent', () => {
      const mockParent = { remove: jest.fn() };
      player.group.parent = mockParent;
      
      player.destroy();
      
      expect(mockParent.remove).toHaveBeenCalledWith(player.group);
    });
  });

  describe('Configuration and Stats Access', () => {
    test('should return cloned configuration', () => {
      const config1 = player.getConfig();
      const config2 = player.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });

    test('should return cloned stats', () => {
      const stats1 = player.getStats();
      const stats2 = player.getStats();
      
      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2);
    });
  });

  describe('Movement Input Processing', () => {
    let mockInputService;

    beforeEach(() => {
      mockInputService = {
        isActionPressed: jest.fn().mockReturnValue(false)
      };
      player.dependencies.inputService = mockInputService;
    });

    test('should handle forward movement input', () => {
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveForward');
      
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.z).toBe(-player.stats.speed);
      expect(player.getCurrentAction()).toBe('moving');
    });

    test('should handle backward movement input', () => {
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveBackward');
      
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.z).toBe(player.stats.speed);
      expect(player.getCurrentAction()).toBe('moving');
    });

    test('should handle left movement input', () => {
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveLeft');
      
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(-player.stats.speed);
      expect(velocity.z).toBe(0);
      expect(player.getCurrentAction()).toBe('moving');
    });

    test('should handle right movement input', () => {
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveRight');
      
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(player.stats.speed);
      expect(velocity.z).toBe(0);
      expect(player.getCurrentAction()).toBe('moving');
    });

    test('should handle diagonal movement with normalized speed', () => {
      mockInputService.isActionPressed.mockImplementation((action) => 
        action === 'moveForward' || action === 'moveRight'
      );
      
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      const expectedSpeed = player.stats.speed / Math.sqrt(2); // Normalized diagonal
      expect(velocity.x).toBeCloseTo(expectedSpeed, 5);
      expect(velocity.z).toBeCloseTo(-expectedSpeed, 5);
      expect(player.getCurrentAction()).toBe('moving');
    });

    test('should stop horizontal movement when no input', () => {
      // First set some velocity
      player.setVelocity({ x: 5, y: 2, z: -3 });
      
      // No movement input
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.z).toBe(0);
      expect(velocity.y).toBe(2); // Vertical velocity should be preserved
      expect(player.getCurrentAction()).toBe('idle');
    });

    test('should preserve vertical velocity during horizontal movement', () => {
      player.setVelocity({ x: 0, y: 10, z: 0 });
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveForward');
      
      player.handleMovementInput(0.016);
      
      const velocity = player.getVelocity();
      expect(velocity.y).toBe(10); // Vertical velocity preserved
      expect(velocity.z).toBe(-player.stats.speed);
    });

    test('should not change action if already in special action', () => {
      player.setAction('attack', 30);
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveForward');
      
      player.handleMovementInput(0.016);
      
      expect(player.getCurrentAction()).toBe('attack');
    });

    test('should handle no input service gracefully', () => {
      player.dependencies.inputService = null;
      
      expect(() => {
        player.handleMovementInput(0.016);
      }).not.toThrow();
    });
  });

  describe('Physics and Movement Updates', () => {
    test('should apply gravity when not grounded', () => {
      player.setGrounded(false);
      player.setVelocity({ x: 0, y: 5, z: 0 });
      
      player.updateMovement(0.1); // 100ms
      
      const velocity = player.getVelocity();
      expect(velocity.y).toBe(3); // 5 + (-20 * 0.1) = 3
    });

    test('should not apply gravity when grounded', () => {
      player.setGrounded(true);
      player.setVelocity({ x: 0, y: 0, z: 0 });
      
      player.updateMovement(0.1);
      
      const velocity = player.getVelocity();
      expect(velocity.y).toBe(0);
    });

    test('should update position based on velocity', () => {
      player.setPosition({ x: 0, y: 2, z: 0 });
      player.setVelocity({ x: 5, y: 10, z: -3 });
      
      player.updateMovement(0.1); // 100ms
      
      const position = player.getPosition();
      expect(position.x).toBeCloseTo(0.5, 5); // 0 + (5 * 0.1)
      expect(position.z).toBeCloseTo(-0.3, 5); // 0 + (-3 * 0.1)
    });

    test('should detect ground collision and stop falling', () => {
      const groundLevel = 0;
      const playerHeight = player.config.size.height;
      
      // Position player slightly above ground with downward velocity
      player.setPosition({ x: 0, y: groundLevel + playerHeight / 2 + 0.1, z: 0 });
      player.setVelocity({ x: 0, y: -5, z: 0 });
      player.setGrounded(false);
      
      player.updateMovement(0.1);
      
      const position = player.getPosition();
      const velocity = player.getVelocity();
      
      expect(position.y).toBe(groundLevel + playerHeight / 2);
      expect(velocity.y).toBe(0);
      expect(player.isGrounded()).toBe(true);
    });

    test('should set grounded to false when above ground', () => {
      player.setPosition({ x: 0, y: 5, z: 0 });
      player.setGrounded(true);
      
      player.updateMovement(0.016);
      
      expect(player.isGrounded()).toBe(false);
    });

    test('should prevent falling through the world', () => {
      const groundLevel = 0;
      const playerHeight = player.config.size.height;
      
      // Position player below ground level
      player.setPosition({ x: 0, y: groundLevel + playerHeight / 2 - 1, z: 0 });
      player.setVelocity({ x: 0, y: -10, z: 0 });
      
      player.updateMovement(0.016);
      
      const position = player.getPosition();
      const velocity = player.getVelocity();
      
      expect(position.y).toBe(groundLevel + playerHeight / 2);
      expect(velocity.y).toBeGreaterThanOrEqual(0);
      expect(player.isGrounded()).toBe(true);
    });

    test('should only land when moving downward', () => {
      const groundLevel = 0;
      const playerHeight = player.config.size.height;
      
      // Position player at ground level but moving upward
      player.setPosition({ x: 0, y: groundLevel + playerHeight / 2, z: 0 });
      player.setVelocity({ x: 0, y: 5, z: 0 });
      player.setGrounded(false);
      
      player.updateMovement(0.016);
      
      // Should not be grounded since moving upward
      expect(player.isGrounded()).toBe(false);
    });
  });

  describe('Integrated Movement System', () => {
    let mockInputService;

    beforeEach(() => {
      mockInputService = {
        isActionPressed: jest.fn().mockReturnValue(false)
      };
      player.dependencies.inputService = mockInputService;
    });

    test('should handle complete movement cycle with input and physics', () => {
      // Start with player on ground
      player.setPosition({ x: 0, y: 1, z: 0 });
      player.setGrounded(true);
      
      // Simulate forward movement input
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveForward');
      
      // Update for one frame
      player.onUpdate(0.016, {});
      
      const velocity = player.getVelocity();
      const position = player.getPosition();
      
      // Should have forward velocity and updated position
      expect(velocity.z).toBe(-player.stats.speed);
      expect(position.z).toBeCloseTo(-player.stats.speed * 0.016, 5);
      expect(player.getCurrentAction()).toBe('moving');
      expect(player.isGrounded()).toBe(true);
    });

    test('should handle air movement with gravity', () => {
      // Start with player in air
      player.setPosition({ x: 0, y: 5, z: 0 });
      player.setVelocity({ x: 0, y: 2, z: 0 });
      player.setGrounded(false);
      
      // Simulate right movement input
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveRight');
      
      // Update for one frame
      player.onUpdate(0.016, {});
      
      const velocity = player.getVelocity();
      const position = player.getPosition();
      
      // Should have horizontal movement and gravity applied
      expect(velocity.x).toBe(player.stats.speed);
      expect(velocity.y).toBeCloseTo(2 + (-20 * 0.016), 5); // Gravity applied
      expect(position.x).toBeCloseTo(player.stats.speed * 0.016, 5);
      expect(player.getCurrentAction()).toBe('moving');
      expect(player.isGrounded()).toBe(false);
    });

    test('should transition from moving to idle when input stops', () => {
      // Start with movement
      mockInputService.isActionPressed.mockImplementation((action) => action === 'moveForward');
      player.onUpdate(0.016, {});
      expect(player.getCurrentAction()).toBe('moving');
      
      // Stop input
      mockInputService.isActionPressed.mockReturnValue(false);
      player.onUpdate(0.016, {});
      
      expect(player.getCurrentAction()).toBe('idle');
      expect(player.getVelocity().x).toBe(0);
      expect(player.getVelocity().z).toBe(0);
    });
  });

  describe('Physics System Integration', () => {
    let mockPhysicsSystem;

    beforeEach(() => {
      mockPhysicsSystem = {
        addRigidBody: jest.fn().mockReturnValue({
          id: 'player_1',
          position: new THREE.Vector3(0, 1, 0),
          velocity: new THREE.Vector3(0, 0, 0)
        }),
        removeRigidBody: jest.fn().mockReturnValue(true)
      };
    });

    test('should register with physics system correctly', () => {
      const rigidBody = player.registerWithPhysics(mockPhysicsSystem);

      expect(mockPhysicsSystem.addRigidBody).toHaveBeenCalledWith(
        'player_1',
        expect.objectContaining({
          position: expect.any(THREE.Vector3),
          velocity: expect.any(THREE.Vector3),
          size: expect.any(THREE.Vector3),
          mass: 1.0,
          restitution: 0.1,
          friction: 0.8,
          component: player,
          collisionLayer: 1,
          collisionMask: 0xFFFFFFFF
        })
      );

      expect(rigidBody).toBeDefined();
      expect(player.physicsSystem).toBe(mockPhysicsSystem);
      expect(player.rigidBodyId).toBe('player_1');
    });

    test('should handle null physics system gracefully', () => {
      const rigidBody = player.registerWithPhysics(null);

      expect(rigidBody).toBeNull();
      expect(player.physicsSystem).toBeUndefined();
      expect(player.rigidBodyId).toBeUndefined();
    });

    test('should unregister from physics system', () => {
      // First register
      player.registerWithPhysics(mockPhysicsSystem);
      
      // Then unregister
      player.unregisterFromPhysics();

      expect(mockPhysicsSystem.removeRigidBody).toHaveBeenCalledWith('player_1');
      expect(player.physicsSystem).toBeNull();
      expect(player.rigidBodyId).toBeNull();
    });

    test('should handle unregister when not registered', () => {
      // Should not throw error
      expect(() => {
        player.unregisterFromPhysics();
      }).not.toThrow();
    });

    test('should use physics system when available', () => {
      player.dependencies.physicsSystem = mockPhysicsSystem;
      
      // Should not call basic physics when physics system is available
      const basicPhysicsSpy = jest.spyOn(player, 'updateBasicPhysics');
      
      player.updateMovement(0.016);
      
      expect(basicPhysicsSpy).not.toHaveBeenCalled();
    });

    test('should fall back to basic physics when physics system unavailable', () => {
      player.dependencies.physicsSystem = null;
      
      const basicPhysicsSpy = jest.spyOn(player, 'updateBasicPhysics');
      
      player.updateMovement(0.016);
      
      expect(basicPhysicsSpy).toHaveBeenCalledWith(0.016);
    });

    test('should handle fall out callback', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      player.onFallOut();
      
      expect(consoleSpy).toHaveBeenCalledWith('Player 1 fell out of the world!');
      expect(player.getPosition()).toEqual(new THREE.Vector3(0, 5, 0));
      expect(player.getVelocity()).toEqual(new THREE.Vector3(0, 0, 0));
      
      consoleSpy.mockRestore();
    });

    test('should unregister from physics on destroy', () => {
      // Register first
      player.registerWithPhysics(mockPhysicsSystem);
      
      // Destroy should unregister
      player.destroy();
      
      expect(mockPhysicsSystem.removeRigidBody).toHaveBeenCalledWith('player_1');
    });

    test('should create rigid body with correct player dimensions', () => {
      player.registerWithPhysics(mockPhysicsSystem);

      const callArgs = mockPhysicsSystem.addRigidBody.mock.calls[0][1];
      
      expect(callArgs.size.x).toBe(player.config.size.width);
      expect(callArgs.size.y).toBe(player.config.size.height);
      expect(callArgs.size.z).toBe(player.config.size.depth);
    });

    test('should use player ID in rigid body ID', () => {
      const customPlayer = new Player({}, { playerId: 5 });
      
      customPlayer.registerWithPhysics(mockPhysicsSystem);
      
      expect(mockPhysicsSystem.addRigidBody).toHaveBeenCalledWith(
        'player_5',
        expect.any(Object)
      );
      
      customPlayer.destroy();
    });
  });
});