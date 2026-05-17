/**
 * GLB Model Sanity Checker
 * Loads every GLB in data/models/ and reports:
 *  - meshes hidden by the >0.99m filter (broken unit-cube nodes)
 *  - models where ALL meshes are filtered → invisible in the app
 *  - bounding box dimensions of the surviving geometry
 */

import * as THREE from './frontend/node_modules/three/build/three.module.js';
import { GLTFLoader } from './frontend/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync, readdirSync } from 'fs';
import { resolve, basename } from 'path';

// Polyfill fetch + Blob for GLTFLoader in Node
import { Blob } from 'buffer';
global.Blob = Blob;

const THRESHOLD = 0.99;
const MODELS_DIR = resolve('/Users/louitz/rackvisual/data/models');

const files = readdirSync(MODELS_DIR)
  .filter(f => f.endsWith('.glb'))
  .sort();

const issues = [];
const ok = [];

for (const file of files) {
  const filePath = resolve(MODELS_DIR, file);
  const buffer = readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  await new Promise((resolveP) => {
    const loader = new GLTFLoader();
    loader.parse(arrayBuffer, '', (gltf) => {
      const scene = gltf.scene;
      const hiddenMeshes = [];
      const visibleMeshes = [];
      const box = new THREE.Box3();
      const tmp = new THREE.Vector3();

      scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const meshBox = new THREE.Box3().setFromObject(node);
        meshBox.getSize(tmp);
        const maxDim = Math.max(tmp.x, tmp.y, tmp.z);
        if (tmp.x >= THRESHOLD || tmp.y >= THRESHOLD || tmp.z >= THRESHOLD) {
          hiddenMeshes.push({ name: node.name, size: `${tmp.x.toFixed(3)}x${tmp.y.toFixed(3)}x${tmp.z.toFixed(3)}` });
        } else {
          visibleMeshes.push(node.name);
          box.union(meshBox);
        }
      });

      const size = new THREE.Vector3();
      box.getSize(size);
      const name = basename(file, '.glb');

      if (visibleMeshes.length === 0) {
        issues.push({
          file: name,
          status: '❌ ALL MESHES HIDDEN',
          hidden: hiddenMeshes.length,
          visible: 0,
          size: 'n/a',
        });
      } else if (hiddenMeshes.length > 0) {
        issues.push({
          file: name,
          status: `⚠️  ${hiddenMeshes.length} node(s) hidden`,
          hidden: hiddenMeshes.length,
          visible: visibleMeshes.length,
          size: `${size.x.toFixed(3)}x${size.y.toFixed(3)}x${size.z.toFixed(3)}m`,
          hiddenNames: hiddenMeshes.slice(0, 5).map(h => `${h.name}(${h.size})`).join(', '),
        });
      } else {
        ok.push({
          file: name,
          visible: visibleMeshes.length,
          size: `${size.x.toFixed(3)}x${size.y.toFixed(3)}x${size.z.toFixed(3)}m`,
        });
      }
      resolveP();
    }, (err) => {
      issues.push({ file: basename(file, '.glb'), status: `💥 PARSE ERROR: ${err.message}`, hidden: 0, visible: 0, size: 'n/a' });
      resolveP();
    });
  });
}

console.log('\n=== ISSUES ===');
if (issues.length === 0) {
  console.log('None — all models OK');
} else {
  for (const m of issues) {
    console.log(`\n${m.status.padEnd(30)} ${m.file}`);
    if (m.hiddenNames) console.log(`  hidden nodes: ${m.hiddenNames}`);
    if (m.size !== 'n/a') console.log(`  visible bbox: ${m.size}`);
  }
}

console.log('\n=== OK MODELS ===');
for (const m of ok) {
  console.log(`  ✅ ${m.file.padEnd(35)} ${m.visible} mesh(es)  bbox: ${m.size}`);
}

console.log(`\nTotal: ${files.length} files — ${issues.length} issues, ${ok.length} clean`);
