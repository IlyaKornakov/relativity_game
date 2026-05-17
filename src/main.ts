import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';
import { RelativityShader } from './RelativityShader';

// Setup Scene
const scene = new THREE.Scene();

// Setup Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.y = 2;

// Setup Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
renderer.setPixelRatio(isTouch ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
// Important for tone mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app')!.appendChild(renderer.domElement);

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
let cityTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Calculate Gamma for Coordinate Time
  const betaSq = Math.min(player.velocity.lengthSq() / (player.speedOfLight * player.speedOfLight), 0.999999);
  const gamma = 1.0 / Math.sqrt(1.0 - betaSq);
  cityTime += delta * gamma;

  // Update Game Logic
  player.update(delta);
  world.update(delta, camera, player.velocity, player.speedOfLight, cityTime);

  // Update Relativity Uniforms
  RelativityShader.uniforms.uVelocity.value.copy(player.velocity);
  RelativityShader.uniforms.uSpeedOfLight.value = player.speedOfLight;
  RelativityShader.uniforms.uCityTime.value = cityTime;

  // Render
  renderer.render(scene, camera);
}

animate();
