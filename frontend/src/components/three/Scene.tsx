import { useEffect, useRef, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useRacks, useComponents, useCables, useUpdateComponent } from '../../api/client';
import { getRackWidth, getRackHeight, RACK_DEPTH, worldYToSlot } from '../../lib/rack-geometry';
import RackChassis from './RackChassis';
import ComponentMesh from './ComponentMesh';
import CableSystem from './CableSystem';
import SlotDropZones from './SlotDropZones';
import type { Rack, RackComponent } from '../../types';

// ─── Camera snap ─────────────────────────────────────────────────────────────

function CameraController() {
  const showFace = useStore((s) => s.showFace);
  const { camera, controls } = useThree();
  const prevFace = useRef(showFace);

  useEffect(() => {
    if (showFace === prevFace.current) return;
    prevFace.current = showFace;
    if (showFace === 'free') return;
    const oc = controls as any;
    camera.position.set(0, 0.3, showFace === 'front' ? 2.8 : -2.8);
    if (oc?.target) { oc.target.set(0, 0.3, 0); oc.update(); }
    else camera.lookAt(new THREE.Vector3(0, 0.3, 0));
  }, [showFace, camera, controls]);

  return null;
}

// ─── Drag controller ─────────────────────────────────────────────────────────
// Disables OrbitControls while a drag is in progress and handles Escape cancel.

function DragController() {
  const { controls } = useThree();
  const dragComponentId = useStore((s) => s.dragComponentId);
  const setDragComponentId = useStore((s) => s.setDragComponentId);
  const setDragTargetSlot = useStore((s) => s.setDragTargetSlot);

  useEffect(() => {
    if (controls) (controls as any).enabled = dragComponentId === null;
  }, [controls, dragComponentId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragComponentId !== null) {
        setDragComponentId(null);
        setDragTargetSlot(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dragComponentId, setDragComponentId, setDragTargetSlot]);

  return null;
}

// ─── Drag plane ───────────────────────────────────────────────────────────────
// Invisible plane just in front of the rack (toward camera = more positive z).
// Only active during drag. Captures pointermove/pointerup/contextmenu events.

function DragPlane({ rack, components }: { rack: Rack; components: RackComponent[] }) {
  const { dragComponentId, dragTargetSlot, setDragTargetSlot, setDragComponentId } = useStore();
  const updateComponent = useUpdateComponent();

  if (dragComponentId === null) return null;

  const dragComp = components.find((c) => c.id === dragComponentId);
  if (!dragComp) return null;

  const W = getRackWidth(rack.width);
  const H = getRackHeight(rack.height_u);
  // Place plane in front of component faces. Front face is at z = -(D/2).
  // Camera is at positive z, so "in front" = slightly more positive z.
  const D = RACK_DEPTH - 0.06;
  const fz = -(D / 2) + 0.02;

  const occupiedSlots = new Set(
    components
      .filter((c) => c.id !== dragComponentId)
      .flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i)),
  );

  const computeSlot = (y: number): number | null => {
    const slot = worldYToSlot(y, rack.height_u, dragComp.height_u);
    const slotRange = Array.from({ length: dragComp.height_u }, (_, i) => slot + i);
    return slotRange.some((s) => occupiedSlots.has(s)) ? null : slot;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setDragTargetSlot(computeSlot(e.point.y));
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (dragTargetSlot !== null) {
      updateComponent.mutate({
        rackId: rack.id,
        compId: dragComponentId,
        data: { slot_position: dragTargetSlot },
      });
    }
    setDragComponentId(null);
    setDragTargetSlot(null);
  };

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setDragComponentId(null);
    setDragTargetSlot(null);
  };

  return (
    <mesh
      position={[0, 0, fz]}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── 前/后 方向标注组件 ───────────────────────────────────────────────────────

function DirectionLabel({ position, text, color }: { position: [number, number, number]; text: string; color: string }) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!ref.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = color;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 36);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    ref.current.material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    ref.current.scale.set(0.6, 0.3, 1);
  }, [text, color]);
  return <sprite ref={ref} position={position} />;
}

// ─── Main scene ───────────────────────────────────────────────────────────────

export default function Scene() {
  const selectedRackId = useStore((s) => s.selectedRackId);
  const { data: racks } = useRacks();
  const { data: components } = useComponents(selectedRackId);
  const { data: cables } = useCables(selectedRackId);

  const rack = racks?.find((r) => r.id === selectedRackId);

  return (
    <Canvas
      shadows
      camera={{ position: [2, 1.5, 2.5], fov: 50 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0a0e17']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#4488ff" />

      <Suspense fallback={null}>
        <Environment preset="city" />
        {rack && (
          <group position={[0, getRackHeight(rack.height_u) / 2 - 0.8, 0]}>
            <RackChassis rack={rack} />
            <SlotDropZones rack={rack} />
            <DragPlane rack={rack} components={components ?? []} />
            {(components ?? []).map((comp) => (
              <ComponentMesh key={comp.id} component={comp} rack={rack} />
            ))}
            {cables && components && (
              <CableSystem cables={cables} components={components} rack={rack} />
            )}
          </group>
        )}
        <Grid
          position={[0, -0.8, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1e2535"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#2a3550"
          fadeDistance={12}
          infiniteGrid
        />

        {/* 前/后 方向标注 - 使用 Canvas Sprite */}
        <DirectionLabel position={[-1.5, -0.75, -1.5]} text="前" color="#4488ff" />
        <DirectionLabel position={[-1.5, -0.75, 1.5]} text="后" color="#ff6644" />
      </Suspense>

      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <CameraController />
      <DragController />
    </Canvas>
  );
}
