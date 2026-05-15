import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

const router = Router({ mergeParams: true });

const VlanSchema = z.object({
  vlan_id: z.number().int(),
  name: z.string(),
  color: z.string(),
});

// GET /:rackId/vlans
router.get('/:rackId/vlans', (req, res) => {
  const vlans = getDb()
    .prepare('SELECT * FROM vlans WHERE rack_id = ? ORDER BY vlan_id ASC')
    .all(req.params.rackId);
  res.json(vlans);
});

// POST /:rackId/vlans
router.post('/:rackId/vlans', (req, res) => {
  const parsed = VlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { vlan_id, name, color } = parsed.data;

  const result = getDb()
    .prepare('INSERT INTO vlans (rack_id, vlan_id, name, color) VALUES (?, ?, ?, ?)')
    .run(req.params.rackId, vlan_id, name, color);

  const vlan = getDb()
    .prepare('SELECT * FROM vlans WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(vlan);
});

// DELETE /:rackId/vlans/:vid
router.delete('/:rackId/vlans/:vid', (req, res) => {
  getDb()
    .prepare('DELETE FROM vlans WHERE id = ? AND rack_id = ?')
    .run(req.params.vid, req.params.rackId);
  res.status(204).send();
});

export default router;
