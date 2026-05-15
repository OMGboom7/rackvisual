import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

const router = Router({ mergeParams: true });

const CableSchema = z.object({
  from_comp_id: z.number().int(),
  to_comp_id: z.number().int(),
  from_port_id: z.number().int(),
  to_port_id: z.number().int(),
  type: z.enum(['power', 'net']),
  color: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
});

// GET /:rackId/cables
router.get('/:rackId/cables', (req, res) => {
  const cables = getDb()
    .prepare('SELECT * FROM cables WHERE rack_id = ?')
    .all(req.params.rackId);
  res.json(cables);
});

// POST /:rackId/cables
router.post('/:rackId/cables', (req, res) => {
  const parsed = CableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const d = parsed.data;

  // Port-in-use check
  const occupied = getDb()
    .prepare(
      'SELECT id FROM cables WHERE rack_id = ? AND (from_port_id = ? OR to_port_id = ? OR from_port_id = ? OR to_port_id = ?)',
    )
    .get(req.params.rackId, d.from_port_id, d.from_port_id, d.to_port_id, d.to_port_id);
  if (occupied) return res.status(409).json({ error: 'Port already in use' });

  const result = getDb()
    .prepare(
      `INSERT INTO cables (rack_id, from_comp_id, to_comp_id, from_port_id, to_port_id, type, color, label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      req.params.rackId,
      d.from_comp_id,
      d.to_comp_id,
      d.from_port_id,
      d.to_port_id,
      d.type,
      d.color ?? null,
      d.label ?? null,
    );

  const cable = getDb()
    .prepare('SELECT * FROM cables WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(cable);
});

// DELETE /:rackId/cables/:cabId
router.delete('/:rackId/cables/:cabId', (req, res) => {
  getDb()
    .prepare('DELETE FROM cables WHERE id = ? AND rack_id = ?')
    .run(req.params.cabId, req.params.rackId);
  res.status(204).send();
});

export default router;
