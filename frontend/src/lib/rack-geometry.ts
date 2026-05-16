import * as THREE from 'three';

// 1U = 0.04445m (1.75"), 19" rack = 0.482m wide, depth = 0.9m
export const U_HEIGHT = 0.04445;
export const RACK_WIDTH_19 = 0.482;
export const RACK_WIDTH_10 = 0.254;
export const RACK_DEPTH = 0.9;
export const POST_SIZE = 0.038;

export function getRackWidth(width: '10"' | '19"') {
  return width === '19"' ? RACK_WIDTH_19 : RACK_WIDTH_10;
}

export function getRackHeight(heightU: number) {
  return heightU * U_HEIGHT + 0.1;
}

// Compute Y center position of a component within the rack interior
// Slot 1 = topmost slot; heightU accounts for multi-U components
export function slotY(slot: number, totalU: number, heightU = 1): number {
  const interiorHeight = totalU * U_HEIGHT;
  return (interiorHeight / 2) - (slot - 1) * U_HEIGHT - (heightU * U_HEIGHT) / 2;
}

// Build a rack chassis as a THREE.Group (posts + rails + mounting strips)
export function buildRackChassis(width: '10"' | '19"', heightU: number): THREE.Group {
  const group = new THREE.Group();
  const W = getRackWidth(width);
  const H = getRackHeight(heightU);
  const D = RACK_DEPTH;
  const P = POST_SIZE;

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.7, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, metalness: 0.5, roughness: 0.5 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, metalness: 0.8, roughness: 0.3 });

  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // 4 vertical posts
  const xOff = (W - P) / 2;
  const zOff = (D - P) / 2;
  [[-xOff, -zOff], [xOff, -zOff], [-xOff, zOff], [xOff, zOff]].forEach(([x, z]) => {
    addBox(P, H, P, x, 0, z, metalMat);
  });

  // Top + bottom horizontal rails (front & back)
  const railH = 0.04;
  const railD = 0.05;
  [H / 2 - railH / 2, -(H / 2 - railH / 2)].forEach((y) => {
    [-zOff, zOff].forEach((z) => {
      addBox(W, railH, railD, 0, y, z, metalMat);
    });
    addBox(railD, railH, D, -xOff, y, 0, metalMat);
    addBox(railD, railH, D, xOff, y, 0, metalMat);
  });

  // Back cable management bar
  addBox(W - P * 2, 0.04, 0.03, 0, 0, D / 2 - P / 2 - 0.015, darkMat);

  return group;
}

// Inverse of slotY for 1U: maps world-space Y → 1-indexed slot number (1 = top).
// Returns the slot where the TOP of a heightU-tall component should land.
// Clamps so the component stays within the rack (slot + heightU - 1 <= totalU).
export function worldYToSlot(worldY: number, totalU: number, heightU = 1): number {
  const interiorHeight = totalU * U_HEIGHT;
  const fromTop = interiorHeight / 2 - worldY;
  const slot = Math.floor(fromTop / U_HEIGHT) + 1;
  return Math.max(1, Math.min(slot, totalU - heightU + 1));
}
