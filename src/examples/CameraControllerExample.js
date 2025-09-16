import * as THREE from 'three';
import { RenderSystem } from '../systems/RenderSystem.js';

/**
 * Example demonstrating how to use the CameraController with RenderSystem
 * This shows third-person camera following with collision avoidance
 */
export class CameraControllerExample {
  constructor() {
    this.renderSystem = null;
    this.player = null;
    this.obstacles = [];
  }

  /**
   * Initialize the example
   */
  async initialize() {
    // Create and initialize render system
    this.renderSystem = new RenderSystem();
    this.renderSystem.initialize();

    // Create a simple player object (cube)
    this.createPlayer();
    
    // Create some obstacles for collision avoidance testing
    this.createObstacles();
    
    // Set up camera to follow player
    this.setupCamera();
    
    console.log('CameraController example initialized');
    console.log('Use WASD keys to move the player and see camera following');
  }

  /**
   * Create a simple player object
   */
  createPlayer() {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    this.player = new THREE.Mesh(geometry, material);
    this.player.position.set(0, 1, 0);
    this.player.castShadow = true;
    
    const scene = this.renderSystem.getScene();
    scene.add(this.player);
  }

  /**
   * Create obstacles for collision avoidance demonstration
   */
  createObstacles() {
    const scene = this.renderSystem.getScene();
    
    // Create several obstacles around the scene
    const obstaclePositions = [
      { x: 5, y: 2, z: 5 },
      { x: -5, y: 3, z: -5 },
      { x: 8, y: 4, z: 0 },
      { x: 0, y: 5, z: 8 }
    ];

    obstaclePositions.forEach(pos => {
      const geometry = new THREE.BoxGeometry(2, 4, 2);
      const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
      const obstacle = new THREE.Mesh(geometry, material);
      obstacle.position.set(pos.x, pos.y, pos.z);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      
      scene.add(obstacle);
      this.obstacles.push(obstacle);
    });

    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    
    scene.add(ground);
  }

  /**
   * Set up camera controller
   */
  setupCamera() {
    // Set the player as camera target
    this.renderSystem.setCameraTarget(this.player);
    
    // Get camera controller for configuration
    const cameraController = this.renderSystem.getCameraController();
    
    if (cameraController) {
      // Configure camera positioning
      cameraController.setOffset(0, 8, 12); // Behind and above player
      cameraController.setLookAtOffset(0, 1, 0); // Look at player's center
      
      // Configure camera behavior
      cameraController.setFollowSpeed(3.0); // Smooth following
      cameraController.setLookAtSpeed(5.0); // Quick look-at adjustment
      
      // Set distance constraints
      cameraController.setDistanceConstraints(5, 20);
      
      // Set height constraints
      cameraController.setHeightConstraints(2, 25);
      
      // Add obstacles for collision avoidance
      cameraController.addCollisionLayer(this.obstacles);
      
      console.log('Camera controller configured for third-person following');
    }
  }

  /**
   * Update the example (call this in your game loop)
   */
  update(deltaTime) {
    // Simple player movement for demonstration
    this.updatePlayerMovement(deltaTime);
    
    // Update render system (includes camera controller)
    this.renderSystem.update(deltaTime, [], {});
  }

  /**
   * Simple player movement for demonstration
   */
  updatePlayerMovement(deltaTime) {
    if (!this.player) return;

    const moveSpeed = 5.0;
    const movement = new THREE.Vector3();

    // Simple keyboard input (in a real game, use InputService)
    if (this.keys && this.keys.w) movement.z -= moveSpeed * deltaTime;
    if (this.keys && this.keys.s) movement.z += moveSpeed * deltaTime;
    if (this.keys && this.keys.a) movement.x -= moveSpeed * deltaTime;
    if (this.keys && this.keys.d) movement.x += moveSpeed * deltaTime;

    this.player.position.add(movement);
  }

  /**
   * Set up basic keyboard input for demonstration
   */
  setupInput() {
    this.keys = {};
    
    document.addEventListener('keydown', (event) => {
      switch(event.code) {
        case 'KeyW': this.keys.w = true; break;
        case 'KeyS': this.keys.s = true; break;
        case 'KeyA': this.keys.a = true; break;
        case 'KeyD': this.keys.d = true; break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch(event.code) {
        case 'KeyW': this.keys.w = false; break;
        case 'KeyS': this.keys.s = false; break;
        case 'KeyA': this.keys.a = false; break;
        case 'KeyD': this.keys.d = false; break;
      }
    });
  }

  /**
   * Demonstrate different camera configurations
   */
  demonstrateCameraConfigurations() {
    const cameraController = this.renderSystem.getCameraController();
    if (!cameraController) return;

    console.log('Demonstrating different camera configurations...');

    // Configuration 1: Close follow
    setTimeout(() => {
      cameraController.setOffset(0, 3, 5);
      cameraController.setFollowSpeed(8.0);
      console.log('Configuration 1: Close follow camera');
    }, 2000);

    // Configuration 2: Far follow
    setTimeout(() => {
      cameraController.setOffset(0, 10, 15);
      cameraController.setFollowSpeed(2.0);
      console.log('Configuration 2: Far follow camera');
    }, 5000);

    // Configuration 3: Side view
    setTimeout(() => {
      cameraController.setOffset(8, 5, 0);
      cameraController.setFollowSpeed(4.0);
      console.log('Configuration 3: Side view camera');
    }, 8000);

    // Configuration 4: Reset to default
    setTimeout(() => {
      cameraController.setOffset(0, 8, 12);
      cameraController.setFollowSpeed(3.0);
      console.log('Configuration 4: Back to default');
    }, 11000);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.renderSystem) {
      this.renderSystem.shutdown();
    }
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}

// Usage example:
// const example = new CameraControllerExample();
// example.initialize();
// example.setupInput();
// 
// // Game loop
// function gameLoop() {
//   const deltaTime = 0.016; // 60 FPS
//   example.update(deltaTime);
//   requestAnimationFrame(gameLoop);
// }
// gameLoop();