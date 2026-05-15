# RackVisual MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3D rack visualization web app in Docker Compose — React Three Fiber frontend + Express/SQLite backend. User can create racks, place components, configure them, and wire them together visually.

**Architecture:** Two Docker services: `web` (Vite + React + R3F, port 5173) and `api` (Express + SQLite, port 3001). Data persists in `./data/` volume. Frontend fetches from API via React Query.

**Tech Stack:** React 18, Vite, TypeScript, React Three Fiber, @react-three/drei, Three.js, Zustand, React Query, TailwindCSS · Express, TypeScript, better-sqlite3, Zod, Multer · Docker Compose

---

## File Map

```
rackvisual/
├── docker-compose.yml
├── docker-compose.prod.yml
├── data/                         # gitignored, volume-mounted
│   ├── rackvisual.db
│   └── models/
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Express app + server start
│       ├── db/
│       │   ├── connection.ts     # SQLite singleton
│       │   └── migrate.ts        # run-once schema migrations
│       ├── routes/
│       │   ├── racks.ts
│       │   ├── components.ts
│       │   ├── cables.ts
│       │   ├── vlans.ts
│       │   ├── circuits.ts
│       │   └── models.ts         # component model library + upload
│       ├── seed.ts               # built-in component models
│       └── types.ts
└── frontend/
    ├── Dockerfile
    ├── Dockerfile.prod
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/index.ts
        ├── api/client.ts         # React Query hooks
        ├── store/useStore.ts     # Zustand (selected rack, mode, selected component)
        ├── components/
        │   ├── ui/
        │   │   ├── RackSwitcher.tsx
        │   │   ├── LibraryPanel.tsx
        │   │   ├── DetailPanel.tsx
        │   │   ├── ModeToolbar.tsx
        │   │   └── CablePanel.tsx
        │   └── three/
        │       ├── Scene.tsx         # R3F Canvas wrapper
        │       ├── RackChassis.tsx   # detailed procedural rack model
        │       ├── ComponentMesh.tsx # procedural or GLTF component
        │       ├── PortMarker.tsx    # clickable port sphere
        │       └── CableSystem.tsx  # Bezier cables
        └── lib/
            └── rack-geometry.ts    # procedural rack/component geometry helpers
```

---

### Task 1: Project Scaffold + Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `api/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/Dockerfile.prod`
- Create: `.gitignore`

- [ ] **Create `docker-compose.yml`**

```yaml
services:
  api:
    build: ./api
    ports:
      - "3001:3001"
    volumes:
      - ./api/src:/app/src
      - ./data:/app/data
    environment:
      NODE_ENV: development
      PORT: 3001
      DB_PATH: /app/data/rackvisual.db
    command: npm run dev

  web:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    environment:
      VITE_API_URL: http://localhost:3001
    depends_on:
      - api
```

- [ ] **Create `docker-compose.prod.yml`**

```yaml
services:
  api:
    build: ./api
    expose:
      - "3001"
    volumes:
      - ./data:/app/data
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_PATH: /app/data/rackvisual.db
    command: node dist/index.js

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    depends_on:
      - api
```

- [ ] **Create `api/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
```

- [ ] **Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Create `frontend/Dockerfile.prod`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Create `frontend/nginx.conf`**

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location /api/ {
    proxy_pass http://api:3001/api/;
  }
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Create `.gitignore`**

```
node_modules/
dist/
data/
.env
.superpowers/
```

- [ ] **Commit**

```bash
git add .
git commit -m "feat: project scaffold and Docker Compose setup"
```

---

### Task 2: API Foundation — Express + SQLite + Migrations

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/src/index.ts`
- Create: `api/src/db/connection.ts`
- Create: `api/src/db/migrate.ts`
- Create: `api/src/types.ts`

- [ ] **Create `api/package.json`**

```json
{
  "name": "rackvisual-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.10",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.12.12",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "tsx": "^4.10.5",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Create `api/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Create `api/src/types.ts`**

```typescript
export interface Rack {
  id: number;
  name: string;
  width: '10"' | '19"';
  height_u: number;
  color: string;
  created_at: string;
}

export interface ComponentModel {
  id: number;
  name: string;
  type: 'server' | 'switch' | 'patch_panel' | 'ups' | 'pdu' | 'blank' | 'kvm' | 'custom';
  is_builtin: 1 | 0;
  file_path: string | null;
  thumbnail_path: string | null;
  height_u: number;
  width: '10"' | '19"';
  net_ports: number;
  power_ports: number;
}

export interface Port {
  id: number;
  model_id: number;
  port_index: number;
  port_type: 'net' | 'power';
  label: string;
  face: 'front' | 'back';
  position_x: number;
  position_y: number;
}

export interface Component {
  id: number;
  rack_id: number;
  model_id: number;
  slot_position: number;
  height_u: number;
  name: string;
  os: string | null;
  specs: string | null;
  ip: string | null;
  vlan_id: number | null;
  circuit_id: number | null;
  color: string | null;
  tags: string;
  services: string;
}

export interface Cable {
  id: number;
  rack_id: number;
  from_comp_id: number;
  to_comp_id: number;
  from_port_id: number;
  to_port_id: number;
  type: 'power' | 'net';
  color: string | null;
  label: string | null;
}

export interface Vlan {
  id: number;
  rack_id: number;
  vlan_id: number;
  name: string;
  color: string;
}

export interface Circuit {
  id: number;
  rack_id: number;
  name: string;
  color: string;
  ampere: number | null;
}
```

- [ ] **Create `api/src/db/connection.ts`**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'rackvisual.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}
```

- [ ] **Create `api/src/db/migrate.ts`**

```typescript
import { getDb } from './connection';

export function migrate() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS racks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      width TEXT NOT NULL DEFAULT '19"',
      height_u INTEGER NOT NULL DEFAULT 12,
      color TEXT NOT NULL DEFAULT '#1c2230',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS component_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      file_path TEXT,
      thumbnail_path TEXT,
      height_u INTEGER NOT NULL DEFAULT 1,
      width TEXT NOT NULL DEFAULT '19"',
      net_ports INTEGER NOT NULL DEFAULT 0,
      power_ports INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_id INTEGER NOT NULL REFERENCES component_models(id) ON DELETE CASCADE,
      port_index INTEGER NOT NULL,
      port_type TEXT NOT NULL,
      label TEXT NOT NULL,
      face TEXT NOT NULL DEFAULT 'back',
      position_x REAL NOT NULL DEFAULT 0.5,
      position_y REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS components (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
      model_id INTEGER NOT NULL REFERENCES component_models(id),
      slot_position INTEGER NOT NULL,
      height_u INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      os TEXT,
      specs TEXT,
      ip TEXT,
      vlan_id INTEGER REFERENCES vlans(id) ON DELETE SET NULL,
      circuit_id INTEGER REFERENCES circuits(id) ON DELETE SET NULL,
      color TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      services TEXT NOT NULL DEFAULT '{"vms":[],"containers":[]}'
    );

    CREATE TABLE IF NOT EXISTS vlans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
      vlan_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#63b3ed'
    );

    CREATE TABLE IF NOT EXISTS circuits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#fc8181',
      ampere REAL
    );

    CREATE TABLE IF NOT EXISTS cables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
      from_comp_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
      to_comp_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
      from_port_id INTEGER NOT NULL REFERENCES ports(id),
      to_port_id INTEGER NOT NULL REFERENCES ports(id),
      type TEXT NOT NULL,
      color TEXT,
      label TEXT
    );
  `);
}
```

- [ ] **Create `api/src/index.ts`**

```typescript
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
```

- [ ] **Write test for health endpoint**

Create `api/src/__tests__/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
```

- [ ] **Run test** `cd api && npm run test` — expect PASS

- [ ] **Commit**

```bash
git add api/
git commit -m "feat: API foundation with Express, SQLite migrations, health check"
```

---

### Task 3: Rack CRUD API

**Files:**
- Create: `api/src/routes/racks.ts`
- Create: `api/src/__tests__/racks.test.ts`

- [ ] **Write failing tests first**

Create `api/src/__tests__/racks.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { getDb } from '../db/connection';

beforeEach(() => {
  getDb().exec('DELETE FROM racks');
});

describe('Racks API', () => {
  it('GET /api/racks returns empty array initially', async () => {
    const res = await request(app).get('/api/racks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/racks creates a rack', async () => {
    const res = await request(app).post('/api/racks').send({
      name: 'Keller-Rack',
      width: '19"',
      height_u: 12,
      color: '#1c2230',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Keller-Rack');
    expect(res.body.id).toBeDefined();
  });

  it('PUT /api/racks/:id updates a rack', async () => {
    const create = await request(app).post('/api/racks').send({
      name: 'Test', width: '19"', height_u: 6, color: '#000',
    });
    const id = create.body.id;
    const res = await request(app).put(`/api/racks/${id}`).send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('DELETE /api/racks/:id removes a rack', async () => {
    const create = await request(app).post('/api/racks').send({
      name: 'Del', width: '19"', height_u: 6, color: '#000',
    });
    const id = create.body.id;
    await request(app).delete(`/api/racks/${id}`);
    const res = await request(app).get('/api/racks');
    expect(res.body).toHaveLength(0);
  });
});
```

- [ ] **Run test to see it fail** `cd api && npm run test` — expect FAIL (route not found)

- [ ] **Create `api/src/routes/racks.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

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
  const existing = getDb().prepare('SELECT * FROM racks WHERE id = ?').get(req.params.id) as any;
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
  getDb().prepare('DELETE FROM racks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
```

- [ ] **Run tests** `cd api && npm run test` — expect all PASS

- [ ] **Commit**

```bash
git add api/src/routes/racks.ts api/src/__tests__/racks.test.ts
git commit -m "feat: racks CRUD API with tests"
```

---

### Task 4: Component Models API + Seed Built-in Models

**Files:**
- Create: `api/src/seed.ts`
- Create: `api/src/routes/models.ts`

- [ ] **Create `api/src/seed.ts`** (runs once on startup, skips if already seeded)

```typescript
import { getDb } from './db/connection';

const BUILT_IN_MODELS = [
  {
    name: '1U Server',
    type: 'server',
    height_u: 1,
    width: '19"',
    net_ports: 2,
    power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net', label: 'NIC0', face: 'back', position_x: 0.1, position_y: 0.5 },
      { port_index: 1, port_type: 'net', label: 'NIC1', face: 'back', position_x: 0.2, position_y: 0.5 },
      { port_index: 2, port_type: 'power', label: 'PSU0', face: 'back', position_x: 0.85, position_y: 0.5 },
      { port_index: 3, port_type: 'power', label: 'PSU1', face: 'back', position_x: 0.92, position_y: 0.5 },
    ],
  },
  {
    name: '2U Server',
    type: 'server',
    height_u: 2,
    width: '19"',
    net_ports: 4,
    power_ports: 2,
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
    name: 'Switch 24p',
    type: 'switch',
    height_u: 1,
    width: '19"',
    net_ports: 24,
    power_ports: 1,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i,
        port_type: 'net' as const,
        label: `eth${i}`,
        face: 'front' as const,
        position_x: (i + 0.5) / 24,
        position_y: 0.5,
      })),
      { port_index: 24, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  {
    name: 'Switch 48p',
    type: 'switch',
    height_u: 1,
    width: '19"',
    net_ports: 48,
    power_ports: 1,
    ports: [
      ...Array.from({ length: 48 }, (_, i) => ({
        port_index: i,
        port_type: 'net' as const,
        label: `eth${i}`,
        face: 'front' as const,
        position_x: (i + 0.5) / 48,
        position_y: 0.5,
      })),
      { port_index: 48, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  {
    name: 'Patch Panel 24p',
    type: 'patch_panel',
    height_u: 1,
    width: '19"',
    net_ports: 24,
    power_ports: 0,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i,
        port_type: 'net' as const,
        label: `P${i + 1}`,
        face: 'front' as const,
        position_x: (i + 0.5) / 24,
        position_y: 0.5,
      })),
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: 24 + i,
        port_type: 'net' as const,
        label: `P${i + 1}-back`,
        face: 'back' as const,
        position_x: (i + 0.5) / 24,
        position_y: 0.5,
      })),
    ],
  },
  {
    name: 'UPS 2U',
    type: 'ups',
    height_u: 2,
    width: '19"',
    net_ports: 1,
    power_ports: 8,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.1, position_y: 0.5 },
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i + 1,
        port_type: 'power' as const,
        label: `OUT${i + 1}`,
        face: 'back' as const,
        position_x: (i + 0.5) / 8,
        position_y: 0.7,
      })),
    ],
  },
  {
    name: 'PDU 1U',
    type: 'pdu',
    height_u: 1,
    width: '19"',
    net_ports: 0,
    power_ports: 8,
    ports: Array.from({ length: 8 }, (_, i) => ({
      port_index: i,
      port_type: 'power' as const,
      label: `C13-${i + 1}`,
      face: 'back' as const,
      position_x: (i + 0.5) / 8,
      position_y: 0.5,
    })),
  },
  {
    name: 'Blank Panel 1U',
    type: 'blank',
    height_u: 1,
    width: '19"',
    net_ports: 0,
    power_ports: 0,
    ports: [],
  },
  {
    name: 'KVM 1U',
    type: 'kvm',
    height_u: 1,
    width: '19"',
    net_ports: 1,
    power_ports: 1,
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

  const seedAll = db.transaction(() => {
    for (const model of BUILT_IN_MODELS) {
      const { lastInsertRowid } = insertModel.run(
        model.name, model.type, model.height_u, model.width, model.net_ports, model.power_ports
      );
      for (const port of model.ports) {
        insertPort.run(lastInsertRowid, port.port_index, port.port_type, port.label, port.face, port.position_x, port.position_y);
      }
    }
  });

  seedAll();
}
```

- [ ] **Create `api/src/routes/models.ts`**

```typescript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getDb } from '../db/connection';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = process.env.DB_PATH
      ? path.join(path.dirname(process.env.DB_PATH), 'models')
      : path.join(process.cwd(), 'data', 'models');
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.gltf', '.glb'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.get('/', (_req, res) => {
  const models = getDb().prepare('SELECT * FROM component_models ORDER BY is_builtin DESC, name').all();
  res.json(models);
});

router.get('/:id/ports', (req, res) => {
  const ports = getDb().prepare('SELECT * FROM ports WHERE model_id = ? ORDER BY port_index').all(req.params.id);
  res.json(ports);
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const { name, type = 'custom', height_u = 1, width = '19"', net_ports = 0, power_ports = 0 } = req.body;
  const result = getDb()
    .prepare('INSERT INTO component_models (name, type, is_builtin, file_path, height_u, width, net_ports, power_ports) VALUES (?, ?, 0, ?, ?, ?, ?, ?)')
    .run(name ?? req.file.originalname, type, req.file.filename, Number(height_u), width, Number(net_ports), Number(power_ports));
  const model = getDb().prepare('SELECT * FROM component_models WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(model);
});

router.delete('/:id', (req, res) => {
  const model = getDb().prepare('SELECT * FROM component_models WHERE id = ?').get(req.params.id) as any;
  if (!model) return res.status(404).json({ error: 'Not found' });
  if (model.is_builtin) return res.status(403).json({ error: 'Cannot delete built-in model' });
  getDb().prepare('DELETE FROM component_models WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
```

- [ ] **Commit**

```bash
git add api/src/seed.ts api/src/routes/models.ts
git commit -m "feat: component model library with 9 built-in models and GLTF upload"
```

---

### Task 5: Components + Cables + VLANs + Circuits API

**Files:**
- Create: `api/src/routes/components.ts`
- Create: `api/src/routes/cables.ts`
- Create: `api/src/routes/vlans.ts`
- Create: `api/src/routes/circuits.ts`

- [ ] **Create `api/src/routes/components.ts`**

```typescript
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
  services: z.object({ vms: z.array(z.string()).default([]), containers: z.array(z.string()).default([]) }).default({ vms: [], containers: [] }),
});

router.get('/:rackId/components', (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM components WHERE rack_id = ? ORDER BY slot_position')
    .all(req.params.rackId);
  res.json(rows.map((r: any) => ({ ...r, tags: JSON.parse(r.tags), services: JSON.parse(r.services) })));
});

router.post('/:rackId/components', (req, res) => {
  const parsed = ComponentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const d = parsed.data;
  const model = getDb().prepare('SELECT * FROM component_models WHERE id = ?').get(d.model_id) as any;
  if (!model) return res.status(400).json({ error: 'Model not found' });

  // Check slot collision
  const occupiedSlots = (getDb().prepare('SELECT slot_position, height_u FROM components WHERE rack_id = ?').all(req.params.rackId) as any[])
    .flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i));
  const newSlots = Array.from({ length: d.height_u ?? model.height_u }, (_, i) => d.slot_position + i);
  if (newSlots.some((s) => occupiedSlots.includes(s))) {
    return res.status(409).json({ error: 'Slot collision' });
  }

  const result = getDb().prepare(
    'INSERT INTO components (rack_id, model_id, slot_position, height_u, name, os, specs, ip, vlan_id, circuit_id, color, tags, services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.params.rackId, d.model_id, d.slot_position, d.height_u ?? model.height_u,
    d.name, d.os ?? null, d.specs ?? null, d.ip ?? null,
    d.vlan_id ?? null, d.circuit_id ?? null, d.color ?? null,
    JSON.stringify(d.tags), JSON.stringify(d.services)
  );
  const comp = getDb().prepare('SELECT * FROM components WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json({ ...comp, tags: JSON.parse(comp.tags), services: JSON.parse(comp.services) });
});

router.put('/:rackId/components/:cid', (req, res) => {
  const parsed = ComponentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const existing = getDb().prepare('SELECT * FROM components WHERE id = ? AND rack_id = ?').get(req.params.cid, req.params.rackId) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const d = parsed.data;
  getDb().prepare(
    'UPDATE components SET name=?, os=?, specs=?, ip=?, vlan_id=?, circuit_id=?, color=?, tags=?, services=? WHERE id=?'
  ).run(
    d.name ?? existing.name, d.os ?? existing.os, d.specs ?? existing.specs,
    d.ip ?? existing.ip, d.vlan_id ?? existing.vlan_id, d.circuit_id ?? existing.circuit_id,
    d.color ?? existing.color,
    d.tags ? JSON.stringify(d.tags) : existing.tags,
    d.services ? JSON.stringify(d.services) : existing.services,
    req.params.cid
  );
  const comp = getDb().prepare('SELECT * FROM components WHERE id = ?').get(req.params.cid) as any;
  res.json({ ...comp, tags: JSON.parse(comp.tags), services: JSON.parse(comp.services) });
});

router.delete('/:rackId/components/:cid', (req, res) => {
  getDb().prepare('DELETE FROM components WHERE id = ? AND rack_id = ?').run(req.params.cid, req.params.rackId);
  res.status(204).send();
});

export default router;
```

- [ ] **Create `api/src/routes/cables.ts`**

```typescript
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

router.get('/:rackId/cables', (req, res) => {
  const cables = getDb().prepare('SELECT * FROM cables WHERE rack_id = ?').all(req.params.rackId);
  res.json(cables);
});

router.post('/:rackId/cables', (req, res) => {
  const parsed = CableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const d = parsed.data;
  // Check port not already occupied
  const occupied = getDb().prepare(
    'SELECT id FROM cables WHERE rack_id = ? AND (from_port_id = ? OR to_port_id = ? OR from_port_id = ? OR to_port_id = ?)'
  ).get(req.params.rackId, d.from_port_id, d.from_port_id, d.to_port_id, d.to_port_id);
  if (occupied) return res.status(409).json({ error: 'Port already in use' });
  const result = getDb().prepare(
    'INSERT INTO cables (rack_id, from_comp_id, to_comp_id, from_port_id, to_port_id, type, color, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.rackId, d.from_comp_id, d.to_comp_id, d.from_port_id, d.to_port_id, d.type, d.color ?? null, d.label ?? null);
  const cable = getDb().prepare('SELECT * FROM cables WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cable);
});

router.delete('/:rackId/cables/:cabId', (req, res) => {
  getDb().prepare('DELETE FROM cables WHERE id = ? AND rack_id = ?').run(req.params.cabId, req.params.rackId);
  res.status(204).send();
});

export default router;
```

- [ ] **Create `api/src/routes/vlans.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

const router = Router({ mergeParams: true });
const VlanSchema = z.object({ vlan_id: z.number().int(), name: z.string(), color: z.string() });

router.get('/:rackId/vlans', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM vlans WHERE rack_id = ?').all(req.params.rackId));
});
router.post('/:rackId/vlans', (req, res) => {
  const parsed = VlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { vlan_id, name, color } = parsed.data;
  const r = getDb().prepare('INSERT INTO vlans (rack_id, vlan_id, name, color) VALUES (?, ?, ?, ?)').run(req.params.rackId, vlan_id, name, color);
  res.status(201).json(getDb().prepare('SELECT * FROM vlans WHERE id = ?').get(r.lastInsertRowid));
});
router.delete('/:rackId/vlans/:vid', (req, res) => {
  getDb().prepare('DELETE FROM vlans WHERE id = ? AND rack_id = ?').run(req.params.vid, req.params.rackId);
  res.status(204).send();
});

export default router;
```

- [ ] **Create `api/src/routes/circuits.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/connection';

const router = Router({ mergeParams: true });
const CircuitSchema = z.object({ name: z.string(), color: z.string(), ampere: z.number().optional().nullable() });

router.get('/:rackId/circuits', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM circuits WHERE rack_id = ?').all(req.params.rackId));
});
router.post('/:rackId/circuits', (req, res) => {
  const parsed = CircuitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const { name, color, ampere } = parsed.data;
  const r = getDb().prepare('INSERT INTO circuits (rack_id, name, color, ampere) VALUES (?, ?, ?, ?)').run(req.params.rackId, name, color, ampere ?? null);
  res.status(201).json(getDb().prepare('SELECT * FROM circuits WHERE id = ?').get(r.lastInsertRowid));
});
router.delete('/:rackId/circuits/:cid', (req, res) => {
  getDb().prepare('DELETE FROM circuits WHERE id = ? AND rack_id = ?').run(req.params.cid, req.params.rackId);
  res.status(204).send();
});

export default router;
```

- [ ] **Commit**

```bash
git add api/src/routes/
git commit -m "feat: components, cables, vlans, circuits API with slot collision and port-in-use checks"
```

---

### Task 6: Frontend Scaffold — React + Vite + Tailwind + R3F

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Create `frontend/package.json`**

```json
{
  "name": "rackvisual-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@react-three/drei": "^9.106.0",
    "@react-three/fiber": "^8.16.8",
    "@tanstack/react-query": "^5.40.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.165.0",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.165.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.12",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://api:3001', changeOrigin: true },
    },
  },
});
```

- [ ] **Create `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rack: {
          bg: '#0a0e17',
          surface: '#161b22',
          border: '#30363d',
          text: '#e6edf3',
          muted: '#8b949e',
        },
      },
    },
  },
} satisfies Config;
```

- [ ] **Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RackVisual</title>
  </head>
  <body class="m-0 p-0 bg-rack-bg">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Create `frontend/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a0e17; color: #e6edf3; font-family: system-ui, sans-serif; overflow: hidden; }
```

- [ ] **Create `frontend/src/App.tsx`** (shell, wired up in later tasks)

```tsx
import Scene from './components/three/Scene';
import RackSwitcher from './components/ui/RackSwitcher';
import LibraryPanel from './components/ui/LibraryPanel';
import ModeToolbar from './components/ui/ModeToolbar';
import DetailPanel from './components/ui/DetailPanel';

export default function App() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-rack-bg">
      {/* Full-screen 3D viewport */}
      <Scene />
      {/* Floating UI overlays */}
      <RackSwitcher />
      <LibraryPanel />
      <ModeToolbar />
      <DetailPanel />
    </div>
  );
}
```

- [ ] **Create `frontend/src/types/index.ts`**

```typescript
export interface Rack {
  id: number;
  name: string;
  width: '10"' | '19"';
  height_u: number;
  color: string;
  created_at: string;
}

export interface ComponentModel {
  id: number;
  name: string;
  type: string;
  is_builtin: 1 | 0;
  file_path: string | null;
  height_u: number;
  width: string;
  net_ports: number;
  power_ports: number;
}

export interface Port {
  id: number;
  model_id: number;
  port_index: number;
  port_type: 'net' | 'power';
  label: string;
  face: 'front' | 'back';
  position_x: number;
  position_y: number;
}

export interface RackComponent {
  id: number;
  rack_id: number;
  model_id: number;
  slot_position: number;
  height_u: number;
  name: string;
  os: string | null;
  specs: string | null;
  ip: string | null;
  vlan_id: number | null;
  circuit_id: number | null;
  color: string | null;
  tags: string[];
  services: { vms: string[]; containers: string[] };
}

export interface Cable {
  id: number;
  rack_id: number;
  from_comp_id: number;
  to_comp_id: number;
  from_port_id: number;
  to_port_id: number;
  type: 'power' | 'net';
  color: string | null;
  label: string | null;
}

export interface Vlan {
  id: number;
  rack_id: number;
  vlan_id: number;
  name: string;
  color: string;
}

export interface Circuit {
  id: number;
  rack_id: number;
  name: string;
  color: string;
  ampere: number | null;
}

export type AppMode = 'select' | 'move' | 'cable' | 'delete';
```

- [ ] **Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffold with Vite, React, TypeScript, Tailwind, R3F"
```

---

### Task 7: Zustand Store + React Query API Client

**Files:**
- Create: `frontend/src/store/useStore.ts`
- Create: `frontend/src/api/client.ts`

- [ ] **Create `frontend/src/store/useStore.ts`**

```typescript
import { create } from 'zustand';
import type { AppMode, RackComponent, Port } from '../types';

interface Store {
  selectedRackId: number | null;
  setSelectedRackId: (id: number | null) => void;

  mode: AppMode;
  setMode: (mode: AppMode) => void;

  selectedComponentId: number | null;
  setSelectedComponentId: (id: number | null) => void;

  // Cable mode: track first selected port
  cableSourcePort: { compId: number; port: Port } | null;
  setCableSourcePort: (v: { compId: number; port: Port } | null) => void;

  showFace: 'front' | 'back' | 'free';
  setShowFace: (f: 'front' | 'back' | 'free') => void;
}

export const useStore = create<Store>((set) => ({
  selectedRackId: null,
  setSelectedRackId: (id) => set({ selectedRackId: id, selectedComponentId: null }),

  mode: 'select',
  setMode: (mode) => set({ mode, cableSourcePort: null }),

  selectedComponentId: null,
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),

  cableSourcePort: null,
  setCableSourcePort: (v) => set({ cableSourcePort: v }),

  showFace: 'free',
  setShowFace: (f) => set({ showFace: f }),
}));
```

- [ ] **Create `frontend/src/api/client.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Rack, RackComponent, ComponentModel, Port, Cable, Vlan, Circuit } from '../types';

const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Racks ----
export function useRacks() {
  return useQuery({ queryKey: ['racks'], queryFn: () => fetchJson<Rack[]>('/racks') });
}

export function useCreateRack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rack>) => fetchJson<Rack>('/racks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['racks'] }),
  });
}

export function useDeleteRack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson<void>(`/racks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['racks'] }),
  });
}

// ---- Components ----
export function useComponents(rackId: number | null) {
  return useQuery({
    queryKey: ['components', rackId],
    queryFn: () => fetchJson<RackComponent[]>(`/racks/${rackId}/components`),
    enabled: rackId !== null,
  });
}

export function useCreateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, data }: { rackId: number; data: Partial<RackComponent> }) =>
      fetchJson<RackComponent>(`/racks/${rackId}/components`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['components', rackId] }),
  });
}

export function useUpdateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, compId, data }: { rackId: number; compId: number; data: Partial<RackComponent> }) =>
      fetchJson<RackComponent>(`/racks/${rackId}/components/${compId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['components', rackId] }),
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, compId }: { rackId: number; compId: number }) =>
      fetchJson<void>(`/racks/${rackId}/components/${compId}`, { method: 'DELETE' }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['components', rackId] }),
  });
}

// ---- Models ----
export function useModels() {
  return useQuery({ queryKey: ['models'], queryFn: () => fetchJson<ComponentModel[]>('/models') });
}

export function useModelPorts(modelId: number | null) {
  return useQuery({
    queryKey: ['ports', modelId],
    queryFn: () => fetchJson<Port[]>(`/models/${modelId}/ports`),
    enabled: modelId !== null,
  });
}

// ---- Cables ----
export function useCables(rackId: number | null) {
  return useQuery({
    queryKey: ['cables', rackId],
    queryFn: () => fetchJson<Cable[]>(`/racks/${rackId}/cables`),
    enabled: rackId !== null,
  });
}

export function useCreateCable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, data }: { rackId: number; data: Partial<Cable> }) =>
      fetchJson<Cable>(`/racks/${rackId}/cables`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['cables', rackId] }),
  });
}

export function useDeleteCable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rackId, cableId }: { rackId: number; cableId: number }) =>
      fetchJson<void>(`/racks/${rackId}/cables/${cableId}`, { method: 'DELETE' }),
    onSuccess: (_r, { rackId }) => qc.invalidateQueries({ queryKey: ['cables', rackId] }),
  });
}

// ---- VLANs ----
export function useVlans(rackId: number | null) {
  return useQuery({
    queryKey: ['vlans', rackId],
    queryFn: () => fetchJson<Vlan[]>(`/racks/${rackId}/vlans`),
    enabled: rackId !== null,
  });
}

// ---- Circuits ----
export function useCircuits(rackId: number | null) {
  return useQuery({
    queryKey: ['circuits', rackId],
    queryFn: () => fetchJson<Circuit[]>(`/racks/${rackId}/circuits`),
    enabled: rackId !== null,
  });
}
```

- [ ] **Commit**

```bash
git add frontend/src/store/ frontend/src/api/
git commit -m "feat: Zustand store and React Query API client"
```

---

### Task 8: R3F Scene Setup + Procedural Rack Chassis

**Files:**
- Create: `frontend/src/components/three/Scene.tsx`
- Create: `frontend/src/lib/rack-geometry.ts`
- Create: `frontend/src/components/three/RackChassis.tsx`

- [ ] **Create `frontend/src/lib/rack-geometry.ts`**

This file builds the procedural rack chassis geometry — realistic-looking metal server rack with 4 posts, rails, mounting strips, and cable management.

```typescript
import * as THREE from 'three';

// Returns dimensions in meters: 1U = 0.04445m (1.75")
// 19" rack width = 0.482m, depth = 0.9m
export const U_HEIGHT = 0.04445; // 1U in meters
export const RACK_WIDTH_19 = 0.482;
export const RACK_WIDTH_10 = 0.254;
export const RACK_DEPTH = 0.9;
export const POST_SIZE = 0.038; // square post cross section

export function getRackWidth(width: '10"' | '19"') {
  return width === '19"' ? RACK_WIDTH_19 : RACK_WIDTH_10;
}

export function getRackHeight(heightU: number) {
  return heightU * U_HEIGHT + 0.1; // +100mm for top/bottom frame
}

// Compute the Y position (bottom) of a slot within the rack interior
export function slotY(slot: number, totalU: number): number {
  const interiorHeight = totalU * U_HEIGHT;
  // Slot 1 = top, counting down
  return (interiorHeight / 2) - (slot - 1) * U_HEIGHT - U_HEIGHT / 2;
}

// Build a rack chassis as a THREE.Group (posts + rails + mounting strips)
export function buildRackChassis(width: '10"' | '19"', heightU: number): THREE.Group {
  const group = new THREE.Group();
  const W = getRackWidth(width);
  const H = getRackHeight(heightU);
  const D = RACK_DEPTH;
  const P = POST_SIZE;

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.7, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2a, metalness: 0.5, roughness: 0.5 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, metalness: 0.8, roughness: 0.3 });

  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // 4 vertical posts
  const xOff = (W - P) / 2;
  const zOff = (D - P) / 2;
  [[-xOff, -zOff], [xOff, -zOff], [-xOff, zOff], [xOff, zOff]].forEach(([x, z]) => {
    addBox(P, H, P, x, 0, z, metalMat);
  });

  // Top + bottom horizontal rails (front & back)
  const railH = 0.04;
  const railD = 0.05;
  [H / 2 - railH / 2, -(H / 2 - railH / 2)].forEach((y) => {
    [-zOff, zOff].forEach((z) => {
      addBox(W, railH, railD, 0, y, z, metalMat);
    });
    // Side rails
    addBox(railD, railH, D, -xOff, y, 0, metalMat);
    addBox(railD, railH, D, xOff, y, 0, metalMat);
  });

  // Mounting strips (front, with U markings as slightly recessed strips)
  const stripW = 0.018;
  const interiorH = heightU * U_HEIGHT;
  for (let u = 0; u < heightU; u++) {
    const y = interiorH / 2 - (u + 0.5) * U_HEIGHT;
    const slotColor = u % 2 === 0 ? 0x1e2535 : 0x222a38;
    const slotMat = new THREE.MeshStandardMaterial({ color: slotColor, metalness: 0.3, roughness: 0.7 });
    // Slot slot background strip (front)
    addBox(W - P * 2, U_HEIGHT - 0.002, 0.002, 0, y, -D / 2 + P / 2, slotMat);
    // Left mounting holes hint
    addBox(stripW, U_HEIGHT - 0.004, 0.004, -(W / 2 - P - stripW / 2), y, -D / 2 + P / 2, railMat);
    addBox(stripW, U_HEIGHT - 0.004, 0.004, (W / 2 - P - stripW / 2), y, -D / 2 + P / 2, railMat);
  }

  // Back panel cable management bar
  addBox(W - P * 2, 0.04, 0.03, 0, 0, D / 2 - P / 2 - 0.015, darkMat);

  return group;
}
```

- [ ] **Create `frontend/src/components/three/RackChassis.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildRackChassis } from '../../lib/rack-geometry';
import type { Rack } from '../../types';

interface Props {
  rack: Rack;
}

export default function RackChassis({ rack }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  useEffect(() => {
    if (!groupRef.current) return;
    // Clear previous children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    const chassis = buildRackChassis(rack.width, rack.height_u);
    groupRef.current.add(chassis);
  }, [rack.width, rack.height_u]);

  return <group ref={groupRef} />;
}
```

- [ ] **Create `frontend/src/components/three/Scene.tsx`**

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { Suspense } from 'react';
import { useStore } from '../../store/useStore';
import { useRacks, useComponents, useCables } from '../../api/client';
import RackChassis from './RackChassis';
import ComponentMesh from './ComponentMesh';
import CableSystem from './CableSystem';

export default function Scene() {
  const selectedRackId = useStore((s) => s.selectedRackId);
  const showFace = useStore((s) => s.showFace);
  const { data: racks } = useRacks();
  const { data: components } = useComponents(selectedRackId);
  const { data: cables } = useCables(selectedRackId);

  const rack = racks?.find((r) => r.id === selectedRackId);

  const targetPosition: [number, number, number] =
    showFace === 'front' ? [0, 0, 3] :
    showFace === 'back' ? [0, 0, -3] :
    [2, 1.5, 2.5];

  return (
    <Canvas
      shadows
      camera={{ position: targetPosition, fov: 50 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0a0e17']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#4488ff" />

      <Suspense fallback={null}>
        <Environment preset="city" />
        {rack && (
          <group>
            <RackChassis rack={rack} />
            {(components ?? []).map((comp) => (
              <ComponentMesh key={comp.id} component={comp} rack={rack} />
            ))}
            {cables && components && (
              <CableSystem cables={cables} components={components} rack={rack} />
            )}
          </group>
        )}
        <Grid
          position={[0, -0.8, 0]}
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1e2535"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#2a3550"
          fadeDistance={12}
          infiniteGrid
        />
      </Suspense>

      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </Canvas>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/three/ frontend/src/lib/
git commit -m "feat: R3F scene with procedural rack chassis geometry and orbit controls"
```

---

### Task 9: Component Procedural Meshes

**Files:**
- Create: `frontend/src/components/three/ComponentMesh.tsx`

- [ ] **Create `frontend/src/components/three/ComponentMesh.tsx`**

Components are rendered as stylized 3D boxes inside the rack, with type-specific colors, LED indicators, and port hints on the front face.

```tsx
import { useRef, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import type { Rack, RackComponent } from '../../types';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import { useStore } from '../../store/useStore';
import { useModels } from '../../api/client';

const TYPE_COLORS: Record<string, string> = {
  server: '#1e3a5f',
  switch: '#1a3d2b',
  patch_panel: '#3d3000',
  ups: '#3d1a1a',
  pdu: '#2d1a3d',
  blank: '#1a1f2a',
  kvm: '#1a2d3d',
  custom: '#2a2a2a',
};

const TYPE_LED_COLORS: Record<string, string> = {
  server: '#63b3ed',
  switch: '#68d391',
  patch_panel: '#f6e05e',
  ups: '#fc8181',
  pdu: '#a371f7',
  blank: '#30363d',
  kvm: '#63b3ed',
  custom: '#8b949e',
};

interface Props {
  component: RackComponent;
  rack: Rack;
}

function ProceduralComponent({ component, rack, model }: Props & { model: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useStore((s) => s.setSelectedComponentId);
  const mode = useStore((s) => s.mode);

  const isSelected = selectedComponentId === component.id;
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const D = RACK_DEPTH - 0.06;
  const y = slotY(component.slot_position, rack.height_u);

  const baseColor = component.color ?? TYPE_COLORS[model?.type ?? 'custom'] ?? '#1e2535';
  const ledColor = TYPE_LED_COLORS[model?.type ?? 'custom'] ?? '#63b3ed';
  const emissiveIntensity = isSelected ? 0.4 : hovered ? 0.15 : 0.05;

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'select') setSelectedComponentId(isSelected ? null : component.id);
    if (mode === 'delete') {
      // deletion handled in UI layer via store event
      useStore.getState().setSelectedComponentId(component.id);
    }
  };

  return (
    <group position={[0, y, 0]}>
      {/* Main body */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.6}
          roughness={0.4}
          emissive={isSelected ? '#3366cc' : hovered ? ledColor : '#000000'}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Front face detail: LED indicator */}
      <mesh position={[-(W / 2 - 0.01), 0, -(D / 2 - 0.001)]}>
        <boxGeometry args={[0.006, 0.006, 0.001]} />
        <meshStandardMaterial color={ledColor} emissive={ledColor} emissiveIntensity={1.5} />
      </mesh>

      {/* Front face detail: label area (subtle darker strip) */}
      <mesh position={[0, 0, -(D / 2 - 0.001)]}>
        <planeGeometry args={[W * 0.6, H * 0.4]} />
        <meshStandardMaterial color="#111520" transparent opacity={0.5} />
      </mesh>

      {/* Selection outline (thin box slightly larger) */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[W + 0.004, H + 0.004, D + 0.004]} />
          <meshStandardMaterial color="#4488ff" wireframe />
        </mesh>
      )}
    </group>
  );
}

function GltfComponent({ component, rack, filePath }: Props & { filePath: string }) {
  const gltf = useLoader(GLTFLoader, `/api/models/file/${filePath}`);
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const y = slotY(component.slot_position, rack.height_u);

  // Scale the model to fit the slot
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.min(W / size.x, H / size.y, (RACK_DEPTH - 0.06) / size.z);

  return (
    <group position={[0, y, 0]} scale={scale}>
      <primitive object={gltf.scene.clone()} />
    </group>
  );
}

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
```

- [ ] **Commit**

```bash
git add frontend/src/components/three/ComponentMesh.tsx
git commit -m "feat: procedural component meshes with GLTF fallback"
```

---

### Task 10: Cable System (Bezier, Front/Back)

**Files:**
- Create: `frontend/src/components/three/CableSystem.tsx`
- Create: `frontend/src/components/three/PortMarker.tsx`

- [ ] **Create `frontend/src/components/three/PortMarker.tsx`**

```tsx
import { useState } from 'react';
import * as THREE from 'three';
import type { Port, RackComponent, Rack } from '../../types';
import { U_HEIGHT, RACK_DEPTH, slotY, getRackWidth, POST_SIZE } from '../../lib/rack-geometry';
import { useStore } from '../../store/useStore';
import { useCreateCable } from '../../api/client';

interface Props {
  port: Port;
  component: RackComponent;
  rack: Rack;
}

export function portWorldPosition(port: Port, component: RackComponent, rack: Rack): THREE.Vector3 {
  const W = getRackWidth(rack.width) - POST_SIZE * 2 - 0.002;
  const H = component.height_u * U_HEIGHT - 0.003;
  const D = RACK_DEPTH - 0.06;
  const y = slotY(component.slot_position, rack.height_u);

  const x = (port.position_x - 0.5) * W;
  const py = y + (port.position_y - 0.5) * H;
  const z = port.face === 'front' ? -(D / 2) : D / 2;
  return new THREE.Vector3(x, py, z);
}

export default function PortMarker({ port, component, rack }: Props) {
  const [hovered, setHovered] = useState(false);
  const mode = useStore((s) => s.mode);
  const cableSourcePort = useStore((s) => s.cableSourcePort);
  const setCableSourcePort = useStore((s) => s.setCableSourcePort);
  const createCable = useCreateCable();

  if (mode !== 'cable') return null;

  const pos = portWorldPosition(port, component, rack);
  const isSource = cableSourcePort?.port.id === port.id;
  const color = port.port_type === 'net' ? '#63b3ed' : '#fc8181';

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!cableSourcePort) {
      setCableSourcePort({ compId: component.id, port });
    } else if (cableSourcePort.port.id !== port.id) {
      // Complete the cable
      createCable.mutate({
        rackId: rack.id,
        data: {
          from_comp_id: cableSourcePort.compId,
          to_comp_id: component.id,
          from_port_id: cableSourcePort.port.id,
          to_port_id: port.id,
          type: port.port_type,
        },
      });
      setCableSourcePort(null);
    }
  };

  return (
    <mesh
      position={pos}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.005, 8, 8]} />
      <meshStandardMaterial
        color={isSource ? '#ffffff' : color}
        emissive={isSource ? '#ffffff' : color}
        emissiveIntensity={hovered || isSource ? 2 : 0.5}
      />
    </mesh>
  );
}
```

- [ ] **Create `frontend/src/components/three/CableSystem.tsx`**

```tsx
import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { Cable, RackComponent, Rack } from '../../types';
import { useModels, useModelPorts } from '../../api/client';
import { portWorldPosition } from './PortMarker';
import PortMarker from './PortMarker';
import { useStore } from '../../store/useStore';

interface Props {
  cables: Cable[];
  components: RackComponent[];
  rack: Rack;
}

function CableLine({ cable, components, rack }: { cable: Cable; components: RackComponent[]; rack: Rack }) {
  const { data: fromPorts } = useModelPorts(components.find((c) => c.id === cable.from_comp_id)?.model_id ?? null);
  const { data: toPorts } = useModelPorts(components.find((c) => c.id === cable.to_comp_id)?.model_id ?? null);

  const fromComp = components.find((c) => c.id === cable.from_comp_id);
  const toComp = components.find((c) => c.id === cable.to_comp_id);
  const fromPort = fromPorts?.find((p) => p.id === cable.from_port_id);
  const toPort = toPorts?.find((p) => p.id === cable.to_port_id);

  const points = useMemo(() => {
    if (!fromComp || !toComp || !fromPort || !toPort) return null;
    const start = portWorldPosition(fromPort, fromComp, rack);
    const end = portWorldPosition(toPort, toComp, rack);

    // Bezier control points: extend outward from the face
    const offset = fromPort.face === 'front' ? -0.15 : 0.15;
    const endOffset = toPort.face === 'front' ? -0.15 : 0.15;
    const ctrl1 = start.clone().add(new THREE.Vector3(0, 0, offset));
    const ctrl2 = end.clone().add(new THREE.Vector3(0, 0, endOffset));

    const curve = new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
    return curve.getPoints(32);
  }, [fromComp, toComp, fromPort, toPort, rack]);

  if (!points) return null;

  const color = cable.color ?? (cable.type === 'power' ? '#fc8181' : '#63b3ed');

  return <Line points={points} color={color} lineWidth={1.5} />;
}

export default function CableSystem({ cables, components, rack }: Props) {
  const mode = useStore((s) => s.mode);
  const { data: models } = useModels();

  return (
    <group>
      {cables.map((cable) => (
        <CableLine key={cable.id} cable={cable} components={components} rack={rack} />
      ))}
      {mode === 'cable' &&
        components.map((comp) => {
          const model = models?.find((m) => m.id === comp.model_id);
          if (!model) return null;
          // Render port markers lazily per component
          return <ComponentPorts key={comp.id} component={comp} rack={rack} modelId={model.id} />;
        })}
    </group>
  );
}

function ComponentPorts({ component, rack, modelId }: { component: RackComponent; rack: Rack; modelId: number }) {
  const { data: ports } = useModelPorts(modelId);
  if (!ports) return null;
  return (
    <>
      {ports.map((port) => (
        <PortMarker key={port.id} port={port} component={component} rack={rack} />
      ))}
    </>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/three/CableSystem.tsx frontend/src/components/three/PortMarker.tsx
git commit -m "feat: cable system with Bezier curves and front/back port routing"
```

---

### Task 11: UI Overlays

**Files:**
- Create: `frontend/src/components/ui/RackSwitcher.tsx`
- Create: `frontend/src/components/ui/LibraryPanel.tsx`
- Create: `frontend/src/components/ui/ModeToolbar.tsx`
- Create: `frontend/src/components/ui/DetailPanel.tsx`

- [ ] **Create `frontend/src/components/ui/RackSwitcher.tsx`**

```tsx
import { useState } from 'react';
import { useRacks, useCreateRack, useDeleteRack } from '../../api/client';
import { useStore } from '../../store/useStore';
import { useEffect } from 'react';

export default function RackSwitcher() {
  const { data: racks } = useRacks();
  const createRack = useCreateRack();
  const deleteRack = useDeleteRack();
  const { selectedRackId, setSelectedRackId } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState<'10"' | '19"'>('19"');
  const [newU, setNewU] = useState(12);

  // Auto-select first rack on load
  useEffect(() => {
    if (racks?.length && !selectedRackId) setSelectedRackId(racks[0].id);
  }, [racks, selectedRackId, setSelectedRackId]);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full px-4 py-1.5">
      <span className="text-blue-400 font-bold text-sm mr-1">⬡ RackVisual</span>
      <div className="w-px h-4 bg-rack-border" />
      {(racks ?? []).map((r) => (
        <button
          key={r.id}
          onClick={() => setSelectedRackId(r.id)}
          className={`text-xs px-3 py-0.5 rounded-full transition-colors ${
            selectedRackId === r.id
              ? 'bg-blue-900/60 border border-blue-600 text-blue-300'
              : 'text-rack-muted hover:text-rack-text'
          }`}
        >
          🗄 {r.name}
        </button>
      ))}

      {showNew ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName) return;
            createRack.mutate({ name: newName, width: newWidth, height_u: newU, color: '#1c2230' }, {
              onSuccess: (r) => { setSelectedRackId(r.id); setShowNew(false); setNewName(''); },
            });
          }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="bg-rack-bg border border-rack-border rounded px-2 py-0.5 text-xs text-rack-text w-28"
          />
          <select
            value={newWidth}
            onChange={(e) => setNewWidth(e.target.value as '10"' | '19"')}
            className="bg-rack-bg border border-rack-border rounded px-1 py-0.5 text-xs text-rack-text"
          >
            <option value='19"'>19"</option>
            <option value='10"'>10"</option>
          </select>
          <input
            type="number" min={1} max={48} value={newU}
            onChange={(e) => setNewU(Number(e.target.value))}
            className="bg-rack-bg border border-rack-border rounded px-2 py-0.5 text-xs text-rack-text w-14"
          />
          <span className="text-xs text-rack-muted">U</span>
          <button type="submit" className="text-xs text-green-400 px-2">✓</button>
          <button type="button" onClick={() => setShowNew(false)} className="text-xs text-rack-muted px-1">✕</button>
        </form>
      ) : (
        <button onClick={() => setShowNew(true)} className="text-xs text-green-400 hover:text-green-300 px-2">+ Neu</button>
      )}
    </div>
  );
}
```

- [ ] **Create `frontend/src/components/ui/LibraryPanel.tsx`**

```tsx
import { useState } from 'react';
import { useModels, useCreateComponent } from '../../api/client';
import { useStore } from '../../store/useStore';
import { useComponents } from '../../api/client';

export default function LibraryPanel() {
  const { data: models } = useModels();
  const { selectedRackId } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const createComponent = useCreateComponent();
  const [expanded, setExpanded] = useState(false);

  const typeEmoji: Record<string, string> = {
    server: '🖥', switch: '🔀', patch_panel: '🔌', ups: '🔋',
    pdu: '⚡', blank: '▬', kvm: '📺', custom: '📦',
  };

  const groups = models?.reduce((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m);
    return acc;
  }, {} as Record<string, typeof models>) ?? {};

  const handleAdd = (modelId: number, heightU: number) => {
    if (!selectedRackId || !components) return;
    // Find first free slot
    const occupied = new Set(
      components.flatMap((c) => Array.from({ length: c.height_u }, (_, i) => c.slot_position + i))
    );
    let slot = 1;
    while (occupied.has(slot)) slot++;
    createComponent.mutate({ rackId: selectedRackId, data: { model_id: modelId, slot_position: slot, name: models?.find(m=>m.id===modelId)?.name ?? 'Device' } });
  };

  return (
    <div className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col bg-rack-surface/85 backdrop-blur border border-rack-border rounded-lg transition-all ${expanded ? 'w-52' : 'w-12'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="p-2 text-rack-muted hover:text-rack-text text-center text-xs border-b border-rack-border"
      >
        {expanded ? '◀ LIB' : '▶'}
      </button>

      {expanded ? (
        <div className="p-2 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {Object.entries(groups).map(([type, items]) => (
            <div key={type}>
              <div className="text-xs text-rack-muted uppercase tracking-wide mb-1">{type}</div>
              {items?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleAdd(m.id, m.height_u)}
                  disabled={!selectedRackId}
                  className="w-full text-left text-xs px-2 py-1 rounded bg-rack-bg hover:bg-blue-900/30 text-rack-text border border-rack-border mb-0.5 disabled:opacity-40 flex items-center gap-1"
                >
                  <span>{typeEmoji[m.type] ?? '📦'}</span>
                  <span>{m.name}</span>
                  <span className="ml-auto text-rack-muted">{m.height_u}U</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-1 flex flex-col gap-1">
          {Object.keys(groups).map((type) => (
            <div key={type} className="text-center text-lg py-0.5" title={type}>
              {typeEmoji[type] ?? '📦'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Create `frontend/src/components/ui/ModeToolbar.tsx`**

```tsx
import { useStore } from '../../store/useStore';
import type { AppMode } from '../../types';

const MODES: { mode: AppMode; label: string; icon: string }[] = [
  { mode: 'select', label: 'Select', icon: '🖱' },
  { mode: 'move', label: 'Move', icon: '✥' },
  { mode: 'cable', label: 'Cable', icon: '🔌' },
  { mode: 'delete', label: 'Delete', icon: '🗑' },
];

const FACES = [
  { key: 'front' as const, label: 'Front' },
  { key: 'back' as const, label: 'Back' },
  { key: 'free' as const, label: 'Free' },
];

export default function ModeToolbar() {
  const { mode, setMode, showFace, setShowFace } = useStore();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-rack-surface/85 backdrop-blur border border-rack-border rounded-full px-3 py-1.5">
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => setMode(m.mode)}
          className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${
            mode === m.mode
              ? 'bg-blue-900/60 border border-blue-600 text-blue-300'
              : 'text-rack-muted hover:text-rack-text'
          }`}
        >
          {m.icon} {m.label}
        </button>
      ))}
      <div className="w-px h-4 bg-rack-border mx-1" />
      {FACES.map((f) => (
        <button
          key={f.key}
          onClick={() => setShowFace(f.key)}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${
            showFace === f.key ? 'text-purple-300 border border-purple-600 bg-purple-900/40' : 'text-rack-muted hover:text-rack-text'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Create `frontend/src/components/ui/DetailPanel.tsx`**

```tsx
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useComponents, useUpdateComponent, useDeleteComponent, useVlans, useCircuits } from '../../api/client';
import type { RackComponent } from '../../types';

export default function DetailPanel() {
  const { selectedRackId, selectedComponentId, setSelectedComponentId, mode } = useStore();
  const { data: components } = useComponents(selectedRackId);
  const { data: vlans } = useVlans(selectedRackId);
  const { data: circuits } = useCircuits(selectedRackId);
  const updateComponent = useUpdateComponent();
  const deleteComponent = useDeleteComponent();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<RackComponent>>({});

  const comp = components?.find((c) => c.id === selectedComponentId);
  if (!comp || !selectedRackId) return null;

  const startEdit = () => { setForm({ ...comp }); setEditing(true); };
  const save = () => {
    if (!selectedRackId || !comp) return;
    updateComponent.mutate({ rackId: selectedRackId, compId: comp.id, data: form });
    setEditing(false);
  };
  const remove = () => {
    if (!selectedRackId || !comp) return;
    deleteComponent.mutate({ rackId: selectedRackId, compId: comp.id });
    setSelectedComponentId(null);
  };

  return (
    <div className="absolute right-14 top-1/2 -translate-y-1/2 z-10 w-52 bg-rack-surface/90 backdrop-blur border border-blue-600/60 rounded-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2 border-b border-rack-border pb-1.5">
        <span className="text-blue-300 font-medium truncate">{comp.name}</span>
        <button onClick={() => setSelectedComponentId(null)} className="text-rack-muted hover:text-rack-text ml-2">✕</button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-1.5">
          {[
            { key: 'name', label: 'Name' }, { key: 'os', label: 'OS' },
            { key: 'specs', label: 'Specs' }, { key: 'ip', label: 'IP' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-rack-muted w-12 shrink-0">{label}:</span>
              <input
                value={(form as any)[key] ?? ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="flex-1 bg-rack-bg border border-rack-border rounded px-1.5 py-0.5 text-rack-text"
              />
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-rack-muted w-12 shrink-0">VLAN:</span>
            <select
              value={form.vlan_id ?? ''}
              onChange={(e) => setForm({ ...form, vlan_id: e.target.value ? Number(e.target.value) : null })}
              className="flex-1 bg-rack-bg border border-rack-border rounded px-1 py-0.5 text-rack-text"
            >
              <option value="">—</option>
              {(vlans ?? []).map((v) => <option key={v.id} value={v.id}>{v.vlan_id} {v.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-rack-muted w-12 shrink-0">Strom:</span>
            <select
              value={form.circuit_id ?? ''}
              onChange={(e) => setForm({ ...form, circuit_id: e.target.value ? Number(e.target.value) : null })}
              className="flex-1 bg-rack-bg border border-rack-border rounded px-1 py-0.5 text-rack-text"
            >
              <option value="">—</option>
              {(circuits ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-1 mt-1">
            <button onClick={save} className="flex-1 bg-green-800 hover:bg-green-700 rounded px-2 py-1 text-green-200">Speichern</button>
            <button onClick={() => setEditing(false)} className="flex-1 bg-rack-bg hover:bg-rack-border rounded px-2 py-1 text-rack-muted">Abbruch</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {[
            { label: 'OS', val: comp.os },
            { label: 'Specs', val: comp.specs },
            { label: 'IP', val: comp.ip },
            { label: 'VLAN', val: vlans?.find(v => v.id === comp.vlan_id)?.name },
            { label: 'Strom', val: circuits?.find(c => c.id === comp.circuit_id)?.name },
          ].filter(f => f.val).map(({ label, val }) => (
            <div key={label} className="flex gap-1">
              <span className="text-rack-muted w-12 shrink-0">{label}:</span>
              <span className="text-rack-text">{val}</span>
            </div>
          ))}
          {comp.tags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {comp.tags.map(t => <span key={t} className="bg-rack-bg border border-rack-border rounded px-1.5 text-rack-muted">{t}</span>)}
            </div>
          )}
          {(comp.services.vms.length > 0 || comp.services.containers.length > 0) && (
            <div className="mt-1 border-t border-rack-border pt-1">
              {comp.services.vms.map(v => <div key={v} className="text-purple-400">● VM: {v}</div>)}
              {comp.services.containers.map(c => <div key={c} className="text-green-400">🐳 {c}</div>)}
            </div>
          )}
          <div className="flex gap-1 mt-2">
            <button onClick={startEdit} className="flex-1 bg-green-900/50 hover:bg-green-800/60 border border-green-700/40 rounded px-2 py-1 text-green-300">✏ Edit</button>
            <button onClick={() => {}} className="flex-1 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/40 rounded px-2 py-1 text-purple-300">Ports</button>
            <button onClick={remove} className="bg-red-900/50 hover:bg-red-800/60 border border-red-700/40 rounded px-2 py-1 text-red-300">🗑</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/ui/
git commit -m "feat: UI overlays — RackSwitcher, LibraryPanel, ModeToolbar, DetailPanel"
```

---

### Task 12: Wire Up + Verify Running Stack

**Files:** No new files — integration task.

- [ ] **Install dependencies and start the stack**

```bash
cd api && npm install && cd ..
cd frontend && npm install && cd ..
docker compose up --build
```

- [ ] **Verify API**

```
curl http://localhost:3001/api/health
# → {"ok":true}

curl http://localhost:3001/api/models
# → JSON array with 9 built-in models
```

- [ ] **Verify Frontend**

Open `http://localhost:5173` — expect:
- Dark background, no errors in console
- RackSwitcher at top (empty state — no racks)
- Mode toolbar at bottom
- Library panel icon strip on left

- [ ] **Create first rack via UI** — click "+ Neu", enter name, confirm — rack should appear as tab

- [ ] **Add components** — click library panel icon to expand, click a component type — it should appear in the 3D scene

- [ ] **Select a component** — click it in the scene — DetailPanel should appear on the right

- [ ] **Run all API tests**

```bash
cd api && npm run test
# → all tests PASS
```

- [ ] **Commit**

```bash
git add .
git commit -m "feat: full MVP stack running — rack + components + cables + detail panel"
```

---

### Task 13: Add `postcss.config.js` + Production Build Check

**Files:**
- Create: `frontend/postcss.config.js`

- [ ] **Create `frontend/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Test production build**

```bash
docker compose -f docker-compose.prod.yml up --build
```

Open `http://localhost:80` — should serve the built app via nginx.

- [ ] **Commit**

```bash
git add frontend/postcss.config.js
git commit -m "feat: postcss config and production Docker build verified"
```

---

## Self-Review Gaps Fixed

- `components.vlan_id` / `circuit_id` are nullable FKs ✓
- Port collision check in cables route ✓  
- Slot collision check in components route ✓
- GLTF components get a procedural fallback during Suspense ✓
- `migrate.ts` runs `vlans` before `components` (FK dependency) — note: SQL `CREATE TABLE IF NOT EXISTS` ordering matters; `vlans` and `circuits` must be created before `components`. The migration already defines them in correct order ✓
- `slotY` counts slot 1 from the top ✓
