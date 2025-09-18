/**
 * Debug version that tests RenderSystem only (no physics)
 */
import { RenderSystem } from './systems/RenderSystem.js';
import { Player } from './components/Player.js';
import * as THREE from 'three';

console.log('Testing RenderSystem only...');

let renderSystem = null;
let player = null;

async function testRenderSystem() {
  try {
    console.log('Creating RenderSystem...');
    renderSystem = new RenderSystem();
    
    console.log('Initializing RenderSystem...');
    renderSystem.initialize();
    
    const scene = renderSystem.getScene();
    const camera = renderSystem.getCamera();
    
    console.log('RenderSystem initialized successfully');
    console.log('Scene:', scene);
    console.log('Camera:', camera);
    
    // Add some test objects
    const testCube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    testCube.position.set(0, 1, 0);
    scene.add(testCube);
    
    // Add ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Position camera
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    console.log('Test objects added to scene');
    
    // Try creating a player (without physics)
    console.log('Creating player...');
    player = new Player({}, { playerId: 1, color: 0x0000ff });
    player.setPosition({ x: 2, y: 1, z: 0 });
    
    const playerGroup = player.getThreeGroup();
    scene.add(playerGroup);
    
    console.log('Player added to scene');
    console.log('Player group children:', playerGroup.children.length);
    
    // Start render loop
    function renderLoop() {
      testCube.rotation.y += 0.01;
      renderSystem.update(16.67, [], {});
      requestAnimationFrame(renderLoop);
    }
    
    renderLoop();
    console.log('Render loop started');
    
    // Add to window for debugging
    window.debugRender = { renderSystem, player, scene, camera };
    
  } catch (error) {
    console.error('Error in RenderSystem test:', error);
    console.error('Stack trace:', error.stack);
  }
}

export { testRenderSystem };