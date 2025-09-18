/**
 * Super simple debug version - just shows basic cubes
 */
import * as THREE from 'three';

console.log('Starting super simple debug version...');

// Create basic Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add bright lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

// Add some colorful cubes
const cubes = [];

// Red cube at origin
const redCube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
redCube.position.set(0, 0, 0);
scene.add(redCube);
cubes.push(redCube);

// Green cube above
const greenCube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
greenCube.position.set(0, 3, 0);
scene.add(greenCube);
cubes.push(greenCube);

// Blue cube to the side
const blueCube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0x0000ff })
);
blueCube.position.set(3, 0, 0);
scene.add(blueCube);
cubes.push(blueCube);

// Position camera far back
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

console.log('Scene created with', scene.children.length, 'children');
console.log('Camera position:', camera.position);

// Simple animation loop
function animate() {
  // Rotate cubes
  cubes.forEach((cube, index) => {
    cube.rotation.x += 0.01 * (index + 1);
    cube.rotation.y += 0.01 * (index + 1);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
console.log('Animation started');

// Add to window for debugging
window.debugScene = { scene, camera, renderer, cubes };