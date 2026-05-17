# Slot Drag & Drop — Design Spec
Date: 2026-05-16

## Goal
Allow users to reposition rack components by dragging them to a new slot in the 3D view, while in Move mode.

## Interaction Model
- Move mode remains a dedicated toolbar button (separate from Select)
- In Move mode: `pointerdown` on a component starts a drag
- OrbitControls are disabled for the duration of the drag
- The component visually stays at its original slot; a green ghost appears at the target slot
- `pointerup` commits the new slot via API; OrbitControls re-enabled
- `Escape` or right-click cancels the drag

## Architecture

### State — `useStore.ts`
Two new fields:
- `dragComponentId: number | null` — which component is being dragged
- `dragTargetSlot: number | null` — current drop target slot (null if not over a valid slot)
- Corresponding setters

### Geometry helper — `rack-geometry.ts`
New function `worldYToSlot(worldY, totalU, heightU): number` — inverse of `slotY`.
Maps a world-space Y coordinate (within rack interior) to the nearest slot number (1 = top).

### Drag plane — `Scene.tsx`
- `orbitControlsRef` passed to `<OrbitControls ref={orbitControlsRef}>` (from @react-three/drei)
- Invisible `<mesh>` plane at z = −D/2, width × interior height, `pointerEvents` active
- Only rendered when `dragComponentId !== null`
- `onPointerMove`: call `worldYToSlot`, check if slot is free, set `dragTargetSlot`
- `onPointerUp`: call `updateComponent({ slot_position: dragTargetSlot })`, clear drag state, re-enable OrbitControls
- `Escape` key listener in `useEffect` → cancel drag

### Component mesh — `ComponentMesh.tsx`
- `onPointerDown` in move mode: set `dragComponentId`, disable `orbitControlsRef.current`
- Visual state: when `dragComponentId === this.id`, render with brighter emissive glow to indicate "grabbed"

### Drop zones — `SlotDropZones.tsx` (new)
Rendered inside the rack group, only when `mode === 'move'` and drag is active.
- Free slots: `meshStandardMaterial` green, opacity ~0.15
- `dragTargetSlot`: brighter green, opacity ~0.4 (valid drop target)
- Occupied slots: no overlay (implicitly blocked)

### Detail Panel — `DetailPanel.tsx`
Remove the old move-mode text-input block (replaced by the 3D drag interaction).

## Data Flow
```
pointerDown on mesh
  → store.setDragComponentId(id)
  → orbitControls.enabled = false

pointerMove on DragPlane
  → worldY → slot number
  → check free slots list
  → store.setDragTargetSlot(slot | null)

SlotDropZones reads dragTargetSlot → renders highlights

pointerUp on DragPlane
  → if dragTargetSlot !== null: updateComponent(slot_position)
  → store.setDragComponentId(null)
  → orbitControls.enabled = true
```

## Collision Handling
- Client-side: free slot list = all slots NOT occupied by components other than `dragComponentId`
- For multi-U components: a target slot is only valid if `slot + heightU - 1 <= rack.height_u` (no overflow at bottom)
- Dragging outside the DragPlane (e.g. moving mouse off the rack): set `dragTargetSlot` to null; drag stays active until `pointerup` or `Escape`
- Server-side: existing 409 collision check in `PUT /components/:id` as safety net

## Files Changed
| File | Change |
|------|--------|
| `src/store/useStore.ts` | Add `dragComponentId`, `dragTargetSlot`, setters |
| `src/lib/rack-geometry.ts` | Add `worldYToSlot` |
| `src/components/three/Scene.tsx` | OrbitControls ref, DragPlane, Escape handler |
| `src/components/three/ComponentMesh.tsx` | `onPointerDown` in move mode, drag glow |
| `src/components/three/SlotDropZones.tsx` | New component — green slot overlays |
| `src/components/ui/DetailPanel.tsx` | Remove old move text-input |
| `src/types/index.ts` | No change (AppMode already has 'move') |

## API Changes
None. Existing `PUT /racks/:rackId/components/:cid` with `{ slot_position }` covers the move.
