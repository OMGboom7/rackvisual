import { useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Rack, RackComponent } from '../../types';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import { useStore } from '../../store/useStore';
import { useModels } from '../../api/client';

const TYPE_COLORS: Record<string, string> = {
  server: '#1e3a5f',
  switch: '#1a3d2b',
  patch_panel: '#3d3000',
  ups: '#3d1a1a',
  pdu: '#2d1a3d',
  blank: '#1a1f2a',
  kvm: '#1a2d3d',
  custom: '#2a2a2a',
};

const TYPE_LED_COLORS: Record<string, string> = {
  server: '#63b3ed',
  switch: '#68d391',
  patch_panel: '#f6e05e',
  ups: '#fc8181',
  pdu: '#a371f7',
  blank: '#30363d',
  kvm: '#63b3ed',
  custom: '#8b949e',
};

interface Props {
  component: RackComponent;
  rack: Rack;
}

function ProceduralComponent({ component, rack, model }: Props & { model: any }) {
  const [hovered, setHovered] = useState(false);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useStore((s) => s.setSelectedComponentId);
  const mode = useStore((s) => s.mode);

  const isSelected = selectedComponentId === component.id;
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const D = RACK_DEPTH - 0.06;
  const y = slotY(component.slot_position, rack.height_u);

  const baseColor = component.color ?? TYPE_COLORS[model?.type ?? 'custom'] ?? '#1e2535';
  const ledColor = TYPE_LED_COLORS[model?.type ?? 'custom'] ?? '#63b3ed';

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'select') setSelectedComponentId(isSelected ? null : component.id);
    if (mode === 'delete') useStore.getState().setSelectedComponentId(component.id);
  };

  return (
    <group position={[0, y, 0]}>
      <mesh
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.6}
          roughness={0.4}
          emissive={isSelected ? '#3366cc' : hovered ? ledColor : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : hovered ? 0.15 : 0.05}
        />
      </mesh>
      {/* LED indicator */}
      <mesh position={[-(W / 2 - 0.01), 0, -(D / 2 - 0.001)]}>
        <boxGeometry args={[0.006, 0.006, 0.001]} />
        <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={1.5} />
      </mesh>
      {/* Label area */}
      <mesh position={[0, 0, -(D / 2 - 0.001)]}>
        <planeGeometry args={[W * 0.6, H * 0.4]} />
        <meshStandardMaterial color="#111520" transparent opacity={0.5} />
      </mesh>
      {isSelected && (
        <mesh>
          <boxGeometry args={[W + 0.004, H + 0.004, D + 0.004]} />
          <meshStandardMaterial color="#4488ff" wireframe />
        </mesh>
      )}
    </group>
  );
}

function GltfComponent({ component, rack, filePath }: Props & { filePath: string }) {
  const gltf = useLoader(GLTFLoader, `/api/models/file/${filePath}`);
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const y = slotY(component.slot_position, rack.height_u);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.min(W / size.x, H / size.y, (RACK_DEPTH - 0.06) / size.z);
  return (
    <group position={[0, y, 0]} scale={scale}>
      <primitive object={gltf.scene.clone()} />
    </group>
  );
}

export default function ComponentMesh({ component, rack }: Props) {
  const { data: models } = useModels();
  const model = models?.find((m) => m.id === component.model_id);
  if (model?.file_path) {
    return (
      <Suspense fallback={<ProceduralComponent component={component} rack={rack} model={model} />}>
        <GltfComponent component={component} rack={rack} filePath={model.file_path} />
      </Suspense>
    );
  }
  return <ProceduralComponent component={component} rack={rack} model={model} />;
}
