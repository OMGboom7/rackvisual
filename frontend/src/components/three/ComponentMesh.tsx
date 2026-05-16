import { useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Rack, RackComponent } from '../../types';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import { useStore } from '../../store/useStore';
import { useModels } from '../../api/client';

const TYPE_COLORS: Record<string, string> = {
  server:      '#0f2240',
  switch:      '#0d2e1a',
  patch_panel: '#2a2000',
  ups:         '#2d0f0f',
  pdu:         '#1e0f2d',
  blank:       '#141820',
  kvm:         '#0f1f2d',
  custom:      '#1e2535',
};

const TYPE_LED_COLORS: Record<string, string> = {
  server:      '#63b3ed',
  switch:      '#68d391',
  patch_panel: '#f6e05e',
  ups:         '#fc8181',
  pdu:         '#a371f7',
  blank:       '#30363d',
  kvm:         '#4dd0e1',
  custom:      '#8b949e',
};

interface Props { component: RackComponent; rack: Rack; }

// ─── Type-specific front panel details ───────────────────────────────────────

function ServerDetails({ W, H, D, heightU }: { W: number; H: number; D: number; heightU: number }) {
  const fz = -(D / 2 - 0.0015);
  const driveCount = heightU === 1 ? 4 : 8;
  const driveW = (W * 0.52) / driveCount - 0.002;
  const driveH = H * 0.38;
  return (
    <group>
      {/* Drive bay row(s) */}
      {Array.from({ length: driveCount }, (_, i) => (
        <mesh key={i} position={[-(W * 0.23) + i * (driveW + 0.002), heightU === 2 ? H * 0.2 : 0, fz]}>
          <boxGeometry args={[driveW, driveH, 0.001]} />
          <meshStandardMaterial color="#060a12" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      {/* Second row for 2U */}
      {heightU === 2 && Array.from({ length: driveCount }, (_, i) => (
        <mesh key={`b${i}`} position={[-(W * 0.23) + i * (driveW + 0.002), -H * 0.2, fz]}>
          <boxGeometry args={[driveW, driveH, 0.001]} />
          <meshStandardMaterial color="#060a12" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      {/* Brand / model badge */}
      <mesh position={[W * 0.3, 0, fz]}>
        <boxGeometry args={[W * 0.12, H * 0.25, 0.001]} />
        <meshStandardMaterial color="#0a0f1a" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Power button */}
      <mesh position={[W * 0.42, 0, fz]}>
        <circleGeometry args={[0.0045, 12]} />
        <meshStandardMaterial color="#112211" emissive="#22cc44" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function SwitchDetails({ W, H, D, ports }: { W: number; H: number; D: number; ports: number }) {
  const fz = -(D / 2 - 0.0015);
  const portCount = Math.min(ports, 12); // show up to 12 representative ports
  const portW = 0.006;
  const portH = H * 0.35;
  const spacing = (W * 0.7) / portCount;
  return (
    <group>
      {/* Port zone background */}
      <mesh position={[-(W * 0.05), 0, fz]}>
        <boxGeometry args={[W * 0.72, H * 0.65, 0.0008]} />
        <meshStandardMaterial color="#060d0a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Representative ports */}
      {Array.from({ length: portCount }, (_, i) => (
        <mesh key={i} position={[-(W * 0.35) + i * spacing + spacing / 2, H * 0.05, fz]}>
          <boxGeometry args={[portW, portH, 0.001]} />
          <meshStandardMaterial color="#0a1a10" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Status LED row */}
      {Array.from({ length: Math.min(portCount, 8) }, (_, i) => (
        <mesh key={`led${i}`} position={[-(W * 0.35) + i * spacing + spacing / 2, -H * 0.28, fz]}>
          <boxGeometry args={[0.003, 0.003, 0.001]} />
          <meshStandardMaterial color="#00cc44" emissive="#00cc44" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* Console port */}
      <mesh position={[W * 0.4, 0, fz]}>
        <boxGeometry args={[0.012, 0.008, 0.001]} />
        <meshStandardMaterial color="#060d0a" />
      </mesh>
    </group>
  );
}

function PatchPanelDetails({ W, H, D }: { W: number; H: number; D: number }) {
  const fz = -(D / 2 - 0.0015);
  const portCount = 12; // show 12 representative of 24
  const spacing = (W * 0.82) / portCount;
  return (
    <group>
      {/* Front row */}
      {Array.from({ length: portCount }, (_, i) => (
        <mesh key={`f${i}`} position={[-(W * 0.39) + i * spacing + spacing / 2, H * 0.18, fz]}>
          <circleGeometry args={[0.004, 8]} />
          <meshStandardMaterial color="#0a0800" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Back row labels */}
      {Array.from({ length: portCount }, (_, i) => (
        <mesh key={`b${i}`} position={[-(W * 0.39) + i * spacing + spacing / 2, -H * 0.18, fz]}>
          <circleGeometry args={[0.003, 8]} />
          <meshStandardMaterial color="#1a1400" />
        </mesh>
      ))}
      {/* Divider */}
      <mesh position={[0, 0, fz]}>
        <boxGeometry args={[W * 0.9, 0.001, 0.0005]} />
        <meshStandardMaterial color="#3a2800" />
      </mesh>
    </group>
  );
}

function UpsDetails({ W, H, D }: { W: number; H: number; D: number }) {
  const fz = -(D / 2 - 0.0015);
  return (
    <group>
      {/* Display screen */}
      <mesh position={[-(W * 0.1), H * 0.1, fz]}>
        <boxGeometry args={[W * 0.35, H * 0.45, 0.001]} />
        <meshStandardMaterial color="#001a0a" emissive="#00dd66" emissiveIntensity={0.15} />
      </mesh>
      {/* Battery indicator bars */}
      {[0.28, 0.18, 0.08, -0.02].map((yOff, i) => (
        <mesh key={i} position={[W * 0.28, H * yOff, fz]}>
          <boxGeometry args={[W * 0.08, H * 0.06, 0.001]} />
          <meshStandardMaterial color={i < 3 ? '#005500' : '#330000'} emissive={i < 3 ? '#00aa00' : '#000000'} emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* Ventilation slots */}
      {[-0.25, -0.3, -0.35].map((yOff, i) => (
        <mesh key={i} position={[0, H * yOff, fz]}>
          <boxGeometry args={[W * 0.7, 0.002, 0.0005]} />
          <meshStandardMaterial color="#1a0000" />
        </mesh>
      ))}
    </group>
  );
}

function PduDetails({ W, H, D }: { W: number; H: number; D: number }) {
  const fz = -(D / 2 - 0.0015);
  const outlets = 4;
  const outletW = 0.018;
  const outletH = 0.012;
  const spacing = (W * 0.7) / outlets;
  return (
    <group>
      {Array.from({ length: outlets }, (_, i) => (
        <group key={i} position={[-(W * 0.33) + i * spacing + spacing / 2, 0, fz]}>
          {/* Outlet surround */}
          <mesh>
            <boxGeometry args={[outletW, outletH, 0.001]} />
            <meshStandardMaterial color="#0d0014" />
          </mesh>
          {/* Two pin holes */}
          <mesh position={[-0.004, 0, 0]}>
            <circleGeometry args={[0.002, 6]} />
            <meshStandardMaterial color="#02000a" />
          </mesh>
          <mesh position={[0.004, 0, 0]}>
            <circleGeometry args={[0.002, 6]} />
            <meshStandardMaterial color="#02000a" />
          </mesh>
        </group>
      ))}
      {/* Breaker switch */}
      <mesh position={[W * 0.43, 0, fz]}>
        <boxGeometry args={[0.01, 0.018, 0.002]} />
        <meshStandardMaterial color="#1a0030" />
      </mesh>
    </group>
  );
}

function KvmDetails({ W, H, D }: { W: number; H: number; D: number }) {
  const fz = -(D / 2 - 0.0015);
  return (
    <group>
      {/* Screen */}
      <mesh position={[-(W * 0.05), H * 0.08, fz]}>
        <boxGeometry args={[W * 0.55, H * 0.55, 0.001]} />
        <meshStandardMaterial color="#001a22" emissive="#004466" emissiveIntensity={0.2} />
      </mesh>
      {/* Keyboard area */}
      <mesh position={[-(W * 0.05), -H * 0.3, fz]}>
        <boxGeometry args={[W * 0.55, H * 0.2, 0.0008]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* USB ports */}
      <mesh position={[W * 0.38, 0, fz]}>
        <boxGeometry args={[0.01, 0.006, 0.001]} />
        <meshStandardMaterial color="#0a0f12" />
      </mesh>
    </group>
  );
}

function BlankDetails({ W, H, D }: { W: number; H: number; D: number }) {
  const fz = -(D / 2 - 0.0015);
  // Screw holes at corners
  const screwPositions: [number, number][] = [
    [-(W * 0.46), 0], [W * 0.46, 0],
  ];
  return (
    <group>
      {screwPositions.map(([x, y], i) => (
        <mesh key={i} position={[x, y, fz]}>
          <circleGeometry args={[0.003, 6]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function TypeDetails({ type, W, H, D, heightU, netPorts }: {
  type: string; W: number; H: number; D: number; heightU: number; netPorts: number;
}) {
  switch (type) {
    case 'server':      return <ServerDetails W={W} H={H} D={D} heightU={heightU} />;
    case 'switch':      return <SwitchDetails W={W} H={H} D={D} ports={netPorts} />;
    case 'patch_panel': return <PatchPanelDetails W={W} H={H} D={D} />;
    case 'ups':         return <UpsDetails W={W} H={H} D={D} />;
    case 'pdu':         return <PduDetails W={W} H={H} D={D} />;
    case 'kvm':         return <KvmDetails W={W} H={H} D={D} />;
    case 'blank':       return <BlankDetails W={W} H={H} D={D} />;
    default:            return null;
  }
}

// ─── Main procedural component ────────────────────────────────────────────────

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

  const type = model?.type ?? 'custom';
  const baseColor = component.color ?? TYPE_COLORS[type] ?? '#1e2535';
  const ledColor = TYPE_LED_COLORS[type] ?? '#63b3ed';

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'select') setSelectedComponentId(isSelected ? null : component.id);
    if (mode === 'delete') useStore.getState().setSelectedComponentId(component.id);
  };

  return (
    <group position={[0, y, 0]}>
      {/* Main chassis */}
      <mesh
        castShadow receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.65}
          roughness={0.35}
          emissive={isSelected ? '#3366cc' : hovered ? ledColor : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : hovered ? 0.12 : 0}
        />
      </mesh>

      {/* Front face plate — slightly brighter */}
      <mesh position={[0, 0, -(D / 2 - 0.0005)]}>
        <boxGeometry args={[W, H, 0.001]} />
        <meshStandardMaterial color={baseColor} metalness={0.4} roughness={0.5} emissive={baseColor} emissiveIntensity={0.08} />
      </mesh>

      {/* Type-specific front details */}
      <TypeDetails type={type} W={W} H={H} D={D} heightU={component.height_u} netPorts={model?.net_ports ?? 0} />

      {/* LED indicator */}
      <mesh position={[-(W / 2 - 0.008), H / 2 - 0.006, -(D / 2 - 0.001)]}>
        <boxGeometry args={[0.006, 0.003, 0.001]} />
        <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={2} />
      </mesh>

      {/* Side vent lines for servers/UPS */}
      {(type === 'server' || type === 'ups') && [-0.3, -0.1, 0.1, 0.3].map((zOff, i) => (
        <mesh key={i} position={[W / 2 - 0.001, 0, D * zOff]}>
          <boxGeometry args={[0.001, H * 0.6, 0.004]} />
          <meshStandardMaterial color="#050810" />
        </mesh>
      ))}

      {/* Selection wireframe */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[W + 0.004, H + 0.004, D + 0.004]} />
          <meshStandardMaterial color="#4488ff" wireframe />
        </mesh>
      )}
    </group>
  );
}

// ─── GLTF component ───────────────────────────────────────────────────────────

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

// ─── Export ───────────────────────────────────────────────────────────────────

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
