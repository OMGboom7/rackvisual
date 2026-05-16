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

  // Safe column additions (ignored if already exist)
  try { db.exec('ALTER TABLE components ADD COLUMN hardware TEXT'); } catch {}
}
