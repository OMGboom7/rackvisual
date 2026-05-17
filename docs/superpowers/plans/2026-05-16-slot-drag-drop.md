# Slot Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to drag rack components to new slots in the 3D view while in Move mode.

**Architecture:** An invisible drag plane at the rack front face captures pointer events during drag, converts world-Y to slot numbers via `worldYToSlot`, and shows free slot highlights via `SlotDropZones`. OrbitControls are disabled during drag via a `DragController` component that reads drag state from the Zustand store.

**Z-axis note:** Camera is at z = +2.5 looking toward the rack. The rack "front" face (visible to user) is at z = −D/2 ≈ −0.42m. The DragPlane must be placed at z slightly MORE positive (closer to camera) than −0.42m so it intercepts rays before the component meshes do.

**Tech Stack:** React Three Fiber, @react-three/drei OrbitControls, Zustand, Three.js, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/store/useStore.ts` | Modify | Add `dragComponentId`, `dragTargetSlot`, setters |
| `src/lib/rack-geometry.ts` | Modify | Add `worldYToSlot` helper |
| `src/components/three/SlotDropZones.tsx` | Create | Visual free-slot overlays during drag |
| `src/components/three/Scene.tsx` | Modify | `DragController` + `DragPlane` + wire-up |
| `src/components/three/ComponentMesh.tsx` | Modify | `onPointerDown` to start drag + drag glow |
| `src/components/ui/DetailPanel.tsx` | Modify | Remove obsolete move text-input banner |
| `src/lib/__tests__/rack-geometry.test.ts` | Create | Unit tests for `worldYToSlot` |

---

## Task 1: Add drag state to the store

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Replace the full file content**

```typescript
import { create } from 'zustand';
import type { AppMode, RackComponent, Port } from '../types';

interface Store {
  selectedRackId: number | null;
  setSelectedRackId: (id: number | null) => void;

  mode: AppMode;
  setMode: (mode: AppMode) => void;

  selectedComponentId: number | null;
  setSelectedComponentId: (id: number | null) => void;

  cableSourcePort: { compId: number; port: Port } | null;
  setCableSourcePort: (v: { compId: number; port: Port } | null) => void;

  showFace: 'front' | 'back' | 'free';
  setShowFace: (f: 'front' | 'back' | 'free') => void;

  dragComponentId: number | null;
  setDragComponentId: (id: number | null) => void;

  dragTargetSlot: number | null;
  setDragTargetSlot: (slot: number | null) => void;
}

export const useStore = create<Store>((set) => ({
  selectedRackId: null,
  setSelectedRackId: (id) => set({ selectedRackId: id, selectedComponentId: null }),

  mode: 'select',
  setMode: (mode) => set({ mode, cableSourcePort: null }),

  selectedComponentId: null,
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),

  cableSourcePort: null,
  setCableSourcePort: (v) => set({ cableSourcePort: v }),

  showFace: 'free',
  setShowFace: (f) => set({ showFace: f }),

  dragComponentId: null,
  setDragComponentId: (id) => set({ dragComponentId: id }),

  dragTargetSlot: null,
  setDragTargetSlot: (slot) => set({ dragTargetSlot: slot }),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/louitz/rackvisual/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/louitz/rackvisual add frontend/src/store/useStore.ts
git -C /Users/louitz/rackvisual commit -m "feat: add drag state to store"
```

---

## Task 2: Add `worldYToSlot` to rack-geometry

**Files:**
- Modify: `src/lib/rack-geometry.ts`
- Create: `src/lib/__tests__/rack-geometry.test.ts`

`worldYToSlot` converts a world-space Y (rack interior centered at 0) to the 1-indexed slot number.
The slot returned is the TOP of the dragged component — so a multi-U component at slot S occupies S…S+heightU-1.

- [ ] **Step 1: Create the test file (TDD)**

Create `src/lib/__tests__/rack-geometry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { worldYToSlot, slotY, U_HEIGHT } from '../rack-geometry';

describe('worldYToSlot', () => {
  const totalU = 42;
  const interiorH = totalU * U_HEIGHT;

  it('top of interior (worldY just below ceiling) maps to slot 1', () => {
    expect(worldYToSlot(interiorH / 2 - 0.001, totalU, 1)).toBe(1);
  });

  it('is the inverse of slotY for 1U components', () => {
    for (let slot = 1; slot <= totalU; slot++) {
      const y = slotY(slot, totalU, 1);
      expect(worldYToSlot(y, totalU, 1)).toBe(slot);
    }
  });

  it('clamps to slot 1 when worldY is above rack interior', () => {
    expect(worldYToSlot(999, totalU, 1)).toBe(1);
  });

  it('clamps to totalU when worldY is below interior for 1U', () => {
    expect(worldYToSlot(-999, totalU, 1)).toBe(totalU);
  });

  it('clamps to totalU - heightU + 1 for multi-U components', () => {
    expect(worldYToSlot(-999, totalU, 2)).toBe(totalU - 1);
    expect(worldYToSlot(-999, totalU, 4)).toBe(totalU - 3);
  });

  it('cursor at top of row 5 maps to slot 5', () => {
    // Top edge of row 5 is at y = interiorH/2 - 4*U_HEIGHT
    const topOfRow5 = interiorH / 2 - 4 * U_HEIGHT + 0.001;
    expect(worldYToSlot(topOfRow5, totalU, 1)).toBe(5);
  });

  it('cursor at bottom of row 5 maps to slot 5 (not 6)', () => {
    // Bottom of row 5 = top of row 6 = interiorH/2 - 5*U_HEIGHT
    const bottomOfRow5 = interiorH / 2 - 5 * U_HEIGHT + 0.001;
    expect(worldYToSlot(bottomOfRow5, totalU, 1)).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/louitz/rackvisual/frontend && npx vitest run src/lib/__tests__/rack-geometry.test.ts 2>&1
```

Expected: FAIL — `worldYToSlot is not a function`.

- [ ] **Step 3: Add `worldYToSlot` to rack-geometry.ts**

Append to the end of `src/lib/rack-geometry.ts`:

```typescript
// Inverse of slotY for 1U: maps world-space Y → 1-indexed slot number (1 = top).
// Returns the slot where the TOP of a heightU-tall component should land.
// Clamps so the component stays within the rack (slot + heightU - 1 <= totalU).
export function worldYToSlot(worldY: number, totalU: number, heightU = 1): number {
  const interiorHeight = totalU * U_HEIGHT;
  const fromTop = interiorHeight / 2 - worldY;
  const slot = Math.floor(fromTop / U_HEIGHT) + 1;
  return Math.max(1, Math.min(slot, totalU - heightU + 1));
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
cd /Users/louitz/rackvisual/frontend && npx vitest run src/lib/__tests__/rack-geometry.test.ts 2>&1
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git -C /Users/louitz/rackvisual add frontend/src/lib/rack-geometry.ts frontend/src/lib/__tests__/rack-geometry.test.ts
git -C /Users/louitz/rackvisual commit -m "feat: add worldYToSlot helper with tests"
```

---

## Task 3: Create SlotDropZones component

**Files:**
- Create: `src/components/three/SlotDropZones.tsx`

Renders green overlays for valid drop slots, brighter for the current target.

- [ ] **Step 1: Create `src/components/three/SlotDropZones.tsx`**

```typescript
import type { ReactElement } from 'react';
import { useStore } from '../../store/useStore';
import { useComponents } from '../../api/client';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import type { Rack } from '../../types';

interface Props { rack: Rack; }

export default function SlotDropZones({ rack }: Props) {
  const { mode, dragComponentId, dragTargetSlot } = useStore();
  const { data: components } = useComponents(rack.id);

  if (mode !== 'move' || dragComponentId === null || !components) return null;

  const dragComp = components.find((c) => c.id === dragComponentId);
  if (!dragComp) return null;

  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const D = RACK_DEPTH - 0.06;
  // Position overlays just in front of component faces (toward camera = more positive z)
  const fz = -(D / 2) + 0.003;

  const heightU = dragComp.height_u;
  const H = heightU * U_HEIGHT - 0.003;

  const occupiedSlots = new Set(
    components
      .filter((c) => c.id !== dragComponentId)
      .flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i)),
  );

  const zones: ReactElement[] = [];
  for (let slot = 1; slot <= rack.height_u - heightU + 1; slot++) {
    const slotRange = Array.from({ length: heightU }, (_, i) => slot + i);
    if (slotRange.some((s) => occupiedSlots.has(s))) continue;

    const y = slotY(slot, rack.height_u, heightU);
    const isTarget = slot === dragTargetSlot;

    zones.push(
      <mesh key={slot} position={[0, y, fz]}>
        <boxGeometry args={[W, H, 0.001]} />
        <meshStandardMaterial
          color={isTarget ? '#22cc55' : '#115522'}
          transparent
          opacity={isTarget ? 0.45 : 0.12}
          depthWrite={false}
        />
      </mesh>,
    );
  }

  return <>{zones}</>;
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/louitz/rackvisual/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/louitz/rackvisual add frontend/src/components/three/SlotDropZones.tsx
git -C /Users/louitz/rackvisual commit -m "feat: add SlotDropZones component for drag targets"
```

---

## Task 4: Wire up DragController + DragPlane in Scene.tsx

**Files:**
- Modify: `src/components/three/Scene.tsx`

Two new sub-components:
- **DragController** (uses `useThree` — must be inside Canvas): disables OrbitControls while dragging, handles Escape
- **DragPlane** (inside rack group): invisible mesh at rack front, drives slot tracking and drop commit

- [ ] **Step 1: Replace `src/components/three/Scene.tsx`**

```typescript
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
          <group>
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
      </Suspense>

      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      <CameraController />
      <DragController />
    </Canvas>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/louitz/rackvisual/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/louitz/rackvisual add frontend/src/components/three/Scene.tsx
git -C /Users/louitz/rackvisual commit -m "feat: add DragController and DragPlane to Scene"
```

---

## Task 5: Add drag initiation and glow to ComponentMesh

**Files:**
- Modify: `src/components/three/ComponentMesh.tsx`

Both `ProceduralComponent` and `GltfComponent` get `onPointerDown` in move mode and a drag glow.

- [ ] **Step 1: Update `ProceduralComponent`**

Add these two lines after the existing `useStore` selectors (near line 422):

```typescript
const dragComponentId = useStore((s) => s.dragComponentId);
const setDragComponentId = useStore((s) => s.setDragComponentId);
const isDragging = dragComponentId === component.id;
```

Add `handlePointerDown` alongside `handleClick`:

```typescript
const handlePointerDown = (e: any) => {
  if (mode !== 'move') return;
  e.stopPropagation();
  setDragComponentId(component.id);
};
```

On the chassis `<mesh>` (the one with `<boxGeometry args={[W, H, D]}`), add `onPointerDown={handlePointerDown}`.

Change the `emissive` and `emissiveIntensity` props on the chassis `meshStandardMaterial`:

```typescript
emissive={isSelected ? '#3366cc' : isDragging ? '#cc8800' : hovered ? ledColor : '#000000'}
emissiveIntensity={isSelected ? 0.35 : isDragging ? 0.6 : hovered ? 0.12 : 0}
```

- [ ] **Step 2: Update `GltfComponent`**

Add the same three store lines after the existing selectors in `GltfComponent` (near line 499):

```typescript
const dragComponentId = useStore((s) => s.dragComponentId);
const setDragComponentId = useStore((s) => s.setDragComponentId);
const isDragging = dragComponentId === component.id;
```

Add the same `handlePointerDown`:

```typescript
const handlePointerDown = (e: any) => {
  if (mode !== 'move') return;
  e.stopPropagation();
  setDragComponentId(component.id);
};
```

On the invisible hitbox `<mesh>` (the one with `visible={false}`), add `onPointerDown={handlePointerDown}`.

Add a drag overlay just before the selection wireframe:

```tsx
{/* Orange glow when being dragged */}
{isDragging && (
  <mesh>
    <boxGeometry args={[W, H, D]} />
    <meshStandardMaterial color="#cc8800" transparent opacity={0.18} />
  </mesh>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/louitz/rackvisual/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/louitz/rackvisual add frontend/src/components/three/ComponentMesh.tsx
git -C /Users/louitz/rackvisual commit -m "feat: add drag initiation and glow to ComponentMesh"
```

---

## Task 6: Remove obsolete move banner from DetailPanel

**Files:**
- Modify: `src/components/ui/DetailPanel.tsx`

- [ ] **Step 1: Remove `moveSlot` and `moveError` state**

Delete these two lines from the `useState` declarations at the top of `DetailPanel`:

```typescript
const [moveSlot, setMoveSlot] = useState('');
const [moveError, setMoveError] = useState('');
```

- [ ] **Step 2: Remove `handleMove` function**

Delete the entire `handleMove` function (lines 53–61 in the current file).

- [ ] **Step 3: Remove the move-mode banner JSX**

Delete this entire block (currently lines 96–110):

```tsx
{/* Move-Modus Banner */}
{mode === 'move' && (
  <div className="mb-2 bg-yellow-900/40 border border-yellow-600/40 rounded p-2">
    <div className="text-yellow-300 mb-1">Verschieben (aktuell: Slot {comp.slot_position})</div>
    <div className="flex gap-1">
      <input
        type="number" min={1} value={moveSlot}
        onChange={(e) => setMoveSlot(e.target.value)}
        placeholder="Neuer Slot"
        className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
      />
      <button onClick={handleMove} className="bg-yellow-700 hover:bg-yellow-600 rounded px-2 py-0.5 text-yellow-100">→</button>
    </div>
    {moveError && <div className="text-red-400 mt-1">{moveError}</div>}
  </div>
)}
```

- [ ] **Step 4: Add a small move-mode hint in the header**

In the header `<div>`, after the `{comp.name}` span, add:

```tsx
{mode === 'move' && (
  <span className="text-yellow-400 text-xs" title="In 3D-Ansicht ziehen um zu verschieben">↕</span>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/louitz/rackvisual/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/louitz/rackvisual add frontend/src/components/ui/DetailPanel.tsx
git -C /Users/louitz/rackvisual commit -m "refactor: replace move text-input with 3D drag hint"
```

---

## Task 7: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/louitz/rackvisual/frontend && npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Golden path — successful drag**

1. Select a rack with ≥3 components
2. Click **Move** in the toolbar
3. Click and hold on a component → it glows orange; green slot outlines appear on free slots
4. Move mouse vertically along the rack → the brighter green highlight follows the cursor
5. Release over a bright green slot → component moves there, highlights disappear

- [ ] **Step 3: Collision guard**

1. In Move mode drag a component toward an occupied slot
2. The occupied slot shows no highlight — cursor can hover there without it turning bright green
3. Releasing over an occupied area does nothing

- [ ] **Step 4: Cancel with Escape**

1. Start a drag (orange glow)
2. Press `Escape` → glow disappears, component stays in its original slot

- [ ] **Step 5: Cancel with right-click**

1. Start a drag
2. Right-click → drag cancels, no move occurs

- [ ] **Step 6: Camera behaviour**

1. In Move mode, without starting a drag: orbit camera normally with mouse
2. Start a drag → mouse should no longer rotate the camera
3. After drop/cancel → orbit works again
