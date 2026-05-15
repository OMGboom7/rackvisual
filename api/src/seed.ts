import { getDb } from './db/connection';

const BUILT_IN_MODELS = [
  {
    name: '1U Server', type: 'server', height_u: 1, width: '19"', net_ports: 2, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net', label: 'NIC0', face: 'back', position_x: 0.1, position_y: 0.5 },
      { port_index: 1, port_type: 'net', label: 'NIC1', face: 'back', position_x: 0.2, position_y: 0.5 },
      { port_index: 2, port_type: 'power', label: 'PSU0', face: 'back', position_x: 0.85, position_y: 0.5 },
      { port_index: 3, port_type: 'power', label: 'PSU1', face: 'back', position_x: 0.92, position_y: 0.5 },
    ],
  },
  {
    name: '2U Server', type: 'server', height_u: 2, width: '19"', net_ports: 4, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net', label: 'NIC0', face: 'back', position_x: 0.1, position_y: 0.4 },
      { port_index: 1, port_type: 'net', label: 'NIC1', face: 'back', position_x: 0.2, position_y: 0.4 },
      { port_index: 2, port_type: 'net', label: 'NIC2', face: 'back', position_x: 0.1, position_y: 0.6 },
      { port_index: 3, port_type: 'net', label: 'NIC3', face: 'back', position_x: 0.2, position_y: 0.6 },
      { port_index: 4, port_type: 'power', label: 'PSU0', face: 'back', position_x: 0.85, position_y: 0.5 },
      { port_index: 5, port_type: 'power', label: 'PSU1', face: 'back', position_x: 0.92, position_y: 0.5 },
    ],
  },
  {
    name: 'Switch 24p', type: 'switch', height_u: 1, width: '19"', net_ports: 24, power_ports: 1,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `eth${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
      { port_index: 24, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  {
    name: 'Switch 48p', type: 'switch', height_u: 1, width: '19"', net_ports: 48, power_ports: 1,
    ports: [
      ...Array.from({ length: 48 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `eth${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 48, position_y: 0.5,
      })),
      { port_index: 48, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  {
    name: 'Patch Panel 24p', type: 'patch_panel', height_u: 1, width: '19"', net_ports: 24, power_ports: 0,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `P${i + 1}`, face: 'front' as const,
        position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: 24 + i, port_type: 'net' as const, label: `P${i + 1}-back`, face: 'back' as const,
        position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
    ],
  },
  {
    name: 'UPS 2U', type: 'ups', height_u: 2, width: '19"', net_ports: 1, power_ports: 8,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.1, position_y: 0.5 },
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i + 1, port_type: 'power' as const, label: `OUT${i + 1}`, face: 'back' as const,
        position_x: (i + 0.5) / 8, position_y: 0.7,
      })),
    ],
  },
  {
    name: 'PDU 1U', type: 'pdu', height_u: 1, width: '19"', net_ports: 0, power_ports: 8,
    ports: Array.from({ length: 8 }, (_, i) => ({
      port_index: i, port_type: 'power' as const, label: `C13-${i + 1}`, face: 'back' as const,
      position_x: (i + 0.5) / 8, position_y: 0.5,
    })),
  },
  {
    name: 'Blank Panel 1U', type: 'blank', height_u: 1, width: '19"', net_ports: 0, power_ports: 0,
    ports: [],
  },
  {
    name: 'KVM 1U', type: 'kvm', height_u: 1, width: '19"', net_ports: 1, power_ports: 1,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'NET', face: 'back' as const, position_x: 0.1, position_y: 0.5 },
      { port_index: 1, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.9, position_y: 0.5 },
    ],
  },
];

export function seed() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM component_models WHERE is_builtin = 1').get() as { count: number };
  if (existing.count > 0) return;

  const insertModel = db.prepare(
    'INSERT INTO component_models (name, type, is_builtin, height_u, width, net_ports, power_ports) VALUES (?, ?, 1, ?, ?, ?, ?)'
  );
  const insertPort = db.prepare(
    'INSERT INTO ports (model_id, port_index, port_type, label, face, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    for (const model of BUILT_IN_MODELS) {
      const result = insertModel.run(
        model.name,
        model.type,
        model.height_u,
        model.width,
        model.net_ports,
        model.power_ports,
      );
      const modelId = result.lastInsertRowid;
      for (const port of model.ports) {
        insertPort.run(
          modelId,
          port.port_index,
          port.port_type,
          port.label,
          port.face,
          port.position_x,
          port.position_y,
        );
      }
    }
  });

  transaction();
}
