import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { getDb } from '../db/connection';

const router = Router();

// Determine upload directory
function getModelsDir(): string {
  if (process.env.DB_PATH) {
    return path.join(path.dirname(process.env.DB_PATH), 'models');
  }
  return path.join(process.cwd(), 'data', 'models');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getModelsDir();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.gltf' || ext === '.glb') {
      cb(null, true);
    } else {
      cb(new Error('Only .gltf and .glb files are allowed'));
    }
  },
});

// GET / — list all models
router.get('/', (_req: Request, res: Response) => {
  const models = getDb()
    .prepare('SELECT * FROM component_models ORDER BY is_builtin DESC, name ASC')
    .all();
  res.json(models);
});

// GET /:id/ports — list ports for a model
router.get('/:id/ports', (req: Request, res: Response) => {
  const model = getDb()
    .prepare('SELECT id FROM component_models WHERE id = ?')
    .get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Not found' });

  const ports = getDb()
    .prepare('SELECT * FROM ports WHERE model_id = ? ORDER BY port_index ASC')
    .all(req.params.id);
  res.json(ports);
});

// POST /upload — upload a custom GLTF/GLB model file
router.post('/upload', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, type, height_u, width, net_ports, power_ports } = req.body;

    if (!name || !type) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'name and type are required' });
    }

    const filePath = req.file.path;

    const result = getDb()
      .prepare(
        'INSERT INTO component_models (name, type, is_builtin, file_path, height_u, width, net_ports, power_ports) VALUES (?, ?, 0, ?, ?, ?, ?, ?)'
      )
      .run(
        name,
        type,
        filePath,
        height_u ? Number(height_u) : 1,
        width ?? '19"',
        net_ports ? Number(net_ports) : 0,
        power_ports ? Number(power_ports) : 0,
      );

    const model = getDb()
      .prepare('SELECT * FROM component_models WHERE id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json(model);
  });
});

// DELETE /:id — delete a custom model
router.delete('/:id', (req: Request, res: Response) => {
  const model = getDb()
    .prepare('SELECT * FROM component_models WHERE id = ?')
    .get(req.params.id) as { id: number; is_builtin: number; file_path: string | null } | undefined;

  if (!model) return res.status(404).json({ error: 'Not found' });
  if (model.is_builtin) return res.status(403).json({ error: 'Cannot delete built-in models' });

  // Clean up uploaded file if present
  if (model.file_path) {
    fs.unlink(model.file_path, () => {});
  }

  getDb().prepare('DELETE FROM component_models WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
