import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';
import type { Rack } from '../types';

const router = Router();

const RackSchema = z.object({
  name: z.string().min(1),
  width: z.enum(['10"', '19"']).default('19"'),
  height_u: z.number().int().min(1).max(48).default(12),
  color: z.string().default('#1c2230'),
});

router.get('/', (_req, res) => {
  const racks = getDb().prepare('SELECT * FROM racks ORDER BY created_at DESC').all();
  res.json(racks);
});

router.get('/:id', (req, res) => {
  const rack = getDb().prepare('SELECT * FROM racks WHERE id = ?').get(req.params.id);
  if (!rack) return res.status(404).json({ error: 'Not found' });
  res.json(rack);
});

router.post('/', (req, res) => {
  const parsed = RackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { name, width, height_u, color } = parsed.data;
  const result = getDb()
    .prepare('INSERT INTO racks (name, width, height_u, color) VALUES (?, ?, ?, ?)')
    .run(name, width, height_u, color);
  const rack = getDb().prepare('SELECT * FROM racks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(rack);
});

router.put('/:id', (req, res) => {
  const existing = getDb().prepare('SELECT * FROM racks WHERE id = ?').get(req.params.id) as Rack | undefined;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const parsed = RackSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const data = { ...existing, ...parsed.data };
  getDb()
    .prepare('UPDATE racks SET name=?, width=?, height_u=?, color=? WHERE id=?')
    .run(data.name, data.width, data.height_u, data.color, req.params.id);
  const rack = getDb().prepare('SELECT * FROM racks WHERE id = ?').get(req.params.id);
  res.json(rack);
});

router.delete('/:id', (req, res) => {
  const result = getDb().prepare('DELETE FROM racks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

export default router;
