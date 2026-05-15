import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import { useStore } from '../../store/useStore';
import { useRacks, useComponents, useCables } from '../../api/client';
import RackChassis from './RackChassis';
import ComponentMesh from './ComponentMesh';
import CableSystem from './CableSystem';

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
    </Canvas>
  );
}
