# RackVisual — Design Spec

**Datum:** 2026-05-16  
**Status:** Approved

---

## Überblick

RackVisual ist eine 3D-Rack-Visualisierungsapp für Homelab/Datacenter. Sie läuft als Docker-Container lokal, benötigt kein Login, und erlaubt einem einzelnen Nutzer mehrere Rack-Setups zu verwalten.

---

## Use Case

- Einzelner Nutzer, kein Auth
- Mehrere Rack-Projekte verwaltbar (z.B. "Keller-Rack", "Wohnzimmer-Rack")
- Läuft vollständig lokal als Docker Compose Stack
- Daten persistieren über ein gemountetes Volume

---

## Tech Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | React + Vite + TypeScript |
| 3D-Engine | React Three Fiber (Three.js) + OrbitControls |
| State | Zustand |
| Data Fetching | React Query |
| Styling | TailwindCSS |
| Backend | Node.js + Express.js |
| Datenbank | SQLite (better-sqlite3) |
| Validation | Zod |
| File Upload | Multer |
| Container | Docker Compose |

---

## Architektur

Zwei Docker-Services via `docker-compose.yml`:

```
┌─────────────────────────────────────────────────┐
│ docker-compose.yml                               │
│                                                  │
│  ┌──────────────────┐    ┌────────────────────┐  │
│  │ web (port 5173)  │◄──►│ api (port 3001)    │  │
│  │ Vite Dev Server  │REST│ Express.js          │  │
│  │ React + R3F      │    │ better-sqlite3      │  │
│  │ TypeScript       │    │ Multer (uploads)    │  │
│  └──────────────────┘    └────────────────────┘  │
│                                  │                │
│                    ┌─────────────────────────┐    │
│                    │ ./data/ (Volume)         │    │
│                    │  rackvisual.db (SQLite)  │    │
│                    │  models/ (GLTF/GLB)      │    │
│                    └─────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

Für Produktion: `docker-compose.prod.yml` — Nginx serviert das gebaute React-Bundle, API nicht direkt exposed, alles auf Port 80.

---

## UI-Layout: 3D First

Der 3D-Viewport füllt den gesamten Bildschirm. Alle UI-Elemente sind transparente Overlays:

- **Oben zentriert:** Rack-Switcher (zwischen Rack-Projekten wechseln + neues Rack anlegen)
- **Links floating:** Komponenten-Bibliothek (als Icon-Strip, aufklappbar zum vollen Panel)
- **Unten zentriert:** Modi-Toolbar (Select · Move · Kabel · Delete)
- **Rechts floating:** Detail-Panel (erscheint wenn eine Komponente angeklickt wird)
- **Oben rechts:** View-Controls (Reset, Toggle Wireframe, etc.)

---

## 3D-Szene

### Rack-Chassis
Das Rack-Gehäuse selbst ist ein GLTF-Modell — realistisches Metall-Rack mit Lochschienen, Kabelkanälen und Türen. Built-in Modelle:

- 19" 12U (kleines Homelab-Rack)
- 19" 24U
- 19" 42U (Standard-Rechenzentrum)
- 10" 9U (Netzwerk-Nische)
- Open Frame 19" 12U

Modellquellen: GrabCAD, TurboSquid, CGTrader → konvertiert zu `.glb`.

### Komponenten
Hybrid-Ansatz:
- **Built-in Bibliothek:** Prozedurale Meshes für Standard-Komponenten (Switch, Server, Patch Panel, UPS, PDU, Blank Panel, KVM) — sofort nutzbar, kein Download nötig
- **Custom GLTF Import:** Nutzer kann eigene `.gltf`/`.glb`-Dateien hochladen (Drag & Drop oder File-Picker)

Komponenten werden physisch korrekt in den Rack eingesetzt — sie rasten in die richtigen U-Slots ein.

### Kamera & Navigation
- OrbitControls (frei drehen, zoomen, schwenken)
- Quick-Buttons: **Front** · **Back** · **Free Orbit**
- Kabel werden automatisch an der richtigen Seite (vorne/hinten) des Racks dargestellt

### Verkabelung
- **Vorne:** Patch-Kabel, Management-Ports, KVM-Ports
- **Hinten:** Strom (PSU), Server-NICs, Switch-Uplinks, strukturierte Verkabelung
- Netzwerkkabel farbig nach VLAN
- Stromkabel farbig nach Stromkreis
- Kabel-Kurven als 3D-Bezier-Kurven, die von der richtigen Port-Fläche ausgehen

---

## Datenmodell (SQLite)

### `racks`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| name | TEXT | z.B. "Keller-Rack" |
| width | TEXT | '10"' oder '19"' |
| height_u | INTEGER | 1–48 |
| color | TEXT | Hex-Farbe |
| created_at | DATETIME | |

### `component_models`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| name | TEXT | z.B. "Cisco SG350-28" |
| type | TEXT | server/switch/patch_panel/ups/pdu/blank/kvm/custom |
| is_builtin | BOOLEAN | true = im Projekt enthalten |
| file_path | TEXT | Pfad zur .glb-Datei (null = prozedural) |
| thumbnail_path | TEXT | Vorschaubild |
| height_u | INTEGER | Höhe in HE |
| width | TEXT | '10"' oder '19"' |
| net_ports | INTEGER | Anzahl Netzwerkports |
| power_ports | INTEGER | Anzahl Stromanschlüsse |

### `ports`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| model_id | INTEGER FK | → component_models |
| port_index | INTEGER | Durchnummerierung |
| port_type | TEXT | 'net' oder 'power' |
| label | TEXT | z.B. "eth0", "PSU1" |
| face | TEXT | 'front' oder 'back' |
| position_x | REAL | Position auf der Fläche (0–1) |
| position_y | REAL | Position auf der Fläche (0–1) |

### `components`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| rack_id | INTEGER FK | → racks |
| model_id | INTEGER FK | → component_models |
| slot_position | INTEGER | Startslot (1 = oben) |
| height_u | INTEGER | Kann von model abweichen |
| name | TEXT | z.B. "proxmox-01" |
| os | TEXT | z.B. "Proxmox 8.2" |
| specs | TEXT | z.B. "32C / 128GB RAM" |
| ip | TEXT | |
| vlan | INTEGER FK nullable | → vlans (null = kein VLAN) |
| circuit | INTEGER FK nullable | → circuits (null = kein Stromkreis) |
| color | TEXT | Override-Farbe |
| tags | TEXT | JSON-Array |
| services | TEXT | JSON: {vms: [], containers: []} |

### `cables`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| rack_id | INTEGER FK | → racks |
| from_comp_id | INTEGER FK | → components |
| to_comp_id | INTEGER FK | → components |
| from_port | INTEGER FK | → ports |
| to_port | INTEGER FK | → ports |
| type | TEXT | 'power' oder 'net' |
| color | TEXT | Hex (override) |
| label | TEXT | optional |

### `vlans`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| rack_id | INTEGER FK | → racks |
| vlan_id | INTEGER | z.B. 10 |
| name | TEXT | z.B. "Management" |
| color | TEXT | Hex — wird für Kabelfarbe verwendet |

### `circuits`
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | INTEGER PK | |
| rack_id | INTEGER FK | → racks |
| name | TEXT | z.B. "Kreis A" |
| color | TEXT | Hex — wird für Kabelfarbe verwendet |
| ampere | REAL | optional |

---

## REST API (Express.js)

```
GET    /api/racks
POST   /api/racks
GET    /api/racks/:id
PUT    /api/racks/:id
DELETE /api/racks/:id

GET    /api/racks/:id/components
POST   /api/racks/:id/components
PUT    /api/racks/:id/components/:cid
DELETE /api/racks/:id/components/:cid

GET    /api/racks/:id/cables
POST   /api/racks/:id/cables
DELETE /api/racks/:id/cables/:cabid

GET    /api/racks/:id/vlans
POST   /api/racks/:id/vlans

GET    /api/racks/:id/circuits
POST   /api/racks/:id/circuits

GET    /api/models
POST   /api/models/upload     (multer, .gltf/.glb)
DELETE /api/models/:id
```

---

## Features (vollständige Liste)

1. **Rack-Konfigurator:** Neues Rack anlegen mit Name, Größe (10"/19"), Höhe (U), Farbe
2. **Rack-Switcher:** Zwischen mehreren Rack-Projekten wechseln
3. **3D-Viewport:** Vollbild, OrbitControls, Front/Back/Free Schnellzugriff
4. **Komponenten-Bibliothek:** Drag & Drop aus Sidebar in Rack-Szene
5. **Slot-Verwaltung:** Kollisionserkennung, korrekte U-Positionierung
6. **Detail-Panel:** Klick auf Komponente → floating Panel mit allen Feldern editierbar
7. **Port-Ansicht:** Zeigt alle Ports einer Komponente mit Belegungsstatus
8. **Kabel-Modus:** Zwei Ports verbinden (Port auswählen → Zielport auswählen)
9. **Kabel-Visualisierung:** 3D-Bezier-Kurven, farbig nach VLAN/Stromkreis, vorne/hinten korrekt
10. **Custom GLTF Import:** Eigene 3D-Modelle hochladen und verwenden
11. **VLAN-Verwaltung:** VLANs anlegen mit ID, Name, Farbe
12. **Stromkreis-Verwaltung:** Stromkreise anlegen mit Name, Farbe, Ampere
13. **Services:** Pro Komponente VMs (Proxmox), Docker Container dokumentieren

---

## Docker Setup

```yaml
# docker-compose.yml (Dev)
services:
  web:
    build: ./frontend
    ports: ["5173:5173"]
    volumes: ["./frontend:/app"]
    environment:
      VITE_API_URL: http://localhost:3001

  api:
    build: ./api
    ports: ["3001:3001"]
    volumes:
      - "./api:/app"
      - "./data:/app/data"
```

```yaml
# docker-compose.prod.yml
services:
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports: ["80:80"]
    depends_on: [api]

  api:
    build: ./api
    expose: ["3001"]
    volumes:
      - "./data:/app/data"
```

---

## Offene Punkte

- Welche echten GLTF-Modelle werden für den ersten Release mitgeliefert?
- Nutzer gibt nach erstem funktionsfähigen 3D-Modell Feedback was noch fehlt
