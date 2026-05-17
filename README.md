# RackVisual

**Interactive 3D visualization for homelab and datacenter racks**

RackVisual is a self-hosted web app for planning, populating, and managing server racks in an interactive 3D environment. No cloud, no account — everything runs via Docker on your own hardware.

---

## Features

- **3D rack visualization** — Realistic rendering powered by React Three Fiber / Three.js
- **Multiple racks** — Manage any number of rack projects (e.g. "Basement", "Office")
- **Component library** — Built-in models for servers, switches, patch panels, UPS, PDU, KVM, and blanks; custom GLTF/GLB models can be uploaded
- **Drag & drop** — Move components directly in the 3D view by dragging them to a free slot
- **Collision detection** — Occupied slots are automatically detected and blocked
- **Cable management** — Port-to-port connections for network and power cables
- **Component details** — OS, IP address, hardware (CPU/RAM/GPU/Storage), VMs, containers, tags, VLAN, power circuit
- **VLANs & circuits** — Logical network and power circuit management per rack
- **View modes** — Front, back, and free camera control
- **Local-first** — All data is stored as a local SQLite file, no external dependencies

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| 3D Engine | React Three Fiber, drei, Three.js |
| State | Zustand, TanStack Query |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Uploads | Multer (GLTF / GLB) |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose

### Start the development environment

```bash
git clone https://github.com/Louitz/rackvisual.git
cd rackvisual
docker-compose up
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:3001 |

The SQLite database and uploaded models are automatically stored under `./data/`.

### Production (Nginx)

```bash
docker-compose -f docker-compose.prod.yml up
```

The app runs as a bundled build at **http://localhost:80**. Nginx proxies all `/api` requests to the backend container.

---

## Project Structure

```
rackvisual/
├── api/                  # Express.js backend
│   └── src/
│       ├── routes/       # REST endpoints (racks, components, cables, vlans, …)
│       ├── db/           # SQLite connection & schema migration
│       └── seed.ts       # Built-in component models
│
├── frontend/             # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── three/    # 3D scene (Scene, RackChassis, ComponentMesh, …)
│       │   └── ui/       # Overlay panels (Library, Detail, Toolbar, …)
│       ├── api/          # React Query hooks
│       ├── store/        # Zustand global state
│       └── lib/          # Rack geometry & slot calculations
│
├── data/                 # Persistent data (SQLite + model uploads) — gitignored
├── docs/                 # Design docs & specs
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## API Reference

| Method | Route | Description |
|---|---|---|
| GET / POST | `/racks` | List / create racks |
| PUT / DELETE | `/racks/:id` | Rename / delete a rack |
| GET / POST | `/racks/:id/components` | List / add components |
| PUT / DELETE | `/racks/:id/components/:cid` | Update / remove a component |
| GET / POST / DELETE | `/racks/:id/cables` | Cable connections |
| GET / POST / DELETE | `/racks/:id/vlans` | VLANs |
| GET / POST / DELETE | `/racks/:id/circuits` | Power circuits |
| GET | `/models` | List component models |
| POST | `/models/upload` | Upload a custom GLTF/GLB model |
| DELETE | `/models/:id` | Delete a custom model |
| GET | `/api/health` | Health check |

---

## Data Persistence

All data is stored locally:

```
./data/
├── rackvisual.db    # SQLite database (WAL mode)
└── models/          # Uploaded GLTF/GLB files
```

The `./data/` directory is excluded from version control via `.gitignore` and mounted as a Docker volume.

---

## Local Development without Docker

**API:**
```bash
cd api
npm install
npm run dev        # Express starts on port 3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # Vite starts on port 5173
```

**Tests:**
```bash
npm run test       # Vitest (run in both api/ and frontend/)
```

---

## License

MIT
