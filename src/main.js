/**
 * Main entry point for the Fast-Paced 3D Fighter game
 */
import { container } from './core/DIContainer.js';

console.log('Fast-Paced 3D Fighter - Initializing...');

// Basic initialization to verify setup
async function initializeGame() {
  console.log('Game container initialized');
  console.log('Dependency injection container ready:', container);
  
  // Verify Three.js is available
  try {
    const THREE = await import('three');
    console.log('Three.js loaded successfully:', THREE.REVISION);
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