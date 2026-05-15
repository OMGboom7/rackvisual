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
