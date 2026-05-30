import { useState, useMemo, Suspense, Component, ReactNode } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Rack, RackComponent } from '../../types';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import { useStore } from '../../store/useStore';
import { useModels } from '../../api/client';

class GltfErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}

const TYPE_COLORS: Record<string, string> = {
  server:      '#0f2240',
  switch:      '#0d2e1a',
  patch_panel: '#2a2000',
  ups:         '#2d0f0f',
  pdu:         '#1e0f2d',
  blank:       '#141820',
  kvm:         '#0f1f2d',
  storage:     '#0d1f2d',
  firewall:    '#2d1800',
  router:      '#1a0d2d',
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
  storage:     '#90cdf4',
  firewall:    '#f6ad55',
  router:      '#b794f4',
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

// Inspired by Synology/NetApp NAS — dense drive bay grid on the front
function StorageDetails({ W, H, D, heightU, bays }: { W: number; H: number; D: number; heightU: number; bays: number }) {
  const fz = -(D / 2 - 0.0015);
  const cols = Math.min(bays > 12 ? 12 : 6, bays);
  const rows = heightU >= 4 ? 4 : Math.ceil(bays / cols);
  const bayW = (W * 0.76) / cols - 0.002;
  const bayH = (H * 0.7) / rows - 0.002;
  return (
    <group>
      {/* Drive bay grid */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <group key={`${r}-${c}`} position={[
            -(W * 0.36) + c * (bayW + 0.002) + bayW / 2,
            H * (0.25 - r * (0.55 / Math.max(rows - 1, 1))),
            fz,
          ]}>
            <mesh>
              <boxGeometry args={[bayW, bayH, 0.001]} />
              <meshStandardMaterial color="#060c14" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Latch indicator */}
            <mesh position={[bayW / 2 - 0.003, 0, 0]}>
              <boxGeometry args={[0.003, bayH * 0.3, 0.0008]} />
              <meshStandardMaterial color="#0a1a28" />
            </mesh>
          </group>
        ))
      )}
      {/* Status panel right side */}
      <mesh position={[W * 0.41, 0, fz]}>
        <boxGeometry args={[W * 0.1, H * 0.55, 0.001]} />
        <meshStandardMaterial color="#04080f" />
      </mesh>
      {/* Activity LED column */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[W * 0.44, H * (0.2 - i * 0.13), fz]}>
          <boxGeometry args={[0.004, 0.004, 0.001]} />
          <meshStandardMaterial color="#007acc" emissive="#007acc" emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

// Inspired by Fortinet/Palo Alto — status display + dense port zone + bypass pairs
function FirewallDetails({ W, H, D, netPorts }: { W: number; H: number; D: number; netPorts: number }) {
  const fz = -(D / 2 - 0.0015);
  const portCount = Math.min(netPorts, 10);
  const portW = 0.008;
  const spacing = (W * 0.55) / portCount;
  return (
    <group>
      {/* Status display */}
      <mesh position={[-(W * 0.36), 0, fz]}>
        <boxGeometry args={[W * 0.14, H * 0.55, 0.001]} />
        <meshStandardMaterial color="#0d0800" emissive="#cc5500" emissiveIntensity={0.1} />
      </mesh>
      {/* Throughput bar */}
      {[0.15, 0.05, -0.05, -0.15].map((yOff, i) => (
        <mesh key={i} position={[-(W * 0.36), H * yOff, fz]}>
          <boxGeometry args={[W * 0.1 * (1 - i * 0.15), 0.003, 0.001]} />
          <meshStandardMaterial color={i < 2 ? '#cc5500' : '#331400'} emissive={i < 2 ? '#cc5500' : '#000'} emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Port zone background */}
      <mesh position={[W * 0.08, 0, fz]}>
        <boxGeometry args={[W * 0.58, H * 0.65, 0.0008]} />
        <meshStandardMaterial color="#080400" />
      </mesh>
      {/* Ports — alternating 10G (orange) / 1G (amber) */}
      {Array.from({ length: portCount }, (_, i) => (
        <mesh key={i} position={[-(W * 0.20) + i * spacing + spacing / 2, 0, fz]}>
          <boxGeometry args={[portW, H * 0.4, 0.001]} />
          <meshStandardMaterial
            color={i < portCount / 2 ? '#1a0a00' : '#0a0800'}
            emissive={i < portCount / 2 ? '#441100' : '#220e00'}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      {/* Port LEDs */}
      {Array.from({ length: Math.min(portCount, 8) }, (_, i) => (
        <mesh key={`l${i}`} position={[-(W * 0.20) + i * spacing + spacing / 2, -H * 0.32, fz]}>
          <boxGeometry args={[0.003, 0.003, 0.001]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* Console port */}
      <mesh position={[W * 0.42, 0, fz]}>
        <boxGeometry args={[0.012, 0.007, 0.001]} />
        <meshStandardMaterial color="#080400" />
      </mesh>
    </group>
  );
}

// Inspired by Cisco ISR / Mikrotik CCR — WAN/LAN module bays + status display
function RouterDetails({ W, H, D }: { W: number; H: number; D: number }) {
  const fz = -(D / 2 - 0.0015);
  return (
    <group>
      {/* WAN module bay (left, purple tinted) */}
      <mesh position={[-(W * 0.3), 0, fz]}>
        <boxGeometry args={[W * 0.22, H * 0.65, 0.0008]} />
        <meshStandardMaterial color="#0d0820" />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={i} position={[-(W * 0.36) + i * 0.026, 0, fz]}>
          <boxGeometry args={[0.018, H * 0.5, 0.001]} />
          <meshStandardMaterial color="#080614" />
        </mesh>
      ))}
      {/* WAN LEDs */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`w${i}`} position={[-(W * 0.36) + i * 0.026, -H * 0.28, fz]}>
          <boxGeometry args={[0.004, 0.004, 0.001]} />
          <meshStandardMaterial color="#9f7aea" emissive="#9f7aea" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* Center status display */}
      <mesh position={[-(W * 0.04), 0, fz]}>
        <boxGeometry args={[W * 0.12, H * 0.55, 0.001]} />
        <meshStandardMaterial color="#06040e" emissive="#200a40" emissiveIntensity={0.2} />
      </mesh>
      {/* LAN module bay (right, green tinted) */}
      <mesh position={[W * 0.22, 0, fz]}>
        <boxGeometry args={[W * 0.26, H * 0.65, 0.0008]} />
        <meshStandardMaterial color="#050d08" />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[W * 0.09 + i * 0.022, 0, fz]}>
          <boxGeometry args={[0.016, H * 0.5, 0.001]} />
          <meshStandardMaterial color="#030a05" />
        </mesh>
      ))}
      {/* LAN LEDs */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`l${i}`} position={[W * 0.09 + i * 0.022, -H * 0.28, fz]}>
          <boxGeometry args={[0.004, 0.004, 0.001]} />
          <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={1.2} />
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
    case 'storage':     return <StorageDetails W={W} H={H} D={D} heightU={heightU} bays={netPorts} />;
    case 'firewall':    return <FirewallDetails W={W} H={H} D={D} netPorts={netPorts} />;
    case 'router':      return <RouterDetails W={W} H={H} D={D} />;
    default:            return null;
  }
}

// ─── Main procedural component ────────────────────────────────────────────────

function ProceduralComponent({ component, rack, model }: Props & { model: any }) {
  const [hovered, setHovered] = useState(false);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useStore((s) => s.setSelectedComponentId);
  const mode = useStore((s) => s.mode);

  const dragComponentId = useStore((s) => s.dragComponentId);
  const setDragComponentId = useStore((s) => s.setDragComponentId);
  const isDragging = dragComponentId === component.id;
  const isSelected = selectedComponentId === component.id;
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const D = RACK_DEPTH - 0.06;
  const y = slotY(component.slot_position, rack.height_u, component.height_u);

  const type = model?.type ?? 'custom';
  const baseColor = component.color ?? TYPE_COLORS[type] ?? '#1e2535';
  const ledColor = TYPE_LED_COLORS[type] ?? '#63b3ed';

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'select') setSelectedComponentId(isSelected ? null : component.id);
    if (mode === 'delete') useStore.getState().setSelectedComponentId(component.id);
  };

  const handlePointerDown = (e: any) => {
    if (mode !== 'move') return;
    e.stopPropagation();
    setDragComponentId(component.id);
  };

  return (
    <group position={[0, y, 0]}>
      {/* Main chassis */}
      <mesh
        castShadow receiveShadow
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.65}
          roughness={0.35}
          emissive={isSelected ? '#3366cc' : isDragging ? '#cc8800' : hovered ? ledColor : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : isDragging ? 0.6 : hovered ? 0.12 : 0}
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

function GltfComponent({ component, rack, modelId }: Props & { modelId: number }) {
  const gltf = useLoader(GLTFLoader, `/rack3d/api/models/${modelId}/file`);
  const [hovered, setHovered] = useState(false);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useStore((s) => s.setSelectedComponentId);
  const mode = useStore((s) => s.mode);
  const { data: models } = useModels();
  const model = models?.find((m) => m.id === component.model_id);

  const dragComponentId = useStore((s) => s.dragComponentId);
  const setDragComponentId = useStore((s) => s.setDragComponentId);
  const isDragging = dragComponentId === component.id;
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const D = RACK_DEPTH - 0.06;
  const y = slotY(component.slot_position, rack.height_u, component.height_u);
  const isSelected = selectedComponentId === component.id;
  const type = model?.type ?? 'custom';
  const ledColor = TYPE_LED_COLORS[type] ?? '#63b3ed';

  const mountFace: 'front' | 'back' = (() => {
    try { return (JSON.parse(component.specs ?? '{}').face ?? 'front'); } catch { return 'front'; }
  })();

  const { clonedScene, scale, offset, rotY } = useMemo(() => {
    const clone = gltf.scene.clone();

    // Some GLB files have detail nodes (buttons, screws, caps) exported with scale [1,1,1]
    // on unit-cube geometry, producing ~1m³ bounding boxes that break the overall bbox.
    // Real rack equipment maxes out at 0.482m wide × 0.267m tall × 0.9m deep, so any
    // mesh with ALL three dimensions >= 0.99m must be a broken unit-cube node.
    const box = new THREE.Box3();
    const tmp = new THREE.Vector3();
    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const meshBox = new THREE.Box3().setFromObject(node);
      meshBox.getSize(tmp);
      if (tmp.x >= 0.99 && tmp.y >= 0.99 && tmp.z >= 0.99) {
        node.visible = false;
        return;
      }
      box.union(meshBox);
    });
    if (box.isEmpty()) box.setFromObject(clone);

    // Normalise: shift the clone so its front face (max Z) sits at Z=0 in model space.
    // This makes offset.z = targetZ regardless of GLB coordinate origin — all models
    // align to the same rack face without depending on how Blender exported the origin.
    clone.position.z = -box.max.z;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const sx = size.x > 0.0001 ? size.x : 1;
    const sy = size.y > 0.0001 ? size.y : 1;
    const s = Math.min(W / sx, H / sy);
    const targetZ = mountFace === 'back' ? D / 2 : -D / 2;

    // Front-mounted: rotate 180° so ports (originally at +Z) face outward toward viewer.
    // With front face normalised to Z=0, the 180° Y rotation leaves it at Z=0,
    // so offset.z = targetZ for both mount faces.
    const isFront = mountFace === 'front';
    return {
      clonedScene: clone,
      scale: s,
      offset: new THREE.Vector3(
        isFront ? center.x * s : -center.x * s,
        -center.y * s,
        targetZ,
      ),
      rotY: isFront ? Math.PI : 0,
    };
  }, [gltf.scene, W, H, D, mountFace]);

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'select') setSelectedComponentId(isSelected ? null : component.id);
    if (mode === 'delete') useStore.getState().setSelectedComponentId(component.id);
  };

  const handlePointerDown = (e: any) => {
    if (mode !== 'move') return;
    e.stopPropagation();
    setDragComponentId(component.id);
  };

  return (
    <group position={[0, y, 0]}>
      {/* Invisible hitbox — provides consistent click/hover surface */}
      <mesh
        visible={false}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial />
      </mesh>

      {/* GLTF model scaled and centered within the slot */}
      <group scale={scale} position={[offset.x, offset.y, offset.z]}>
        <group rotation={[0, rotY, 0]}>
          <primitive object={clonedScene} />
        </group>
      </group>

      {/* Hover highlight */}
      {hovered && !isSelected && (
        <mesh>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial color={ledColor} transparent opacity={0.08} />
        </mesh>
      )}

      {/* Orange glow when being dragged */}
      {isDragging && (
        <mesh>
          <boxGeometry args={[W, H, D]} />
          <meshStandardMaterial color="#cc8800" transparent opacity={0.18} />
        </mesh>
      )}

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

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ComponentMesh({ component, rack }: Props) {
  const { data: models } = useModels();
  const model = models?.find((m) => m.id === component.model_id);
  if (model?.file_path) {
    const procedural = <ProceduralComponent component={component} rack={rack} model={model} />;
    return (
      <GltfErrorBoundary fallback={procedural}>
        <Suspense fallback={procedural}>
          <GltfComponent component={component} rack={rack} modelId={model.id} />
        </Suspense>
      </GltfErrorBoundary>
    );
  }
  return <ProceduralComponent component={component} rack={rack} model={model} />;
}
