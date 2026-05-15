import { useState } from 'react';
import * as THREE from 'three';
import type { Port, RackComponent, Rack } from '../../types';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import { useStore } from '../../store/useStore';
import { useCreateCable } from '../../api/client';

interface Props {
  port: Port;
  component: RackComponent;
  rack: Rack;
}

export function portWorldPosition(port: Port, component: RackComponent, rack: Rack): THREE.Vector3 {
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const D = RACK_DEPTH - 0.06;
  const y = slotY(component.slot_position, rack.height_u);
  const x = (port.position_x - 0.5) * W;
  const py = y + (port.position_y - 0.5) * H;
  const z = port.face === 'front' ? -(D / 2) : D / 2;
  return new THREE.Vector3(x, py, z);
}

export default function PortMarker({ port, component, rack }: Props) {
  const [hovered, setHovered] = useState(false);
  const mode = useStore((s) => s.mode);
  const cableSourcePort = useStore((s) => s.cableSourcePort);
  const setCableSourcePort = useStore((s) => s.setCableSourcePort);
  const createCable = useCreateCable();

  if (mode !== 'cable') return null;

  const pos = portWorldPosition(port, component, rack);
  const isSource = cableSourcePort?.port.id === port.id;
  const color = port.port_type === 'net' ? '#63b3ed' : '#fc8181';

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!cableSourcePort) {
      setCableSourcePort({ compId: component.id, port });
    } else if (cableSourcePort.port.id !== port.id) {
      createCable.mutate({
        rackId: rack.id,
        data: {
          from_comp_id: cableSourcePort.compId,
          to_comp_id: component.id,
          from_port_id: cableSourcePort.port.id,
          to_port_id: port.id,
          type: port.port_type,
        },
      });
      setCableSourcePort(null);
    }
  };

  return (
    <mesh
      position={pos}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.005, 8, 8]} />
      <meshStandardMaterial
        color={isSource ? '#ffffff' : color}
        emissive={isSource ? '#ffffff' : color}
        emissiveIntensity={hovered || isSource ? 2 : 0.5}
      />
    </mesh>
  );
}
