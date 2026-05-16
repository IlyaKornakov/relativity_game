import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';
import { RelativityShader } from './RelativityShader';

// Setup Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Setup Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.y = 2;

// Setup Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Important for tone mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app')!.appendChild(renderer.domElement);

// Setup Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Add a visible sun
const sunGeo = new THREE.SphereGeometry(200, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
sunMat.onBeforeCompile = (shader) => RelativityShader.inject(shader);
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.position.set(2000, 1000, -2000);
sun.frustumCulled = false; // Always render
scene.add(sun);

const sunLight = new THREE.PointLight(0xffffee, 10000000, 10000);
sunLight.position.copy(sun.position);
scene.add(sunLight);

// Setup Game Objects
const player = new Player(camera);
const world = new World(scene);

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Update Game Logic
  player.update(delta);
  world.update(delta, camera, player.velocity, player.speedOfLight);

  // Update Relativity Uniforms
  RelativityShader.uniforms.uVelocity.value.copy(player.velocity);
  RelativityShader.uniforms.uSpeedOfLight.value = player.speedOfLight;

  // Render
  renderer.render(scene, camera);
}

animate();
