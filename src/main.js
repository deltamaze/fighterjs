/**
 * Main entry point for the Fast-Paced 3D Fighter game
 * TEMPORARY: Using simple debug version to isolate issues
 */

console.log('Fast-Paced 3D Fighter - Debug Mode');

// Add error handling for debugging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error details:', event.filename, event.lineno, event.colno);
});

// Try both versions - simple first, then complex
async function initializeGame() {
  try {
    console.log('Testing simple Three.js setup first...');
    
    // Import and run simple debug version
    // const simpleDebug = await import('./debug-simple.js');
    // console.log('Simple debug version loaded successfully');
    
    // Wait 3 seconds, then try the render system only
    setTimeout(async () => {
      try {
        console.log('Now trying RenderSystem only...');
        
        const { testRenderSystem } = await import('./debug-render-only.js');
        await testRenderSystem();
        
        console.log('RenderSystem test completed');
        
        // Wait another 3 seconds, then try full physics
        setTimeout(async () => {
          try {
            console.log('Now trying full physics integration...');
            
            const { PhysicsIntegrationExample } = await import('./examples/PhysicsIntegrationExample.js');
            
            const gameExample = new PhysicsIntegrationExample();
            await gameExample.initialize();
            gameExample.start();
            
            console.log('='.repeat(50));
            console.log('🎮 FAST-PACED 3D FIGHTER - PHYSICS DEMO');
            console.log('='.repeat(50));
            
            window.gameExample = gameExample;
            window.getPlayerState = () => gameExample.getPlayerState();
            
          } catch (error) {
            console.error('Failed to initialize full physics demo:', error);
            console.error('Error stack:', error.stack);
            console.log('Continuing with RenderSystem-only version...');
          }
        }, 3000);
        
      } catch (error) {
        console.error('Failed to initialize RenderSystem test:', error);
        console.error('Error stack:', error.stack);
        console.log('Continuing with simple debug version...');
      }
    }, 3000);
    
  } catch (error) {
    console.error('Failed to initialize simple debug:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}