import * as THREE from 'three';
import { Component } from '../core/Component.js';

/**
 * Player component representing a player character in the fighting game
 * Features a blocky 3D model with position and rotation state management
 */
export class Player extends Component {
  /**
   * Create a new Player component
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} config - Player configuration
   */
  constructor(dependencies = {}, config = {}) {
    super(dependencies);
    
    // Store dependencies for use in movement handling
    this.dependencies = dependencies;
    
    // Player configuration
    this.config = {
      size: { width: 1, height: 2, depth: 0.5 },
      color: 0x4a90e2,
      playerId: 1,
      ...config
    };
    
    // Player state
    this.state = {
      position: new THREE.Vector3(0, 1, 0), // Start 1 unit above ground
      rotation: new THREE.Euler(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      damagePercentage: 0,
      isGrounded: false,
      hasDoubleJump: true,
      currentAction: 'idle',
      actionFrames: 0,
      invulnerabilityFrames: 0
    };
    
    // Player stats
    this.stats = {
      speed: 5.0,
      jumpHeight: 8.0,
      dashDistance: 3.0,
      attackPower: 10.0
    };
    
    // Three.js objects
    this.mesh = null;
    this.group = new THREE.Group();
    
    this.initializeModel();
  }

  /**
   * Initialize the blocky 3D model for the player
   */
  initializeModel() {
    // Create main body (torso)
    const bodyGeometry = new THREE.BoxGeometry(
      this.config.size.width,
      this.config.size.height * 0.6,
      this.config.size.depth
    );
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: this.config.color });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = this.config.size.height * 0.3;
    
    // Create head
    const headSize = this.config.size.width * 0.8;
    const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
    const headMaterial = new THREE.MeshLambertMaterial({ color: this.config.color });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = this.config.size.height * 0.8;
    
    // Create arms
    const armGeometry = new THREE.BoxGeometry(0.3, this.config.size.height * 0.4, 0.3);
    const armMaterial = new THREE.MeshLambertMaterial({ color: this.config.color });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-this.config.size.width * 0.6, this.config.size.height * 0.4, 0);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(this.config.size.width * 0.6, this.config.size.height * 0.4, 0);
    
    // Create legs
    const legGeometry = new THREE.BoxGeometry(0.4, this.config.size.height * 0.4, 0.4);
    const legMaterial = new THREE.MeshLambertMaterial({ color: this.config.color });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-this.config.size.width * 0.25, -this.config.size.height * 0.2, 0);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(this.config.size.width * 0.25, -this.config.size.height * 0.2, 0);
    
    // Add all parts to the group
    this.group.add(bodyMesh);
    this.group.add(headMesh);
    this.group.add(leftArm);
    this.group.add(rightArm);
    this.group.add(leftLeg);
    this.group.add(rightLeg);
    
    // Set initial position and rotation
    this.updateTransform();
    
    // Store reference to main mesh for collision detection
    this.mesh = bodyMesh;
  }

  /**
   * Update player state
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {Object} gameState - Current game state
   */
  onUpdate(deltaTime, gameState) {
    // Handle input processing for movement
    this.handleMovementInput(deltaTime);
    
    // Apply physics and movement
    this.updateMovement(deltaTime);
    
    // Update action frames
    if (this.state.actionFrames > 0) {
      this.state.actionFrames--;
    }
    
    // Update invulnerability frames
    if (this.state.invulnerabilityFrames > 0) {
      this.state.invulnerabilityFrames--;
    }
    
    // Update transform based on current state
    this.updateTransform();
  }

  /**
   * Render the player
   * @param {THREE.WebGLRenderer} renderer - Three.js renderer
   * @param {THREE.Camera} camera - Three.js camera
   */
  onRender(renderer, camera) {
    // Rendering is handled by the Three.js scene graph
    // The group is added to the scene externally
  }

  /**
   * Clean up Three.js resources
   */
  onDestroy() {
    // Unregister from physics system first
    this.unregisterFromPhysics();
    
    if (this.group) {
      // Dispose of geometries and materials
      this.group.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      
      // Remove from parent if it has one
      if (this.group.parent) {
        this.group.parent.remove(this.group);
      }
    }
  }

  /**
   * Update the Three.js transform based on current state
   */
  updateTransform() {
    if (this.group) {
      this.group.position.copy(this.state.position);
      this.group.rotation.copy(this.state.rotation);
    }
  }

  /**
   * Get the player's current position
   * @returns {THREE.Vector3} Current position
   */
  getPosition() {
    return this.state.position.clone();
  }

  /**
   * Set the player's position
   * @param {THREE.Vector3|Object} position - New position
   */
  setPosition(position) {
    if (position instanceof THREE.Vector3) {
      this.state.position.copy(position);
    } else {
      this.state.position.set(position.x || 0, position.y || 0, position.z || 0);
    }
    this.updateTransform();
  }

  /**
   * Get the player's current rotation
   * @returns {THREE.Euler} Current rotation
   */
  getRotation() {
    return this.state.rotation.clone();
  }

  /**
   * Set the player's rotation
   * @param {THREE.Euler|Object} rotation - New rotation
   */
  setRotation(rotation) {
    if (rotation instanceof THREE.Euler) {
      this.state.rotation.copy(rotation);
    } else {
      this.state.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    this.updateTransform();
  }

  /**
   * Get the player's velocity
   * @returns {THREE.Vector3} Current velocity
   */
  getVelocity() {
    return this.state.velocity.clone();
  }

  /**
   * Set the player's velocity
   * @param {THREE.Vector3|Object} velocity - New velocity
   */
  setVelocity(velocity) {
    if (velocity instanceof THREE.Vector3) {
      this.state.velocity.copy(velocity);
    } else {
      this.state.velocity.set(velocity.x || 0, velocity.y || 0, velocity.z || 0);
    }
  }

  /**
   * Get the player's damage percentage
   * @returns {number} Current damage percentage
   */
  getDamagePercentage() {
    return this.state.damagePercentage;
  }

  /**
   * Set the player's damage percentage
   * @param {number} damage - New damage percentage
   */
  setDamagePercentage(damage) {
    this.state.damagePercentage = Math.max(0, Math.min(999, damage));
  }

  /**
   * Apply damage to the player
   * @param {number} damage - Damage amount to add
   */
  takeDamage(damage) {
    this.state.damagePercentage += damage;
    this.state.damagePercentage = Math.max(0, Math.min(999, this.state.damagePercentage));
  }

  /**
   * Get the player's grounded state
   * @returns {boolean} Whether the player is on the ground
   */
  isGrounded() {
    return this.state.isGrounded;
  }

  /**
   * Set the player's grounded state
   * @param {boolean} grounded - Whether the player is on the ground
   */
  setGrounded(grounded) {
    this.state.isGrounded = grounded;
    
    // Reset double jump when landing
    if (grounded) {
      this.state.hasDoubleJump = true;
    }
  }

  /**
   * Get the player's current action
   * @returns {string} Current action name
   */
  getCurrentAction() {
    return this.state.currentAction;
  }

  /**
   * Set the player's current action
   * @param {string} action - Action name
   * @param {number} frames - Duration in frames
   */
  setAction(action, frames = 0) {
    this.state.currentAction = action;
    this.state.actionFrames = frames;
  }

  /**
   * Get the Three.js group for adding to scene
   * @returns {THREE.Group} The player's 3D model group
   */
  getThreeGroup() {
    return this.group;
  }

  /**
   * Get the main mesh for collision detection
   * @returns {THREE.Mesh} The player's main body mesh
   */
  getMainMesh() {
    return this.mesh;
  }

  /**
   * Get player configuration
   * @returns {Object} Player configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get player stats
   * @returns {Object} Player stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get complete player state for serialization
   * @returns {Object} Complete player state
   */
  getState() {
    return {
      position: this.state.position.clone(),
      rotation: this.state.rotation.clone(),
      velocity: this.state.velocity.clone(),
      damagePercentage: this.state.damagePercentage,
      isGrounded: this.state.isGrounded,
      hasDoubleJump: this.state.hasDoubleJump,
      currentAction: this.state.currentAction,
      actionFrames: this.state.actionFrames,
      invulnerabilityFrames: this.state.invulnerabilityFrames
    };
  }

  /**
   * Handle movement input processing
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  handleMovementInput(deltaTime) {
    const inputService = this.dependencies.inputService;
    if (!inputService) return;

    // Get movement input states
    const moveForward = inputService.isActionPressed('moveForward');
    const moveBackward = inputService.isActionPressed('moveBackward');
    const moveLeft = inputService.isActionPressed('moveLeft');
    const moveRight = inputService.isActionPressed('moveRight');

    // Calculate movement direction based on input
    const movementVector = new THREE.Vector3(0, 0, 0);
    
    if (moveForward) movementVector.z -= 1;
    if (moveBackward) movementVector.z += 1;
    if (moveLeft) movementVector.x -= 1;
    if (moveRight) movementVector.x += 1;

    // Normalize diagonal movement to prevent faster diagonal speed
    if (movementVector.length() > 0) {
      movementVector.normalize();
      
      // Apply movement speed
      movementVector.multiplyScalar(this.stats.speed);
      
      // Set horizontal velocity (preserve vertical velocity for gravity/jumping)
      this.state.velocity.x = movementVector.x;
      this.state.velocity.z = movementVector.z;
      
      // Update action to moving if not already in a special action
      if (this.state.currentAction === 'idle' || this.state.currentAction === 'moving') {
        this.setAction('moving');
      }
    } else {
      // No movement input - stop horizontal movement
      this.state.velocity.x = 0;
      this.state.velocity.z = 0;
      
      // Update action to idle if currently moving
      if (this.state.currentAction === 'moving') {
        this.setAction('idle');
      }
    }
  }

  /**
   * Update movement and physics
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  updateMovement(deltaTime) {
    // Physics is now handled by PhysicsSystem
    // This method is kept for compatibility but physics integration
    // should be done through PhysicsSystem.addRigidBody()
    
    // If no physics system is available, fall back to basic physics
    const physicsSystem = this.dependencies.physicsSystem;
    if (!physicsSystem) {
      this.updateBasicPhysics(deltaTime);
    }
  }

  /**
   * Basic physics fallback when PhysicsSystem is not available
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  updateBasicPhysics(deltaTime) {
    // Apply gravity if not grounded
    if (!this.state.isGrounded) {
      const gravity = -20; // Gravity acceleration (units per second squared)
      this.state.velocity.y += gravity * deltaTime;
    }

    // Apply velocity to position
    const deltaPosition = this.state.velocity.clone().multiplyScalar(deltaTime);
    this.state.position.add(deltaPosition);

    // Basic ground detection (ground level at y = 0)
    const groundLevel = 0;
    const playerHeight = this.config.size.height;
    const playerBottom = this.state.position.y - playerHeight / 2;

    if (playerBottom <= groundLevel && this.state.velocity.y <= 0) {
      // Player has hit the ground
      this.state.position.y = groundLevel + playerHeight / 2;
      this.state.velocity.y = 0;
      this.setGrounded(true);
    } else if (playerBottom > groundLevel) {
      // Player is in the air
      this.setGrounded(false);
    }

    // Clamp position to prevent falling through the world
    if (this.state.position.y < groundLevel + playerHeight / 2) {
      this.state.position.y = groundLevel + playerHeight / 2;
      this.state.velocity.y = Math.max(0, this.state.velocity.y);
      this.setGrounded(true);
    }
  }

  /**
   * Register this player with the physics system
   * @param {PhysicsSystem} physicsSystem - The physics system to register with
   * @returns {Object} The created rigid body
   */
  registerWithPhysics(physicsSystem) {
    if (!physicsSystem) {
      console.warn('Cannot register player with null physics system');
      return null;
    }

    const bodyData = {
      position: this.state.position.clone(),
      velocity: this.state.velocity.clone(),
      size: new THREE.Vector3(
        this.config.size.width,
        this.config.size.height,
        this.config.size.depth
      ),
      mass: 1.0,
      restitution: 0.1, // Low bounce for player
      friction: 0.8, // High friction for good control
      component: this, // Reference back to this component
      collisionLayer: 1, // Player collision layer
      collisionMask: 0xFFFFFFFF // Collide with everything
    };

    const rigidBody = physicsSystem.addRigidBody(`player_${this.config.playerId}`, bodyData);
    
    // Store reference to physics system for cleanup
    this.physicsSystem = physicsSystem;
    this.rigidBodyId = `player_${this.config.playerId}`;
    
    return rigidBody;
  }

  /**
   * Unregister this player from the physics system
   */
  unregisterFromPhysics() {
    if (this.physicsSystem && this.rigidBodyId) {
      this.physicsSystem.removeRigidBody(this.rigidBodyId);
      this.physicsSystem = null;
      this.rigidBodyId = null;
    }
  }

  /**
   * Called by PhysicsSystem when the player falls out of the world
   */
  onFallOut() {
    console.log(`Player ${this.config.playerId} fell out of the world!`);
    // Reset to a safe position
    this.setPosition({ x: 0, y: 5, z: 0 });
    this.setVelocity({ x: 0, y: 0, z: 0 });
    
    // Could trigger game events here (lose a life, respawn, etc.)
  }
}