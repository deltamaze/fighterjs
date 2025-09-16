/**
 * Main entry point for the Fast-Paced 3D Fighter game
 */
import { container } from './core/DIContainer.js';
import { RenderSystem } from './systems/RenderSystem.js';
import * as THREE from 'three';

console.log('Fast-Paced 3D Fighter - Initializing...');

// Basic initialization to verify setup
async function initializeGame() {
  console.log('Game container initialized');
  console.log('Dependency injection container ready:', container);
  
  // Verify Three.js is available
  try {
    console.log('Three.js loaded successfully:', THREE.REVISION);
    
    // Test RenderSystem initialization
    console.log('Testing RenderSystem...');
    const renderSystem = new RenderSystem();
    
    try {
      renderSystem.initialize();
      console.log('RenderSystem initialized successfully!');
      
      // Get the scene first
      const scene = renderSystem.getScene();
      if (scene) {
        // Add a simple test cube to verify rendering
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ 
          color: 0x00ff00,
          wireframe: false
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0, 0, 0);
        
        // Add extra lighting to make sure cube is visible
        const extraLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(extraLight);
        scene.add(cube);
        console.log('Test cube added to scene');
        
        // Debug camera position
        const camera = renderSystem.getCamera();
        console.log('Camera position:', camera.position);
        console.log('Scene children count:', scene.children.length);
        
        // Start a simple render loop
        function animate() {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          
          renderSystem.update(16.67, [], {});
          requestAnimationFrame(animate);
        }
        
        animate();
        console.log('Render loop started');
      } else {
        console.error('Failed to get scene from RenderSystem');
      }
      
    } catch (error) {
      console.error('Failed to initialize RenderSystem:', error);
    }
    
  } catch (error) {
    console.error('Failed to load Three.js:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}