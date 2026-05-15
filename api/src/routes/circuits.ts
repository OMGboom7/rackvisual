import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

const router = Router({ mergeParams: true });

const CircuitSchema = z.object({
  name: z.string(),
  color: z.string(),
  ampere: z.number().optional().nullable(),
});

// GET /:rackId/circuits
router.get('/:rackId/circuits', (req, res) => {
  const circuits = getDb()
    .prepare('SELECT * FROM circuits WHERE rack_id = ? ORDER BY id ASC')
    .all(req.params.rackId);
  res.json(circuits);
});

// POST /:rackId/circuits
router.post('/:rackId/circuits', (req, res) => {
  const parsed = CircuitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { name, color, ampere } = parsed.data;

  const result = getDb()
    .prepare('INSERT INTO circuits (rack_id, name, color, ampere) VALUES (?, ?, ?, ?)')
    .run(req.params.rackId, name, color, ampere ?? null);

  const circuit = getDb()
    .prepare('SELECT * FROM circuits WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(circuit);
});

// DELETE /:rackId/circuits/:cid
router.delete('/:rackId/circuits/:cid', (req, res) => {
  getDb()
    .prepare('DELETE FROM circuits WHERE id = ? AND rack_id = ?')
    .run(req.params.cid, req.params.rackId);
  res.status(204).send();
});

export default router;
