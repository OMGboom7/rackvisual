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
