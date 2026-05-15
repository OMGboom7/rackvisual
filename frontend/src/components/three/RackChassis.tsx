import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildRackChassis } from '../../lib/rack-geometry';
import type { Rack } from '../../types';

interface Props {
  rack: Rack;
}

export default function RackChassis({ rack }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    const chassis = buildRackChassis(rack.width, rack.height_u);
    groupRef.current.add(chassis);
  }, [rack.width, rack.height_u]);

  return <group ref={groupRef} />;
}
