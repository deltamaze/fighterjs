import * as THREE from 'three';
import { System } from '../core/System.js';

/**
 * RenderSystem manages the Three.js rendering pipeline
 * Handles scene setup, camera management, and rendering loop
 */
export class RenderSystem extends System {
  constructor(dependencies = {}) {
    super(dependencies);
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    
    // Rendering state
    this.isInitialized = false;
    this.renderables = new Set();
  }

  /**
   * Initialize the Three.js scene, camera, and renderer
   */
  initialize() {
    try {
      // Create the scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
      
      // Create the camera (third-person perspective)
      this.camera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        1000 // Far clipping plane
      );
      
      // Position camera for third-person view
      this.camera.position.set(0, 5, 10);
      this.camera.lookAt(0, 0, 0);
      
      // Create the WebGL renderer
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: false
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Get canvas reference
      this.canvas = this.renderer.domElement;
      
      // Add renderer to DOM
      document.body.appendChild(this.canvas);
      
      // Set up basic lighting
      this.setupLighting();
      
      // Handle window resize
      this.setupResizeHandler();
      
      this.isInitialized = true;
      console.log('RenderSystem initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize RenderSystem:', error);
      throw error;
    }
  }

  /**
   * Set up basic lighting for the scene
   */
  setupLighting() {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun-like lighting)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    this.scene.add(directionalLight);
    
    // Add a subtle fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  /**
   * Set up window resize handler
   */
  setupResizeHandler() {
    window.addEventListener('resize', () => {
      if (!this.camera || !this.renderer) return;
      
      // Update camera aspect ratio
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      
      // Update renderer size
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * Add a renderable component to the scene
   */
  addRenderable(component) {
    if (component && typeof component.render === 'function') {
      this.renderables.add(component);
    }
  }

  /**
   * Remove a renderable component from the scene
   */
  removeRenderable(component) {
    this.renderables.delete(component);
  }

  /**
   * Update the render system
   */
  update(deltaTime, components, gameState) {
    if (!this.isInitialized) {
      console.warn('RenderSystem not initialized');
      return;
    }

    // Update all renderable components
    for (const component of this.renderables) {
      if (component.render) {
        component.render(this.renderer, this.camera, this.scene);
      }
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Get the Three.js scene
   */
  getScene() {
    return this.scene;
  }

  /**
   * Get the Three.js camera
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get the Three.js renderer
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Get the canvas element
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Shutdown the render system
   */
  shutdown() {
    if (this.renderer) {
      // Remove canvas from DOM
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      
      // Dispose of renderer resources
      this.renderer.dispose();
    }
    
    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    this.renderables.clear();
    this.isInitialized = false;
    
    console.log('RenderSystem shutdown');
  }
}