import * as THREE from 'three';
import { System } from '../core/System.js';

/**
 * PhysicsSystem handles collision detection, rigid body management, and physics simulation
 * Manages player-environment collisions and knockback mechanics
 */
export class PhysicsSystem extends System {
  constructor(dependencies = {}) {
    super(dependencies);
    
    // Get TimeManager dependency
    this.timeManager = this.getDependency('timeManager');
    
    // Physics configuration
    this.config = {
      gravity: -20, // Units per second squared
      groundLevel: 0,
      maxVelocity: 50, // Maximum velocity to prevent physics explosions
      collisionTolerance: 0.01, // Small value for collision detection precision
      restitution: 0.3, // Bounce factor for collisions
      friction: 0.8 // Ground friction coefficient
    };
    
    // Rigid bodies registry
    this.rigidBodies = new Map();
    this.staticBodies = new Map(); // For environment collision
    
    // Collision detection structures
    this.collisionPairs = new Set();
    this.collisionCallbacks = new Map();
    
    // Physics world bounds
    this.worldBounds = {
      min: new THREE.Vector3(-50, -10, -50),
      max: new THREE.Vector3(50, 50, 50)
    };
  }

  /**
   * Initialize the physics system
   */
  onInitialize() {
    console.log('PhysicsSystem initialized');
    
    // Set up default ground plane
    this.addStaticBody('ground', {
      position: new THREE.Vector3(0, this.config.groundLevel, 0),
      size: new THREE.Vector3(100, 0.1, 100),
      type: 'box'
    });
  }

  /**
   * Update physics simulation
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   * @param {Array} components - Array of components to process
   * @param {Object} gameState - Current game state
   */
  onUpdate(deltaTime, components, gameState) {
    // Use fixed timestep for consistent physics
    const fixedDeltaTime = this.timeManager ? 
      this.timeManager.getFixedDeltaTime() / 1000 : // Convert to seconds
      1/60; // Fallback to 60 FPS
    
    // Update all rigid bodies
    this.updateRigidBodies(fixedDeltaTime);
    
    // Perform collision detection
    this.detectCollisions();
    
    // Resolve collisions
    this.resolveCollisions();
    
    // Apply world bounds
    this.enforceWorldBounds();
  }

  /**
   * Add a rigid body to the physics simulation
   * @param {string} id - Unique identifier for the rigid body
   * @param {Object} bodyData - Rigid body configuration
   */
  addRigidBody(id, bodyData) {
    const rigidBody = {
      id,
      position: bodyData.position ? bodyData.position.clone() : new THREE.Vector3(),
      velocity: bodyData.velocity ? bodyData.velocity.clone() : new THREE.Vector3(),
      acceleration: bodyData.acceleration ? bodyData.acceleration.clone() : new THREE.Vector3(),
      size: bodyData.size ? bodyData.size.clone() : new THREE.Vector3(1, 1, 1),
      mass: bodyData.mass || 1.0,
      restitution: bodyData.restitution !== undefined ? bodyData.restitution : this.config.restitution,
      friction: bodyData.friction !== undefined ? bodyData.friction : this.config.friction,
      isGrounded: false,
      isKinematic: bodyData.isKinematic || false, // Kinematic bodies don't respond to physics
      type: bodyData.type || 'box', // 'box', 'sphere', 'capsule'
      component: bodyData.component || null, // Reference to the component
      collisionMask: bodyData.collisionMask || 0xFFFFFFFF, // What this body can collide with
      collisionLayer: bodyData.collisionLayer || 1, // What layer this body is on
      onCollision: bodyData.onCollision || null // Collision callback
    };
    
    this.rigidBodies.set(id, rigidBody);
    return rigidBody;
  }

  /**
   * Remove a rigid body from the physics simulation
   * @param {string} id - Rigid body identifier
   */
  removeRigidBody(id) {
    return this.rigidBodies.delete(id);
  }

  /**
   * Get a rigid body by ID
   * @param {string} id - Rigid body identifier
   * @returns {Object|null} The rigid body or null if not found
   */
  getRigidBody(id) {
    return this.rigidBodies.get(id) || null;
  }

  /**
   * Add a static body for environment collision
   * @param {string} id - Unique identifier for the static body
   * @param {Object} bodyData - Static body configuration
   */
  addStaticBody(id, bodyData) {
    const staticBody = {
      id,
      position: bodyData.position ? bodyData.position.clone() : new THREE.Vector3(),
      size: bodyData.size ? bodyData.size.clone() : new THREE.Vector3(1, 1, 1),
      type: bodyData.type || 'box',
      restitution: bodyData.restitution !== undefined ? bodyData.restitution : this.config.restitution,
      friction: bodyData.friction !== undefined ? bodyData.friction : this.config.friction,
      collisionMask: bodyData.collisionMask || 0xFFFFFFFF,
      collisionLayer: bodyData.collisionLayer || 1,
      onCollision: bodyData.onCollision || null
    };
    
    this.staticBodies.set(id, staticBody);
    return staticBody;
  }

  /**
   * Remove a static body
   * @param {string} id - Static body identifier
   */
  removeStaticBody(id) {
    return this.staticBodies.delete(id);
  }

  /**
   * Update all rigid bodies with physics simulation
   * @param {number} deltaTime - Fixed timestep in seconds
   */
  updateRigidBodies(deltaTime) {
    for (const [id, body] of this.rigidBodies) {
      if (body.isKinematic) continue; // Skip kinematic bodies
      
      // Apply gravity
      if (!body.isGrounded) {
        body.acceleration.y = this.config.gravity;
      } else {
        // Apply friction when grounded
        body.velocity.x *= (1 - body.friction * deltaTime);
        body.velocity.z *= (1 - body.friction * deltaTime);
      }
      
      // Integrate velocity
      body.velocity.add(
        body.acceleration.clone().multiplyScalar(deltaTime)
      );
      
      // Clamp velocity to prevent physics explosions
      body.velocity.clampLength(0, this.config.maxVelocity);
      
      // Integrate position
      body.position.add(
        body.velocity.clone().multiplyScalar(deltaTime)
      );
      
      // Reset acceleration for next frame
      body.acceleration.set(0, 0, 0);
      
      // Update component position if linked
      if (body.component && typeof body.component.setPosition === 'function') {
        body.component.setPosition(body.position);
      }
      if (body.component && typeof body.component.setVelocity === 'function') {
        body.component.setVelocity(body.velocity);
      }
    }
  }

  /**
   * Detect collisions between rigid bodies and static bodies
   */
  detectCollisions() {
    this.collisionPairs.clear();
    
    // Check rigid body vs static body collisions
    for (const [rigidId, rigidBody] of this.rigidBodies) {
      for (const [staticId, staticBody] of this.staticBodies) {
        if (this.checkCollisionLayers(rigidBody, staticBody)) {
          const collision = this.detectCollision(rigidBody, staticBody);
          if (collision) {
            this.collisionPairs.add({
              type: 'rigid-static',
              bodyA: rigidBody,
              bodyB: staticBody,
              collision
            });
          }
        }
      }
    }
    
    // Check rigid body vs rigid body collisions
    const rigidBodiesArray = Array.from(this.rigidBodies.values());
    for (let i = 0; i < rigidBodiesArray.length; i++) {
      for (let j = i + 1; j < rigidBodiesArray.length; j++) {
        const bodyA = rigidBodiesArray[i];
        const bodyB = rigidBodiesArray[j];
        
        if (this.checkCollisionLayers(bodyA, bodyB)) {
          const collision = this.detectCollision(bodyA, bodyB);
          if (collision) {
            this.collisionPairs.add({
              type: 'rigid-rigid',
              bodyA,
              bodyB,
              collision
            });
          }
        }
      }
    }
  }

  /**
   * Check if two bodies should collide based on their collision layers
   * @param {Object} bodyA - First body
   * @param {Object} bodyB - Second body
   * @returns {boolean} Whether the bodies should collide
   */
  checkCollisionLayers(bodyA, bodyB) {
    return (bodyA.collisionMask & bodyB.collisionLayer) !== 0 &&
           (bodyB.collisionMask & bodyA.collisionLayer) !== 0;
  }

  /**
   * Detect collision between two bodies
   * @param {Object} bodyA - First body
   * @param {Object} bodyB - Second body
   * @returns {Object|null} Collision data or null if no collision
   */
  detectCollision(bodyA, bodyB) {
    // For now, implement box-box collision detection
    // This can be extended for other shapes later
    if (bodyA.type === 'box' && bodyB.type === 'box') {
      return this.detectBoxBoxCollision(bodyA, bodyB);
    }
    
    return null;
  }

  /**
   * Detect collision between two box-shaped bodies
   * @param {Object} bodyA - First box body
   * @param {Object} bodyB - Second box body
   * @returns {Object|null} Collision data or null if no collision
   */
  detectBoxBoxCollision(bodyA, bodyB) {
    const aMin = bodyA.position.clone().sub(bodyA.size.clone().multiplyScalar(0.5));
    const aMax = bodyA.position.clone().add(bodyA.size.clone().multiplyScalar(0.5));
    const bMin = bodyB.position.clone().sub(bodyB.size.clone().multiplyScalar(0.5));
    const bMax = bodyB.position.clone().add(bodyB.size.clone().multiplyScalar(0.5));
    
    // Check for overlap on all axes
    const overlapX = Math.min(aMax.x, bMax.x) - Math.max(aMin.x, bMin.x);
    const overlapY = Math.min(aMax.y, bMax.y) - Math.max(aMin.y, bMin.y);
    const overlapZ = Math.min(aMax.z, bMax.z) - Math.max(aMin.z, bMin.z);
    
    // If any overlap is negative or zero, no collision
    if (overlapX <= this.config.collisionTolerance || 
        overlapY <= this.config.collisionTolerance || 
        overlapZ <= this.config.collisionTolerance) {
      return null;
    }
    
    // Find the axis with minimum overlap (separation axis)
    let separationAxis = new THREE.Vector3();
    let penetrationDepth = 0;
    
    if (overlapX <= overlapY && overlapX <= overlapZ) {
      // Separate on X axis
      separationAxis.x = bodyA.position.x < bodyB.position.x ? -1 : 1;
      penetrationDepth = overlapX;
    } else if (overlapY <= overlapZ) {
      // Separate on Y axis
      separationAxis.y = bodyA.position.y < bodyB.position.y ? -1 : 1;
      penetrationDepth = overlapY;
    } else {
      // Separate on Z axis
      separationAxis.z = bodyA.position.z < bodyB.position.z ? -1 : 1;
      penetrationDepth = overlapZ;
    }
    
    return {
      normal: separationAxis,
      penetrationDepth,
      contactPoint: bodyA.position.clone().add(bodyB.position).multiplyScalar(0.5)
    };
  }

  /**
   * Resolve all detected collisions
   */
  resolveCollisions() {
    for (const collisionPair of this.collisionPairs) {
      this.resolveCollision(collisionPair);
    }
  }

  /**
   * Resolve a single collision
   * @param {Object} collisionPair - Collision pair data
   */
  resolveCollision(collisionPair) {
    const { bodyA, bodyB, collision } = collisionPair;
    const { normal, penetrationDepth } = collision;
    
    // Separate the bodies
    if (collisionPair.type === 'rigid-static') {
      // Only move the rigid body
      const separation = normal.clone().multiplyScalar(penetrationDepth);
      bodyA.position.add(separation);
      
      // Apply restitution (bounce) first
      const relativeVelocity = bodyA.velocity.clone();
      const velocityAlongNormal = relativeVelocity.dot(normal);
      
      if (velocityAlongNormal < 0) {
        const restitution = Math.min(bodyA.restitution, bodyB.restitution);
        const impulse = normal.clone().multiplyScalar(-(1 + restitution) * velocityAlongNormal);
        bodyA.velocity.add(impulse);
      }
      
      // Handle ground collision after restitution
      if (bodyB.id === 'ground' && normal.y > 0.5) {
        bodyA.isGrounded = true;
        
        // Only stop downward movement if there's no significant bounce
        if (bodyA.velocity.y < 0.1) {
          bodyA.velocity.y = 0;
        }
        
        // Update component grounded state
        if (bodyA.component && typeof bodyA.component.setGrounded === 'function') {
          bodyA.component.setGrounded(true);
        }
      }
      
    } else if (collisionPair.type === 'rigid-rigid') {
      // Move both rigid bodies
      const totalMass = bodyA.mass + bodyB.mass;
      const separationA = normal.clone().multiplyScalar(penetrationDepth * (bodyB.mass / totalMass));
      const separationB = normal.clone().multiplyScalar(-penetrationDepth * (bodyA.mass / totalMass));
      
      bodyA.position.add(separationA);
      bodyB.position.add(separationB);
      
      // Apply impulse resolution
      const relativeVelocity = bodyA.velocity.clone().sub(bodyB.velocity);
      const velocityAlongNormal = relativeVelocity.dot(normal);
      
      if (velocityAlongNormal < 0) {
        const restitution = Math.min(bodyA.restitution, bodyB.restitution);
        const impulseScalar = -(1 + restitution) * velocityAlongNormal / totalMass;
        const impulse = normal.clone().multiplyScalar(impulseScalar);
        
        bodyA.velocity.add(impulse.clone().multiplyScalar(bodyB.mass));
        bodyB.velocity.sub(impulse.clone().multiplyScalar(bodyA.mass));
      }
    }
    
    // Call collision callbacks
    if (bodyA.onCollision) {
      bodyA.onCollision(bodyB, collision);
    }
    if (bodyB.onCollision) {
      bodyB.onCollision(bodyA, collision);
    }
  }

  /**
   * Enforce world bounds to prevent objects from falling infinitely
   */
  enforceWorldBounds() {
    for (const [id, body] of this.rigidBodies) {
      let boundsViolated = false;
      
      // Check and clamp position to world bounds
      if (body.position.x < this.worldBounds.min.x) {
        body.position.x = this.worldBounds.min.x;
        body.velocity.x = Math.abs(body.velocity.x) * body.restitution;
        boundsViolated = true;
      } else if (body.position.x > this.worldBounds.max.x) {
        body.position.x = this.worldBounds.max.x;
        body.velocity.x = -Math.abs(body.velocity.x) * body.restitution;
        boundsViolated = true;
      }
      
      if (body.position.y < this.worldBounds.min.y) {
        // Object fell out of world - this could trigger a knockout
        if (body.component && typeof body.component.onFallOut === 'function') {
          body.component.onFallOut();
        }
        // Reset to a safe position or mark for removal
        body.position.y = this.config.groundLevel + body.size.y;
        body.velocity.y = 0;
        boundsViolated = true;
      } else if (body.position.y > this.worldBounds.max.y) {
        body.position.y = this.worldBounds.max.y;
        body.velocity.y = -Math.abs(body.velocity.y) * body.restitution;
        boundsViolated = true;
      }
      
      if (body.position.z < this.worldBounds.min.z) {
        body.position.z = this.worldBounds.min.z;
        body.velocity.z = Math.abs(body.velocity.z) * body.restitution;
        boundsViolated = true;
      } else if (body.position.z > this.worldBounds.max.z) {
        body.position.z = this.worldBounds.max.z;
        body.velocity.z = -Math.abs(body.velocity.z) * body.restitution;
        boundsViolated = true;
      }
      
      // Update component position if bounds were violated
      if (boundsViolated && body.component && typeof body.component.setPosition === 'function') {
        body.component.setPosition(body.position);
        body.component.setVelocity(body.velocity);
      }
    }
  }

  /**
   * Apply knockback force to a rigid body
   * @param {string} bodyId - Target body ID
   * @param {THREE.Vector3} force - Knockback force vector
   * @param {THREE.Vector3} direction - Knockback direction (normalized)
   */
  applyKnockback(bodyId, force, direction) {
    const body = this.getRigidBody(bodyId);
    if (!body) return false;
    
    const knockbackVector = direction.clone().normalize().multiply(force);
    body.velocity.add(knockbackVector);
    
    // Ensure minimum upward velocity for knockback
    if (knockbackVector.y > 0 && body.velocity.y < knockbackVector.y) {
      body.velocity.y = knockbackVector.y;
    }
    
    // Remove grounded state when knocked back
    if (knockbackVector.length() > 1) {
      body.isGrounded = false;
      if (body.component && typeof body.component.setGrounded === 'function') {
        body.component.setGrounded(false);
      }
    }
    
    return true;
  }

  /**
   * Set world bounds for physics simulation
   * @param {THREE.Vector3} min - Minimum bounds
   * @param {THREE.Vector3} max - Maximum bounds
   */
  setWorldBounds(min, max) {
    this.worldBounds.min.copy(min);
    this.worldBounds.max.copy(max);
  }

  /**
   * Get world bounds
   * @returns {Object} World bounds with min and max vectors
   */
  getWorldBounds() {
    return {
      min: this.worldBounds.min.clone(),
      max: this.worldBounds.max.clone()
    };
  }

  /**
   * Check if a position is within world bounds
   * @param {THREE.Vector3} position - Position to check
   * @returns {boolean} Whether position is within bounds
   */
  isWithinBounds(position) {
    return position.x >= this.worldBounds.min.x && position.x <= this.worldBounds.max.x &&
           position.y >= this.worldBounds.min.y && position.y <= this.worldBounds.max.y &&
           position.z >= this.worldBounds.min.z && position.z <= this.worldBounds.max.z;
  }

  /**
   * Get all rigid bodies
   * @returns {Map} Map of all rigid bodies
   */
  getAllRigidBodies() {
    return new Map(this.rigidBodies);
  }

  /**
   * Get all static bodies
   * @returns {Map} Map of all static bodies
   */
  getAllStaticBodies() {
    return new Map(this.staticBodies);
  }

  /**
   * Cleanup physics system
   */
  onShutdown() {
    this.rigidBodies.clear();
    this.staticBodies.clear();
    this.collisionPairs.clear();
    this.collisionCallbacks.clear();
    console.log('PhysicsSystem shutdown');
  }
}