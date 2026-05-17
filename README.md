# RackVisual

**Interaktive 3D-Visualisierung für Homelab- und Datacenter-Racks**

RackVisual ist eine lokal gehostete Web-App, mit der du Serverracks in einer interaktiven 3D-Umgebung planen, befüllen und verwalten kannst. Keine Cloud, keine Registrierung – alles läuft per Docker auf deiner eigenen Hardware.

---

## Features

- **3D-Rack-Visualisierung** – Realistisches Rendering mit React Three Fiber / Three.js
- **Mehrere Racks** – Verwalte beliebig viele Rack-Projekte (z. B. "Keller", "Büro")
- **Komponenten-Bibliothek** – Vordefinierte Modelle für Server, Switches, Patchpanel, USV, PDU, KVM und Blanks; eigene GLTF/GLB-Modelle hochladbar
- **Drag & Drop** – Komponenten direkt in der 3D-Ansicht per Drag in einen freien Slot verschieben
- **Kollisionserkennung** – Belegte Slots werden automatisch erkannt und gesperrt
- **Kabelmanagement** – Port-zu-Port-Verbindungen mit Netz- und Stromkabeln
- **Komponentendetails** – OS, IP-Adresse, Hardware (CPU/RAM/GPU/Storage), VMs, Container, Tags, VLAN, Stromkreis
- **VLANs & Circuits** – Logische Netzwerk- und Stromkreis-Verwaltung pro Rack
- **Ansichtsmodi** – Front, Back und freie Kamerasteuerung
- **Local-first** – Daten liegen als SQLite-Datei bei dir, keine externe Abhängigkeit

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| 3D-Engine | React Three Fiber, drei, Three.js |
| State | Zustand, TanStack Query |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Datenbank | SQLite (better-sqlite3) |
| Uploads | Multer (GLTF / GLB) |
| Infra | Docker, Docker Compose, Nginx |

---

## Schnellstart

### Voraussetzungen

- [Docker](https://www.docker.com/) & Docker Compose

### Entwicklungsumgebung starten

```bash
git clone https://github.com/Louitz/rackvisual.git
cd rackvisual
docker-compose up
```

| Dienst | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:3001 |

Die SQLite-Datenbank und hochgeladene Modelle werden automatisch unter `./data/` gespeichert.

### Produktionsbetrieb (Nginx)

```bash
docker-compose -f docker-compose.prod.yml up
```

Die App läuft dann gebündelt unter **http://localhost:80**. Das Nginx-Reverse-Proxy leitet `/api`-Anfragen an den Backend-Container weiter.

---

## Projektstruktur

```
rackvisual/
├── api/                  # Express.js Backend
│   └── src/
│       ├── routes/       # REST-Endpunkte (racks, components, cables, vlans, …)
│       ├── db/           # SQLite-Verbindung & Schema-Migration
│       └── seed.ts       # Built-in Komponentenmodelle
│
├── frontend/             # React + Vite Frontend
│   └── src/
│       ├── components/
│       │   ├── three/    # 3D-Szene (Scene, RackChassis, ComponentMesh, …)
│       │   └── ui/       # Overlay-Panels (Library, Detail, Toolbar, …)
│       ├── api/          # React Query Hooks
│       ├── store/        # Zustand Global State
│       └── lib/          # Rack-Geometrie & Slot-Berechnungen
│
├── data/                 # Persistente Daten (SQLite + Modell-Uploads) – gitignored
├── docs/                 # Designdocs & Specs
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## API-Übersicht

| Methode | Route | Beschreibung |
|---|---|---|
| GET / POST | `/racks` | Racks auflisten / erstellen |
| PUT / DELETE | `/racks/:id` | Rack umbenennen / löschen |
| GET / POST | `/racks/:id/components` | Komponenten eines Racks |
| PUT / DELETE | `/racks/:id/components/:cid` | Komponente bearbeiten / entfernen |
| GET / POST / DELETE | `/racks/:id/cables` | Kabelverbindungen |
| GET / POST / DELETE | `/racks/:id/vlans` | VLANs |
| GET / POST / DELETE | `/racks/:id/circuits` | Stromkreise |
| GET | `/models` | Komponentenmodelle auflisten |
| POST | `/models/upload` | Eigenes GLTF/GLB-Modell hochladen |
| DELETE | `/models/:id` | Eigenes Modell löschen |
| GET | `/api/health` | Health-Check |

---

## Datenpersistenz

Alle Daten liegen lokal:

```
./data/
├── rackvisual.db    # SQLite-Datenbank (WAL-Modus)
└── models/          # Hochgeladene GLTF/GLB-Dateien
```

Der `./data/`-Ordner ist per `.gitignore` und Docker-Volume von der Versionsverwaltung ausgenommen.

---

## Lokale Entwicklung ohne Docker

**API:**
```bash
cd api
npm install
npm run dev        # Express startet auf Port 3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # Vite startet auf Port 5173
```

**Tests:**
```bash
npm run test       # Vitest (jeweils in api/ und frontend/)
```

---

## Lizenz

MIT
