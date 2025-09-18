import * as THREE from 'three';
import { RenderSystem } from '../systems/RenderSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { Player } from '../components/Player.js';
import InputService from '../services/InputService.js';
import TimeManager from '../core/TimeManager.js';

/**
 * Example demonstrating Player component integration with PhysicsSystem
 * Shows gravity, ground collision, and movement physics working together
 */
export class PhysicsIntegrationExample {
  constructor() {
    this.renderSystem = null;
    this.physicsSystem = null;
    this.inputService = null;
    this.timeManager = null;
    this.player = null;
    this.isRunning = false;
  }

  /**
   * Initialize the example
   */
  async initialize() {
    console.log('Initializing Physics Integration Example...');

    // Create core systems
    this.timeManager = new TimeManager();
    this.inputService = new InputService();
    this.renderSystem = new RenderSystem();
    this.physicsSystem = new PhysicsSystem({ timeManager: this.timeManager });

    // Initialize systems
    this.renderSystem.initialize();
    this.physicsSystem.initialize();
    this.inputService.initialize();

    // Set up input bindings
    this.setupInputBindings();

    // Create player
    this.createPlayer();

    // Set up scene
    this.setupScene();

    // Add UI instructions
    this.createUI();

    console.log('Physics Integration Example initialized successfully!');
    console.log('Controls:');
    console.log('  WASD - Move player');
    console.log('  Space - Jump (when grounded)');
    console.log('  Player will fall with gravity and collide with ground');
  }

  /**
   * Set up input key bindings
   */
  setupInputBindings() {
    this.inputService.registerKeyBinding('KeyW', 'moveForward');
    this.inputService.registerKeyBinding('KeyS', 'moveBackward');
    this.inputService.registerKeyBinding('KeyA', 'moveLeft');
    this.inputService.registerKeyBinding('KeyD', 'moveRight');
    this.inputService.registerKeyBinding('Space', 'jump');
  }

  /**
   * Create and set up the player
   */
  createPlayer() {
    // Create player with dependencies
    const playerDependencies = {
      inputService: this.inputService,
      physicsSystem: this.physicsSystem
    };

    this.player = new Player(playerDependencies, {
      playerId: 1,
      color: 0x00ff00 // Green player
    });

    // Set player starting position (above ground so we can see gravity in action)
    this.player.setPosition({ x: 0, y: 5, z: 0 });

    // Register player with physics system
    this.player.registerWithPhysics(this.physicsSystem);

    // Add player to render scene
    const scene = this.renderSystem.getScene();
    const playerGroup = this.player.getThreeGroup();
    scene.add(playerGroup);
    
    // Debug: Log player group info
    console.log('Player group added to scene:', playerGroup);
    console.log('Player group position:', playerGroup.position);
    console.log('Player group children:', playerGroup.children.length);

    // Add a bright test cube at player position for visibility debugging - make it LARGE
    const testGeometry = new THREE.BoxGeometry(4, 4, 4); // Much larger
    const testMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, // Bright red
      wireframe: false
    });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.position.copy(this.player.getPosition());
    scene.add(testCube);
    this.testCube = testCube; // Store reference for cleanup
    console.log('Added large red test cube at player position:', testCube.position);

    // Temporarily disable camera following for debugging
    // this.renderSystem.setCameraTarget(this.player.getThreeGroup());
    
    // Configure camera for better view - reasonable distance
    const cameraController = this.renderSystem.getCameraController();
    if (cameraController) {
      cameraController.setOffset(0, 6, 12); // Reasonable distance
      cameraController.setLookAtOffset(0, 1, 0); // Look at player center
      cameraController.setFollowSpeed(2.0); // Normal following speed
    }

    // Also set initial camera position manually as backup - closer and looking at player
    const camera = this.renderSystem.getCamera();
    if (camera) {
      camera.position.set(0, 8, 15); // Closer to see the player
      camera.lookAt(0, 2, 0); // Look at player height
      console.log('Camera positioned at:', camera.position);
      console.log('Camera looking at player area');
    }

    console.log('Player created and registered with physics system');
  }

  /**
   * Set up the scene with ground and obstacles
   */
  setupScene() {
    const scene = this.renderSystem.getScene();

    // Add a VERY bright reference cube at origin for debugging - make it LARGE
    const originCube = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3), // Much larger
      new THREE.MeshBasicMaterial({ color: 0xffffff }) // White cube at origin
    );
    originCube.position.set(0, 1.5, 0); // Raise it up so it's visible
    scene.add(originCube);
    console.log('Added large white reference cube at origin');

    // Create visual ground plane (physics ground is invisible) - make it VERY visible
    const groundGeometry = new THREE.PlaneGeometry(100, 100); // Larger ground
    const groundMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, // Bright green
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide // Visible from both sides
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    scene.add(groundMesh);
    console.log('Added large bright ground plane');

    // Add some visual obstacles with basic materials
    this.createObstacles(scene);

    // Set up very bright lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Full brightness
    scene.add(ambientLight);

    console.log('Scene set up with ground and lighting');
    console.log('Scene children count:', scene.children.length);
    
    // List all scene children for debugging
    scene.children.forEach((child, index) => {
      console.log(`Scene child ${index}:`, child.type, child.position);
    });
  }

  /**
   * Create some obstacles for visual reference
   */
  createObstacles(scene) {
    const obstacles = [
      { pos: [5, 1, 5], size: [2, 2, 2], color: 0xff0000 },
      { pos: [-5, 1.5, -5], size: [3, 3, 1], color: 0x0000ff },
      { pos: [8, 0.5, 0], size: [1, 1, 4], color: 0xffff00 },
      { pos: [0, 2, -8], size: [4, 1, 2], color: 0xff00ff }
    ];

    obstacles.forEach((obstacle, index) => {
      const geometry = new THREE.BoxGeometry(...obstacle.size);
      const material = new THREE.MeshBasicMaterial({ color: obstacle.color }); // Use basic material for debugging
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...obstacle.pos);
      scene.add(mesh);
      console.log(`Added obstacle ${index} at position:`, obstacle.pos);
    });
  }

  /**
   * Start the example
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameLoop();
    console.log('Physics Integration Example started');
  }

  /**
   * Stop the example
   */
  stop() {
    this.isRunning = false;
    console.log('Physics Integration Example stopped');
  }

  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.isRunning) return;

    // Update time manager
    this.timeManager.update();
    const deltaTime = this.timeManager.getDeltaTime();

    // Update input service
    this.inputService.update();

    // Handle jump input
    this.handleJumpInput();

    // Update player
    this.player.update(deltaTime / 1000, {}); // Convert to seconds

    // Update physics system
    this.physicsSystem.update(deltaTime / 1000, [this.player], {});

    // Update render system
    this.renderSystem.update(deltaTime, [this.player], {});

    // Update test cube position to match player
    if (this.testCube && this.player) {
      this.testCube.position.copy(this.player.getPosition());
    }

    // Update UI (every few frames to avoid performance impact)
    if (Math.random() < 0.1) { // Update UI roughly 10% of frames
      this.updateUI();
    }

    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Handle jump input
   */
  handleJumpInput() {
    if (this.inputService.isActionJustPressed('jump') && this.player.isGrounded()) {
      // Apply upward velocity for jump
      const rigidBody = this.physicsSystem.getRigidBody(`player_${this.player.getConfig().playerId}`);
      if (rigidBody) {
        rigidBody.velocity.y = this.player.getStats().jumpHeight;
        this.player.setGrounded(false);
        console.log('Player jumped!');
      }
    }
  }

  /**
   * Get current player state for debugging
   */
  getPlayerState() {
    if (!this.player) return null;

    const state = this.player.getState();
    const rigidBody = this.physicsSystem.getRigidBody(`player_${this.player.getConfig().playerId}`);
    
    return {
      position: state.position,
      velocity: state.velocity,
      isGrounded: state.isGrounded,
      physicsPosition: rigidBody ? rigidBody.position : null,
      physicsVelocity: rigidBody ? rigidBody.velocity : null,
      physicsGrounded: rigidBody ? rigidBody.isGrounded : null
    };
  }

  /**
   * Create UI instructions overlay
   */
  createUI() {
    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.id = 'physics-demo-ui';
    uiContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.4;
      z-index: 1000;
      max-width: 300px;
    `;

    uiContainer.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #00ff00;">🎮 Physics Demo</h3>
      <div style="margin-bottom: 15px;">
        <strong>Controls:</strong><br>
        <span style="color: #ffff00;">W/A/S/D</span> - Move player<br>
        <span style="color: #ffff00;">SPACE</span> - Jump (when grounded)
      </div>
      <div style="margin-bottom: 15px;">
        <strong>Features:</strong><br>
        ✓ Gravity physics<br>
        ✓ Ground collision<br>
        ✓ Player movement<br>
        ✓ Camera following
      </div>
      <div id="player-status" style="font-size: 12px; color: #aaa;">
        Status: Loading...
      </div>
    `;

    document.body.appendChild(uiContainer);
    this.uiContainer = uiContainer;
  }

  /**
   * Update UI with current player status
   */
  updateUI() {
    if (!this.uiContainer) return;

    const statusElement = this.uiContainer.querySelector('#player-status');
    if (statusElement && this.player) {
      const state = this.getPlayerState();
      if (state) {
        const pos = state.position;
        const vel = state.velocity;
        statusElement.innerHTML = `
          Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})<br>
          Velocity: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)}, ${vel.z.toFixed(1)})<br>
          Grounded: ${state.isGrounded ? '✓' : '✗'}
        `;
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();

    // Remove UI
    if (this.uiContainer) {
      document.body.removeChild(this.uiContainer);
      this.uiContainer = null;
    }

    // Remove test cube
    if (this.testCube && this.renderSystem) {
      const scene = this.renderSystem.getScene();
      if (scene) {
        scene.remove(this.testCube);
      }
      this.testCube = null;
    }

    if (this.player) {
      this.player.destroy();
    }

    if (this.physicsSystem) {
      this.physicsSystem.shutdown();
    }

    if (this.renderSystem) {
      this.renderSystem.shutdown();
    }

    if (this.inputService) {
      this.inputService.shutdown();
    }

    console.log('Physics Integration Example destroyed');
  }
}

// Usage example:
// const example = new PhysicsIntegrationExample();
// await example.initialize();
// example.start();
// 
// // To debug player state:
// console.log(example.getPlayerState());
// 
// // To stop:
// example.destroy();