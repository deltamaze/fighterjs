import * as THREE from 'three';
import { Component } from '../core/Component.js';

/**
 * CameraController manages third-person camera following with collision avoidance
 * Provides smooth camera movement and optimal positioning for gameplay
 */
export class CameraController extends Component {
  constructor(dependencies = {}) {
    super(dependencies);
    
    // Camera reference
    this.camera = null;
    this.target = null; // Player to follow
    
    // Camera positioning
    this.offset = new THREE.Vector3(0, 5, 10); // Default offset from target
    this.lookAtOffset = new THREE.Vector3(0, 1, 0); // Look-at point offset from target
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    
    // Smoothing parameters
    this.followSpeed = 5.0; // How quickly camera follows target
    this.lookAtSpeed = 8.0; // How quickly camera adjusts look-at point
    this.minDistance = 3.0; // Minimum distance from target
    this.maxDistance = 15.0; // Maximum distance from target
    
    // Collision avoidance
    this.collisionRadius = 0.5; // Radius for collision detection
    this.collisionLayers = []; // Objects to check collision against
    this.raycaster = new THREE.Raycaster();
    
    // Camera bounds
    this.minHeight = 1.0; // Minimum camera height
    this.maxHeight = 20.0; // Maximum camera height
    
    // State tracking
    this.isInitialized = false;
  }

  /**
   * Initialize the camera controller with camera and target references
   */
  initialize(camera, target) {
    this.camera = camera;
    this.target = target;
    
    if (this.camera && this.target) {
      // Set initial camera position
      this.updateCameraPosition(0, true); // Force immediate positioning
      this.isInitialized = true;
    }
  }

  /**
   * Set the target object for the camera to follow
   */
  setTarget(target) {
    this.target = target;
  }

  /**
   * Set camera offset from target
   */
  setOffset(x, y, z) {
    this.offset.set(x, y, z);
  }

  /**
   * Set look-at offset from target
   */
  setLookAtOffset(x, y, z) {
    this.lookAtOffset.set(x, y, z);
  }

  /**
   * Add collision layer for camera collision avoidance
   */
  addCollisionLayer(objects) {
    if (Array.isArray(objects)) {
      this.collisionLayers.push(...objects);
    } else {
      this.collisionLayers.push(objects);
    }
  }

  /**
   * Remove collision layer
   */
  removeCollisionLayer(objects) {
    if (Array.isArray(objects)) {
      objects.forEach(obj => {
        const index = this.collisionLayers.indexOf(obj);
        if (index > -1) {
          this.collisionLayers.splice(index, 1);
        }
      });
    } else {
      const index = this.collisionLayers.indexOf(objects);
      if (index > -1) {
        this.collisionLayers.splice(index, 1);
      }
    }
  }

  /**
   * Update camera position and orientation
   */
  update(deltaTime, gameState) {
    if (!this.isInitialized || !this.camera || !this.target) {
      return;
    }

    this.updateCameraPosition(deltaTime);
  }

  /**
   * Update camera position with smooth following and collision avoidance
   */
  updateCameraPosition(deltaTime, forceImmediate = false) {
    if (!this.target || !this.camera) return;

    // Get target position
    const targetPosition = this.getTargetPosition();
    
    // Calculate desired camera position
    const desiredPosition = new THREE.Vector3()
      .copy(targetPosition)
      .add(this.offset);
    
    // Apply collision avoidance
    const finalPosition = this.applyCollisionAvoidance(targetPosition, desiredPosition);
    
    // Apply height constraints
    finalPosition.y = Math.max(this.minHeight, Math.min(this.maxHeight, finalPosition.y));
    
    // Smooth camera movement or set immediately
    if (forceImmediate) {
      this.camera.position.copy(finalPosition);
      this.currentPosition.copy(finalPosition);
    } else {
      // Smooth interpolation
      this.currentPosition.lerp(finalPosition, this.followSpeed * deltaTime);
      this.camera.position.copy(this.currentPosition);
    }
    
    // Update look-at point
    const lookAtPoint = new THREE.Vector3()
      .copy(targetPosition)
      .add(this.lookAtOffset);
    
    if (forceImmediate) {
      this.currentLookAt.copy(lookAtPoint);
    } else {
      this.currentLookAt.lerp(lookAtPoint, this.lookAtSpeed * deltaTime);
    }
    
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Get target position (handles both Vector3 and objects with position property)
   */
  getTargetPosition() {
    if (this.target.position) {
      return this.target.position;
    } else if (this.target instanceof THREE.Vector3) {
      return this.target;
    } else {
      console.warn('Target does not have a valid position');
      return new THREE.Vector3(0, 0, 0);
    }
  }

  /**
   * Apply collision avoidance to prevent camera clipping through objects
   */
  applyCollisionAvoidance(targetPosition, desiredPosition) {
    if (this.collisionLayers.length === 0) {
      return desiredPosition;
    }

    // Cast ray from target to desired camera position
    const direction = new THREE.Vector3()
      .subVectors(desiredPosition, targetPosition)
      .normalize();
    
    const distance = targetPosition.distanceTo(desiredPosition);
    
    this.raycaster.set(targetPosition, direction);
    this.raycaster.far = distance;
    
    // Check for intersections
    const intersections = this.raycaster.intersectObjects(this.collisionLayers, true);
    
    if (intersections.length > 0) {
      // Find closest intersection
      const closestIntersection = intersections[0];
      const collisionDistance = closestIntersection.distance;
      
      // Position camera slightly before the collision point
      const safeDistance = Math.max(
        this.minDistance,
        collisionDistance - this.collisionRadius
      );
      
      const safePosition = new THREE.Vector3()
        .copy(targetPosition)
        .add(direction.multiplyScalar(safeDistance));
      
      return safePosition;
    }
    
    return desiredPosition;
  }

  /**
   * Set camera follow speed
   */
  setFollowSpeed(speed) {
    this.followSpeed = Math.max(0.1, speed);
  }

  /**
   * Set camera look-at speed
   */
  setLookAtSpeed(speed) {
    this.lookAtSpeed = Math.max(0.1, speed);
  }

  /**
   * Set distance constraints
   */
  setDistanceConstraints(minDistance, maxDistance) {
    this.minDistance = Math.max(0.1, minDistance);
    this.maxDistance = Math.max(this.minDistance, maxDistance);
  }

  /**
   * Set height constraints
   */
  setHeightConstraints(minHeight, maxHeight) {
    this.minHeight = minHeight;
    this.maxHeight = Math.max(minHeight, maxHeight);
  }

  /**
   * Get current camera distance from target
   */
  getDistanceFromTarget() {
    if (!this.camera || !this.target) return 0;
    
    const targetPos = this.getTargetPosition();
    return this.camera.position.distanceTo(targetPos);
  }

  /**
   * Reset camera to default position
   */
  resetPosition() {
    if (this.target && this.camera) {
      this.updateCameraPosition(0, true);
    }
  }

  /**
   * Render method (required by Component interface)
   */
  render(renderer, camera, scene) {
    // CameraController doesn't render anything itself
    // It manipulates the camera position
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.camera = null;
    this.target = null;
    this.collisionLayers.length = 0;
    this.raycaster = null;
    this.isInitialized = false;
  }
}