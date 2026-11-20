// CP0 "hello 3D": a spinning cube to confirm Three.js + Vite work.
// Phase 1 replaces this with the real renderer that reads state from src/core.
import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const light = new THREE.PointLight(0xffc96b, 30);
light.position.set(2, 3, 2);
scene.add(light);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffb347 })
);
scene.add(cube);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop((t) => {
  cube.rotation.x = t / 1000;
  cube.rotation.y = t / 700;
  renderer.render(scene, camera);
});
