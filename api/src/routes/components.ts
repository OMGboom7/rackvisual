import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

const router = Router({ mergeParams: true });

const ComponentSchema = z.object({
  model_id: z.number().int(),
  slot_position: z.number().int().min(1),
  height_u: z.number().int().min(1).optional(),
  name: z.string().min(1),
  os: z.string().optional().nullable(),
  specs: z.string().optional().nullable(),
  ip: z.string().optional().nullable(),
  vlan_id: z.number().int().optional().nullable(),
  circuit_id: z.number().int().optional().nullable(),
  color: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  services: z
    .object({
      vms: z.array(z.string()).default([]),
      containers: z.array(z.string()).default([]),
    })
    .default({ vms: [], containers: [] }),
  hardware: z
    .object({
      cpu: z.string().optional().nullable(),
      ram: z.string().optional().nullable(),
      gpu: z.string().optional().nullable(),
      storage: z.array(z.object({ label: z.string(), size: z.string() })).default([]),
    })
    .optional()
    .nullable(),
});

function parseComponent(c: any) {
  return {
    ...c,
    tags: typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags,
    services: typeof c.services === 'string' ? JSON.parse(c.services) : c.services,
    hardware: typeof c.hardware === 'string' ? JSON.parse(c.hardware) : (c.hardware ?? null),
  };
}

// GET /:rackId/components
router.get('/:rackId/components', (req, res) => {
  const components = (
    getDb()
      .prepare('SELECT * FROM components WHERE rack_id = ? ORDER BY slot_position ASC')
      .all(req.params.rackId) as any[]
  ).map(parseComponent);
  res.json(components);
});

// POST /:rackId/components
router.post('/:rackId/components', (req, res) => {
  const parsed = ComponentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const d = parsed.data;

  const model = getDb()
    .prepare('SELECT * FROM component_models WHERE id = ?')
    .get(d.model_id) as any;
  if (!model) return res.status(404).json({ error: 'Model not found' });

  // Slot collision check
  const occupiedSlots = (
    getDb()
      .prepare('SELECT slot_position, height_u FROM components WHERE rack_id = ? AND id != ?')
      .all(req.params.rackId, 0) as any[]
  ).flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i));

  const newSlots = Array.from(
    { length: d.height_u ?? model.height_u },
    (_, i) => d.slot_position + i,
  );
  if (newSlots.some((s) => occupiedSlots.includes(s))) {
    return res.status(409).json({ error: 'Slot collision' });
  }

  const result = getDb()
    .prepare(
      `INSERT INTO components
        (rack_id, model_id, slot_position, height_u, name, os, specs, ip, vlan_id, circuit_id, color, tags, services, hardware)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      req.params.rackId,
      d.model_id,
      d.slot_position,
      d.height_u ?? model.height_u,
      d.name,
      d.os ?? null,
      d.specs ?? null,
      d.ip ?? null,
      d.vlan_id ?? null,
      d.circuit_id ?? null,
      d.color ?? null,
      JSON.stringify(d.tags),
      JSON.stringify(d.services),
      d.hardware ? JSON.stringify(d.hardware) : null,
    );

  const component = getDb()
    .prepare('SELECT * FROM components WHERE id = ?')
    .get(result.lastInsertRowid) as any;
  res.status(201).json(parseComponent(component));
});

// PUT /:rackId/components/:cid
router.put('/:rackId/components/:cid', (req, res) => {
  const existing = getDb()
    .prepare('SELECT * FROM components WHERE id = ? AND rack_id = ?')
    .get(req.params.cid, req.params.rackId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const parsed = ComponentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const d = parsed.data;

  // Slot move: check collision if slot_position is changing
  const newSlot = d.slot_position ?? existing.slot_position;
  const newHeightU = d.height_u ?? existing.height_u;
  if (newSlot !== existing.slot_position) {
    const occupiedSlots = (
      getDb()
        .prepare('SELECT slot_position, height_u FROM components WHERE rack_id = ? AND id != ?')
        .all(req.params.rackId, req.params.cid) as any[]
    ).flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i));
    const newSlots = Array.from({ length: newHeightU }, (_, i) => newSlot + i);
    if (newSlots.some((s) => occupiedSlots.includes(s))) {
      return res.status(409).json({ error: 'Slot collision' });
    }
  }

  const name = d.name ?? existing.name;
  const os = 'os' in d ? (d.os ?? null) : existing.os;
  const specs = 'specs' in d ? (d.specs ?? null) : existing.specs;
  const ip = 'ip' in d ? (d.ip ?? null) : existing.ip;
  const vlan_id = 'vlan_id' in d ? (d.vlan_id ?? null) : existing.vlan_id;
  const circuit_id = 'circuit_id' in d ? (d.circuit_id ?? null) : existing.circuit_id;
  const color = 'color' in d ? (d.color ?? null) : existing.color;
  const tags =
    d.tags !== undefined
      ? JSON.stringify(d.tags)
      : typeof existing.tags === 'string'
        ? existing.tags
        : JSON.stringify(existing.tags);
  const services =
    d.services !== undefined
      ? JSON.stringify(d.services)
      : typeof existing.services === 'string'
        ? existing.services
        : JSON.stringify(existing.services);
  const hardware =
    'hardware' in d
      ? (d.hardware ? JSON.stringify(d.hardware) : null)
      : typeof existing.hardware === 'string'
        ? existing.hardware
        : existing.hardware ? JSON.stringify(existing.hardware) : null;

  getDb()
    .prepare(
      `UPDATE components SET slot_position=?, name=?, os=?, specs=?, ip=?, vlan_id=?, circuit_id=?, color=?, tags=?, services=?, hardware=?
       WHERE id=? AND rack_id=?`,
    )
    .run(newSlot, name, os, specs, ip, vlan_id, circuit_id, color, tags, services, hardware, req.params.cid, req.params.rackId);

  const updated = getDb()
    .prepare('SELECT * FROM components WHERE id = ?')
    .get(req.params.cid) as any;
  res.json(parseComponent(updated));
});

// DELETE /:rackId/components/:cid
router.delete('/:rackId/components/:cid', (req, res) => {
  getDb()
    .prepare('DELETE FROM components WHERE id = ? AND rack_id = ?')
    .run(req.params.cid, req.params.rackId);
  res.status(204).send();
});

export default router;
