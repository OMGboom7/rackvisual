import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { migrate } from './db/migrate';
import { seed } from './seed';
import racksRouter from './routes/racks';
import componentsRouter from './routes/components';
import cablesRouter from './routes/cables';
import vlansRouter from './routes/vlans';
import circuitsRouter from './routes/circuits';
import modelsRouter from './routes/models';

const dataDir = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(path.join(dataDir, 'models'))) {
  fs.mkdirSync(path.join(dataDir, 'models'), { recursive: true });
}

migrate();
seed();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/racks', racksRouter);
app.use('/api/racks', componentsRouter);
app.use('/api/racks', cablesRouter);
app.use('/api/racks', vlansRouter);
app.use('/api/racks', circuitsRouter);
app.use('/api/models', modelsRouter);

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`API running on :${PORT}`));

export { app };
