import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { Cable, RackComponent, Rack } from '../../types';
import { useModels, useModelPorts } from '../../api/client';
import { portWorldPosition } from './PortMarker';
import PortMarker from './PortMarker';
import { useStore } from '../../store/useStore';

interface Props {
  cables: Cable[];
  components: RackComponent[];
  rack: Rack;
}

function CableLine({ cable, components, rack }: { cable: Cable; components: RackComponent[]; rack: Rack }) {
  const fromComp = components.find((c) => c.id === cable.from_comp_id);
  const toComp = components.find((c) => c.id === cable.to_comp_id);
  const { data: fromPorts } = useModelPorts(fromComp?.model_id ?? null);
  const { data: toPorts } = useModelPorts(toComp?.model_id ?? null);

  const fromPort = fromPorts?.find((p) => p.id === cable.from_port_id);
  const toPort = toPorts?.find((p) => p.id === cable.to_port_id);

  const points = useMemo(() => {
    if (!fromComp || !toComp || !fromPort || !toPort) return null;
    const start = portWorldPosition(fromPort, fromComp, rack);
    const end = portWorldPosition(toPort, toComp, rack);
    const offset = fromPort.face === 'front' ? -0.15 : 0.15;
    const endOffset = toPort.face === 'front' ? -0.15 : 0.15;
    const ctrl1 = start.clone().add(new THREE.Vector3(0, 0, offset));
    const ctrl2 = end.clone().add(new THREE.Vector3(0, 0, endOffset));
    const curve = new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
    return curve.getPoints(32);
  }, [fromComp, toComp, fromPort, toPort, rack]);

  if (!points) return null;
  const color = cable.color ?? (cable.type === 'power' ? '#fc8181' : '#63b3ed');
  return <Line points={points} color={color} lineWidth={1.5} />;
}

function ComponentPorts({ component, rack, modelId }: { component: RackComponent; rack: Rack; modelId: number }) {
  const { data: ports } = useModelPorts(modelId);
  if (!ports) return null;
  return (
    <>
      {ports.map((port) => (
        <PortMarker key={port.id} port={port} component={component} rack={rack} />
      ))}
    </>
  );
}

export default function CableSystem({ cables, components, rack }: Props) {
  const mode = useStore((s) => s.mode);
  const { data: models } = useModels();
  return (
    <group>
      {cables.map((cable) => (
        <CableLine key={cable.id} cable={cable} components={components} rack={rack} />
      ))}
      {mode === 'cable' &&
        components.map((comp) => {
          const model = models?.find((m) => m.id === comp.model_id);
          if (!model) return null;
          return <ComponentPorts key={comp.id} component={comp} rack={rack} modelId={model.id} />;
        })}
    </group>
  );
}
