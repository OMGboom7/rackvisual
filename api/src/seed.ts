import path from 'path';
import fs from 'fs';
import { getDb } from './db/connection';

const BUILT_IN_MODELS = [
  // ── SERVER ───────────────────────────────────────────────────────────────
  {
    name: '1U Server', type: 'server', height_u: 1, width: '19"', net_ports: 2, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net',   label: 'NIC0',  face: 'back', position_x: 0.10, position_y: 0.5 },
      { port_index: 1, port_type: 'net',   label: 'NIC1',  face: 'back', position_x: 0.17, position_y: 0.5 },
      { port_index: 2, port_type: 'power', label: 'PSU0',  face: 'back', position_x: 0.85, position_y: 0.5 },
      { port_index: 3, port_type: 'power', label: 'PSU1',  face: 'back', position_x: 0.93, position_y: 0.5 },
    ],
  },
  {
    name: '2U Server', type: 'server', height_u: 2, width: '19"', net_ports: 4, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net',   label: 'NIC0',  face: 'back', position_x: 0.10, position_y: 0.6 },
      { port_index: 1, port_type: 'net',   label: 'NIC1',  face: 'back', position_x: 0.17, position_y: 0.6 },
      { port_index: 2, port_type: 'net',   label: 'NIC2',  face: 'back', position_x: 0.10, position_y: 0.4 },
      { port_index: 3, port_type: 'net',   label: 'NIC3',  face: 'back', position_x: 0.17, position_y: 0.4 },
      { port_index: 4, port_type: 'power', label: 'PSU0',  face: 'back', position_x: 0.85, position_y: 0.5 },
      { port_index: 5, port_type: 'power', label: 'PSU1',  face: 'back', position_x: 0.93, position_y: 0.5 },
    ],
  },
  // Inspired by Dell PowerEdge R940 / HPE ProLiant DL580 Gen10
  {
    name: '4U Server', type: 'server', height_u: 4, width: '19"', net_ports: 6, power_ports: 4,
    ports: [
      { port_index: 0, port_type: 'net',   label: 'iDRAC', face: 'back', position_x: 0.04, position_y: 0.5 },
      { port_index: 1, port_type: 'net',   label: 'NIC0',  face: 'back', position_x: 0.11, position_y: 0.6 },
      { port_index: 2, port_type: 'net',   label: 'NIC1',  face: 'back', position_x: 0.18, position_y: 0.6 },
      { port_index: 3, port_type: 'net',   label: 'NIC2',  face: 'back', position_x: 0.11, position_y: 0.4 },
      { port_index: 4, port_type: 'net',   label: 'NIC3',  face: 'back', position_x: 0.18, position_y: 0.4 },
      { port_index: 5, port_type: 'net',   label: '10G0',  face: 'back', position_x: 0.28, position_y: 0.5 },
      { port_index: 6, port_type: 'power', label: 'PSU0',  face: 'back', position_x: 0.80, position_y: 0.5 },
      { port_index: 7, port_type: 'power', label: 'PSU1',  face: 'back', position_x: 0.86, position_y: 0.5 },
      { port_index: 8, port_type: 'power', label: 'PSU2',  face: 'back', position_x: 0.92, position_y: 0.5 },
      { port_index: 9, port_type: 'power', label: 'PSU3',  face: 'back', position_x: 0.97, position_y: 0.5 },
    ],
  },
  // Inspired by NVIDIA DGX A100 / Supermicro 2029GP-TR
  {
    name: 'GPU Server 2U', type: 'server', height_u: 2, width: '19"', net_ports: 4, power_ports: 4,
    ports: [
      { port_index: 0, port_type: 'net',   label: 'iDRAC',  face: 'back', position_x: 0.04, position_y: 0.5 },
      { port_index: 1, port_type: 'net',   label: '25G0',   face: 'back', position_x: 0.11, position_y: 0.65 },
      { port_index: 2, port_type: 'net',   label: '25G1',   face: 'back', position_x: 0.18, position_y: 0.65 },
      { port_index: 3, port_type: 'net',   label: '100G0',  face: 'back', position_x: 0.28, position_y: 0.5 },
      { port_index: 4, port_type: 'power', label: 'PSU0',   face: 'back', position_x: 0.80, position_y: 0.5 },
      { port_index: 5, port_type: 'power', label: 'PSU1',   face: 'back', position_x: 0.86, position_y: 0.5 },
      { port_index: 6, port_type: 'power', label: 'PSU2',   face: 'back', position_x: 0.92, position_y: 0.5 },
      { port_index: 7, port_type: 'power', label: 'PSU3',   face: 'back', position_x: 0.97, position_y: 0.5 },
    ],
  },
  // Inspired by HP ProLiant MicroServer Gen10 Plus
  {
    name: 'Microserver 1U', type: 'server', height_u: 1, width: '19"', net_ports: 2, power_ports: 1,
    ports: [
      { port_index: 0, port_type: 'net',   label: 'iLO',   face: 'back', position_x: 0.06, position_y: 0.5 },
      { port_index: 1, port_type: 'net',   label: 'NIC0',  face: 'back', position_x: 0.13, position_y: 0.5 },
      { port_index: 2, port_type: 'power', label: 'PSU',   face: 'back', position_x: 0.90, position_y: 0.5 },
    ],
  },

  // ── SWITCH ───────────────────────────────────────────────────────────────
  {
    name: 'Switch 24p', type: 'switch', height_u: 1, width: '19"', net_ports: 24, power_ports: 1,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `eth${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
      { port_index: 24, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  {
    name: 'Switch 48p', type: 'switch', height_u: 1, width: '19"', net_ports: 48, power_ports: 1,
    ports: [
      ...Array.from({ length: 48 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `eth${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 48, position_y: 0.5,
      })),
      { port_index: 48, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  // Inspired by Cisco Catalyst 9606R modular chassis
  {
    name: 'Core Switch 4U', type: 'switch', height_u: 4, width: '19"', net_ports: 8, power_ports: 2,
    ports: [
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `40G${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 8, position_y: 0.5,
      })),
      { port_index: 8,  port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.88, position_y: 0.5 },
      { port_index: 9,  port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  // Inspired by Arista 7050CX3-32S
  {
    name: '10G SFP+ Switch 24p', type: 'switch', height_u: 1, width: '19"', net_ports: 26, power_ports: 1,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `sfp${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 26, position_y: 0.6,
      })),
      { port_index: 24, port_type: 'net' as const, label: '100G0', face: 'front' as const, position_x: 0.92, position_y: 0.5 },
      { port_index: 25, port_type: 'net' as const, label: '100G1', face: 'front' as const, position_x: 0.97, position_y: 0.5 },
      { port_index: 26, port_type: 'power' as const, label: 'PWR',  face: 'back' as const, position_x: 0.95, position_y: 0.5 },
    ],
  },
  // Inspired by Cisco SG350-8 / Netgear GS308P
  {
    name: 'PoE Switch 8p', type: 'switch', height_u: 1, width: '19"', net_ports: 10, power_ports: 1,
    ports: [
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `ge${i}`, face: 'front' as const,
        position_x: (i + 0.5) / 10, position_y: 0.5,
      })),
      { port_index: 8,  port_type: 'net' as const,   label: 'SFP0', face: 'front' as const, position_x: 0.88, position_y: 0.5 },
      { port_index: 9,  port_type: 'net' as const,   label: 'SFP1', face: 'front' as const, position_x: 0.94, position_y: 0.5 },
      { port_index: 10, port_type: 'power' as const, label: 'PWR',  face: 'back' as const,  position_x: 0.95, position_y: 0.5 },
    ],
  },

  // ── PATCH PANEL ──────────────────────────────────────────────────────────
  {
    name: 'Patch Panel 24p', type: 'patch_panel', height_u: 1, width: '19"', net_ports: 24, power_ports: 0,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i,      port_type: 'net' as const, label: `P${i + 1}`,      face: 'front' as const, position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: 24 + i, port_type: 'net' as const, label: `P${i + 1}-back`, face: 'back' as const,  position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
    ],
  },
  // Inspired by Panduit DP48 / Leviton 48p
  {
    name: 'Patch Panel 48p', type: 'patch_panel', height_u: 2, width: '19"', net_ports: 48, power_ports: 0,
    ports: [
      ...Array.from({ length: 48 }, (_, i) => ({
        port_index: i,      port_type: 'net' as const, label: `P${i + 1}`,      face: 'front' as const, position_x: (i + 0.5) / 48, position_y: 0.5,
      })),
      ...Array.from({ length: 48 }, (_, i) => ({
        port_index: 48 + i, port_type: 'net' as const, label: `P${i + 1}-back`, face: 'back' as const,  position_x: (i + 0.5) / 48, position_y: 0.5,
      })),
    ],
  },
  // Inspired by Corning CCH-01U / Panduit FHAP
  {
    name: 'Fiber Panel 12p LC', type: 'patch_panel', height_u: 1, width: '19"', net_ports: 12, power_ports: 0,
    ports: [
      ...Array.from({ length: 12 }, (_, i) => ({
        port_index: i,      port_type: 'net' as const, label: `LC${i + 1}`,      face: 'front' as const, position_x: (i + 0.5) / 12, position_y: 0.5,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        port_index: 12 + i, port_type: 'net' as const, label: `LC${i + 1}-back`, face: 'back' as const,  position_x: (i + 0.5) / 12, position_y: 0.5,
      })),
    ],
  },
  // Inspired by Belden REVConnect / Panduit CJ6
  {
    name: 'Keystone Panel 24p', type: 'patch_panel', height_u: 1, width: '19"', net_ports: 24, power_ports: 0,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i,      port_type: 'net' as const, label: `KS${i + 1}`,      face: 'front' as const, position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: 24 + i, port_type: 'net' as const, label: `KS${i + 1}-back`, face: 'back' as const,  position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
    ],
  },
  // Inspired by Molex AngleFlex / Hubbell Angled
  {
    name: 'Angled Patch Panel 24p', type: 'patch_panel', height_u: 1, width: '19"', net_ports: 24, power_ports: 0,
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i,      port_type: 'net' as const, label: `A${i + 1}`,      face: 'front' as const, position_x: (i + 0.5) / 24, position_y: 0.65,
      })),
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: 24 + i, port_type: 'net' as const, label: `A${i + 1}-back`, face: 'back' as const,  position_x: (i + 0.5) / 24, position_y: 0.5,
      })),
    ],
  },

  // ── UPS ──────────────────────────────────────────────────────────────────
  {
    name: 'UPS 2U', type: 'ups', height_u: 2, width: '19"', net_ports: 1, power_ports: 8,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.10, position_y: 0.5 },
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i + 1, port_type: 'power' as const, label: `OUT${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 8, position_y: 0.7,
      })),
    ],
  },
  // Inspired by APC Smart-UPS SRT1000RMXLI
  {
    name: 'UPS 1U 1000VA', type: 'ups', height_u: 1, width: '19"', net_ports: 1, power_ports: 4,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.10, position_y: 0.5 },
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i + 1, port_type: 'power' as const, label: `OUT${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 4, position_y: 0.5,
      })),
    ],
  },
  // Inspired by APC Smart-UPS SRT3000RMXLT
  {
    name: 'UPS 3U 3000VA', type: 'ups', height_u: 3, width: '19"', net_ports: 2, power_ports: 10,
    ports: [
      { port_index: 0,  port_type: 'net' as const, label: 'MGMT0', face: 'back' as const, position_x: 0.06, position_y: 0.5 },
      { port_index: 1,  port_type: 'net' as const, label: 'MGMT1', face: 'back' as const, position_x: 0.12, position_y: 0.5 },
      ...Array.from({ length: 10 }, (_, i) => ({
        port_index: i + 2, port_type: 'power' as const, label: `OUT${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 10, position_y: 0.7,
      })),
    ],
  },
  // Inspired by APC Symmetra LX 8kVA
  {
    name: 'UPS 6U Enterprise', type: 'ups', height_u: 6, width: '19"', net_ports: 2, power_ports: 16,
    ports: [
      { port_index: 0,  port_type: 'net' as const, label: 'MGMT0', face: 'back' as const, position_x: 0.04, position_y: 0.5 },
      { port_index: 1,  port_type: 'net' as const, label: 'MGMT1', face: 'back' as const, position_x: 0.09, position_y: 0.5 },
      ...Array.from({ length: 16 }, (_, i) => ({
        port_index: i + 2, port_type: 'power' as const, label: `OUT${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 16, position_y: 0.72,
      })),
    ],
  },
  // Inspired by APC SURT192XLBP External Battery Module
  {
    name: 'Battery Module 2U', type: 'ups', height_u: 2, width: '19"', net_ports: 0, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'power' as const, label: 'BATT-IN',  face: 'back' as const, position_x: 0.45, position_y: 0.5 },
      { port_index: 1, port_type: 'power' as const, label: 'BATT-OUT', face: 'back' as const, position_x: 0.55, position_y: 0.5 },
    ],
  },

  // ── PDU ──────────────────────────────────────────────────────────────────
  {
    name: 'PDU 1U', type: 'pdu', height_u: 1, width: '19"', net_ports: 0, power_ports: 8,
    ports: Array.from({ length: 8 }, (_, i) => ({
      port_index: i, port_type: 'power' as const, label: `C13-${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 8, position_y: 0.5,
    })),
  },
  // Inspired by APC AP7900B Metered PDU
  {
    name: 'PDU 1U 16-Outlet', type: 'pdu', height_u: 1, width: '19"', net_ports: 1, power_ports: 16,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.04, position_y: 0.5 },
      ...Array.from({ length: 16 }, (_, i) => ({
        port_index: i + 1, port_type: 'power' as const, label: `C13-${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 16, position_y: 0.3,
      })),
    ],
  },
  // Inspired by Vertiv MPH2 / Geist PDU
  {
    name: 'PDU 2U 24-Outlet', type: 'pdu', height_u: 2, width: '19"', net_ports: 1, power_ports: 28,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.04, position_y: 0.5 },
      ...Array.from({ length: 24 }, (_, i) => ({
        port_index: i + 1, port_type: 'power' as const, label: `C13-${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 24, position_y: 0.65,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: 25 + i, port_type: 'power' as const, label: `C19-${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 4 * 0.3 + 0.35, position_y: 0.3,
      })),
    ],
  },
  // Inspired by APC AP8953 Switched PDU
  {
    name: 'Smart PDU 1U Switched', type: 'pdu', height_u: 1, width: '19"', net_ports: 1, power_ports: 8,
    ports: [
      { port_index: 0, port_type: 'net' as const, label: 'MGMT', face: 'back' as const, position_x: 0.04, position_y: 0.5 },
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i + 1, port_type: 'power' as const, label: `SW${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 8, position_y: 0.5,
      })),
    ],
  },
  // High-power C19 PDU for PSU direct feed
  {
    name: 'PDU 1U C19 8-Outlet', type: 'pdu', height_u: 1, width: '19"', net_ports: 0, power_ports: 8,
    ports: Array.from({ length: 8 }, (_, i) => ({
      port_index: i, port_type: 'power' as const, label: `C19-${i + 1}`, face: 'back' as const, position_x: (i + 0.5) / 8, position_y: 0.5,
    })),
  },

  // ── BLANK ────────────────────────────────────────────────────────────────
  { name: 'Blank Panel 1U', type: 'blank', height_u: 1, width: '19"', net_ports: 0, power_ports: 0, ports: [] },
  { name: 'Blank Panel 2U', type: 'blank', height_u: 2, width: '19"', net_ports: 0, power_ports: 0, ports: [] },
  {
    name: 'Cable Management 1U', type: 'blank', height_u: 1, width: '19"', net_ports: 0, power_ports: 0,
    ports: [],
  },

  // ── KVM ──────────────────────────────────────────────────────────────────
  {
    name: 'KVM 1U', type: 'kvm', height_u: 1, width: '19"', net_ports: 1, power_ports: 1,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'NET', face: 'back' as const, position_x: 0.10, position_y: 0.5 },
      { port_index: 1, port_type: 'power' as const, label: 'PWR', face: 'back' as const, position_x: 0.90, position_y: 0.5 },
    ],
  },
  // Inspired by Tripp Lite B021-000-17 LCD Console Drawer
  {
    name: 'LCD Console 1U', type: 'kvm', height_u: 1, width: '19"', net_ports: 1, power_ports: 1,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'VGA',  face: 'back' as const, position_x: 0.10, position_y: 0.5 },
      { port_index: 1, port_type: 'power' as const, label: 'PWR',  face: 'back' as const, position_x: 0.90, position_y: 0.5 },
    ],
  },
  // Inspired by ATEN CS1708A 8-Port KVM over IP
  {
    name: 'KVM 8-Port IP 1U', type: 'kvm', height_u: 1, width: '19"', net_ports: 1, power_ports: 1,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'IP-MGMT', face: 'back' as const, position_x: 0.08, position_y: 0.5 },
      { port_index: 1, port_type: 'power' as const, label: 'PWR',     face: 'back' as const, position_x: 0.92, position_y: 0.5 },
    ],
  },
  // Inspired by ATEN KN8116V 16-Port KVM over IP
  {
    name: 'KVM 16-Port 2U', type: 'kvm', height_u: 2, width: '19"', net_ports: 2, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'IP0', face: 'back' as const, position_x: 0.08, position_y: 0.6 },
      { port_index: 1, port_type: 'net' as const,   label: 'IP1', face: 'back' as const, position_x: 0.15, position_y: 0.6 },
      { port_index: 2, port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.88, position_y: 0.5 },
      { port_index: 3, port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // Inspired by Opengear CM7148 Console Server
  {
    name: 'Console Server 1U', type: 'kvm', height_u: 1, width: '19"', net_ports: 2, power_ports: 1,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'ETH0', face: 'back' as const, position_x: 0.08, position_y: 0.5 },
      { port_index: 1, port_type: 'net' as const,   label: 'ETH1', face: 'back' as const, position_x: 0.15, position_y: 0.5 },
      { port_index: 2, port_type: 'power' as const, label: 'PWR',  face: 'back' as const, position_x: 0.92, position_y: 0.5 },
    ],
  },

  // ── STORAGE (new type) ───────────────────────────────────────────────────
  // Inspired by Synology RS3621xs+
  {
    name: 'NAS 2U 12-Bay', type: 'storage', height_u: 2, width: '19"', net_ports: 4, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: '10G0',  face: 'back' as const, position_x: 0.10, position_y: 0.65 },
      { port_index: 1, port_type: 'net' as const,   label: '10G1',  face: 'back' as const, position_x: 0.17, position_y: 0.65 },
      { port_index: 2, port_type: 'net' as const,   label: '1G0',   face: 'back' as const, position_x: 0.10, position_y: 0.35 },
      { port_index: 3, port_type: 'net' as const,   label: '1G1',   face: 'back' as const, position_x: 0.17, position_y: 0.35 },
      { port_index: 4, port_type: 'power' as const, label: 'PSU0',  face: 'back' as const, position_x: 0.86, position_y: 0.5 },
      { port_index: 5, port_type: 'power' as const, label: 'PSU1',  face: 'back' as const, position_x: 0.93, position_y: 0.5 },
    ],
  },
  // Inspired by Synology RS4021xs+
  {
    name: 'NAS 4U 24-Bay', type: 'storage', height_u: 4, width: '19"', net_ports: 6, power_ports: 4,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: '25G0',  face: 'back' as const, position_x: 0.08, position_y: 0.7 },
      { port_index: 1, port_type: 'net' as const,   label: '25G1',  face: 'back' as const, position_x: 0.14, position_y: 0.7 },
      { port_index: 2, port_type: 'net' as const,   label: '10G0',  face: 'back' as const, position_x: 0.08, position_y: 0.5 },
      { port_index: 3, port_type: 'net' as const,   label: '10G1',  face: 'back' as const, position_x: 0.14, position_y: 0.5 },
      { port_index: 4, port_type: 'net' as const,   label: '1G0',   face: 'back' as const, position_x: 0.08, position_y: 0.3 },
      { port_index: 5, port_type: 'net' as const,   label: '1G1',   face: 'back' as const, position_x: 0.14, position_y: 0.3 },
      { port_index: 6, port_type: 'power' as const, label: 'PSU0',  face: 'back' as const, position_x: 0.80, position_y: 0.5 },
      { port_index: 7, port_type: 'power' as const, label: 'PSU1',  face: 'back' as const, position_x: 0.86, position_y: 0.5 },
      { port_index: 8, port_type: 'power' as const, label: 'PSU2',  face: 'back' as const, position_x: 0.92, position_y: 0.5 },
      { port_index: 9, port_type: 'power' as const, label: 'PSU3',  face: 'back' as const, position_x: 0.97, position_y: 0.5 },
    ],
  },
  // Inspired by NetApp DS224C / HPE MSA 2062
  {
    name: 'SAN 2U 24-Bay', type: 'storage', height_u: 2, width: '19"', net_ports: 4, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'SAS0',  face: 'back' as const, position_x: 0.10, position_y: 0.65 },
      { port_index: 1, port_type: 'net' as const,   label: 'SAS1',  face: 'back' as const, position_x: 0.17, position_y: 0.65 },
      { port_index: 2, port_type: 'net' as const,   label: 'MGMT0', face: 'back' as const, position_x: 0.10, position_y: 0.35 },
      { port_index: 3, port_type: 'net' as const,   label: 'MGMT1', face: 'back' as const, position_x: 0.17, position_y: 0.35 },
      { port_index: 4, port_type: 'power' as const, label: 'PSU0',  face: 'back' as const, position_x: 0.86, position_y: 0.5 },
      { port_index: 5, port_type: 'power' as const, label: 'PSU1',  face: 'back' as const, position_x: 0.93, position_y: 0.5 },
    ],
  },
  // Inspired by Pure Storage FlashArray//C60 / NetApp AFF A400
  {
    name: 'All-Flash Array 2U', type: 'storage', height_u: 2, width: '19"', net_ports: 8, power_ports: 2,
    ports: [
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `32FC${i}`, face: 'back' as const, position_x: (i + 0.5) / 10, position_y: 0.65,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: 4 + i, port_type: 'net' as const, label: `iSCSI${i}`, face: 'back' as const, position_x: (i + 0.5) / 10, position_y: 0.35,
      })),
      { port_index: 8, port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.88, position_y: 0.5 },
      { port_index: 9, port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // Inspired by Quantum Scalar i80 Tape Library
  {
    name: 'Tape Library 4U', type: 'storage', height_u: 4, width: '19"', net_ports: 2, power_ports: 2,
    ports: [
      { port_index: 0, port_type: 'net' as const,   label: 'FC0',  face: 'back' as const, position_x: 0.10, position_y: 0.6 },
      { port_index: 1, port_type: 'net' as const,   label: 'MGMT', face: 'back' as const, position_x: 0.17, position_y: 0.6 },
      { port_index: 2, port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.87, position_y: 0.5 },
      { port_index: 3, port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },

  // ── FIREWALL (new type) ──────────────────────────────────────────────────
  // Inspired by Fortinet FortiGate 300E
  {
    name: 'Firewall 1U', type: 'firewall', height_u: 1, width: '19"', net_ports: 8, power_ports: 2,
    ports: [
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `10G${i}`, face: 'front' as const, position_x: (i + 0.5) / 10, position_y: 0.65,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: 4 + i, port_type: 'net' as const, label: `1G${i}`, face: 'front' as const, position_x: (i + 4.5) / 10, position_y: 0.65,
      })),
      { port_index: 8,  port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.87, position_y: 0.5 },
      { port_index: 9,  port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // Inspired by Palo Alto PA-5220
  {
    name: 'Firewall 2U', type: 'firewall', height_u: 2, width: '19"', net_ports: 16, power_ports: 2,
    ports: [
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `10G${i}`, face: 'front' as const, position_x: (i + 0.5) / 16, position_y: 0.65,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: 8 + i, port_type: 'net' as const, label: `1G${i}`, face: 'front' as const, position_x: (i + 8.5) / 16, position_y: 0.65,
      })),
      { port_index: 16, port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.87, position_y: 0.5 },
      { port_index: 17, port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // Inspired by Sophos XGS 4300
  {
    name: 'UTM Appliance 1U', type: 'firewall', height_u: 1, width: '19"', net_ports: 10, power_ports: 2,
    ports: [
      ...Array.from({ length: 6 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `1G${i}`, face: 'front' as const, position_x: (i + 0.5) / 10, position_y: 0.5,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: 6 + i, port_type: 'net' as const, label: `SFP${i}`, face: 'front' as const, position_x: (i + 6.5) / 10, position_y: 0.5,
      })),
      { port_index: 10, port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.87, position_y: 0.5 },
      { port_index: 11, port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // Inspired by Cisco ASA 5555-X
  {
    name: 'VPN Gateway 1U', type: 'firewall', height_u: 1, width: '19"', net_ports: 8, power_ports: 2,
    ports: [
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `GE${i}`, face: 'front' as const, position_x: (i + 0.5) / 8, position_y: 0.5,
      })),
      { port_index: 8,  port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.87, position_y: 0.5 },
      { port_index: 9,  port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // IDS/IPS sensor with bypass port pairs
  {
    name: 'IDS/IPS Sensor 1U', type: 'firewall', height_u: 1, width: '19"', net_ports: 5, power_ports: 1,
    ports: [
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `BYPASS${i}`, face: 'front' as const, position_x: (i + 0.5) / 5, position_y: 0.5,
      })),
      { port_index: 4, port_type: 'net' as const,   label: 'MGMT', face: 'back' as const, position_x: 0.10, position_y: 0.5 },
      { port_index: 5, port_type: 'power' as const, label: 'PWR',  face: 'back' as const, position_x: 0.92, position_y: 0.5 },
    ],
  },

  // ── ROUTER (new type) ────────────────────────────────────────────────────
  // Inspired by Cisco ISR 4451 / HPE FlexNetwork MSR3064
  {
    name: 'Core Router 2U', type: 'router', height_u: 2, width: '19"', net_ports: 12, power_ports: 2,
    ports: [
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `WAN${i}`, face: 'back' as const, position_x: (i + 0.5) / 16, position_y: 0.65,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        port_index: 4 + i, port_type: 'net' as const, label: `LAN${i}`, face: 'back' as const, position_x: (i + 4.5) / 16, position_y: 0.65,
      })),
      { port_index: 12, port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.88, position_y: 0.5 },
      { port_index: 13, port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
  // Inspired by Mikrotik CCR2004-1G-12S+2XS
  {
    name: 'Edge Router 1U', type: 'router', height_u: 1, width: '19"', net_ports: 9, power_ports: 1,
    ports: [
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `25G${i}`, face: 'front' as const, position_x: (i + 0.5) / 10, position_y: 0.65,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: 4 + i, port_type: 'net' as const, label: `10G${i}`, face: 'front' as const, position_x: (i + 4.5) / 10, position_y: 0.65,
      })),
      { port_index: 8, port_type: 'net' as const,   label: 'MGMT', face: 'back' as const, position_x: 0.08, position_y: 0.5 },
      { port_index: 9, port_type: 'power' as const, label: 'PWR',  face: 'back' as const, position_x: 0.92, position_y: 0.5 },
    ],
  },
  // Inspired by Cisco Catalyst SD-WAN / Velocloud 3800
  {
    name: 'SD-WAN Appliance 1U', type: 'router', height_u: 1, width: '19"', net_ports: 8, power_ports: 2,
    ports: [
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: i, port_type: 'net' as const, label: `WAN${i}`, face: 'back' as const, position_x: (i + 0.5) / 10, position_y: 0.65,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        port_index: 4 + i, port_type: 'net' as const, label: `LAN${i}`, face: 'back' as const, position_x: (i + 4.5) / 10, position_y: 0.65,
      })),
      { port_index: 8,  port_type: 'power' as const, label: 'PSU0', face: 'back' as const, position_x: 0.87, position_y: 0.5 },
      { port_index: 9,  port_type: 'power' as const, label: 'PSU1', face: 'back' as const, position_x: 0.94, position_y: 0.5 },
    ],
  },
];

function getModelsDir(): string {
  if (process.env.DB_PATH) {
    return path.join(path.dirname(process.env.DB_PATH), 'models');
  }
  return path.join(process.cwd(), 'data', 'models');
}

const GLB_MAP: Record<string, string> = {
  // Server
  '1U Server':             'server_1u.glb',
  '2U Server':             'server_2u.glb',
  '4U Server':             'server_4u.glb',
  'GPU Server 2U':         'gpu_server_2u.glb',
  'Microserver 1U':        'microserver_1u.glb',
  // Switch
  'Switch 24p':            'switch_24port.glb',
  'Switch 48p':            'switch_48port.glb',
  'Core Switch 4U':        'core_switch_4u.glb',
  '10G SFP+ Switch 24p':   'switch_10g_sfp_24p.glb',
  'PoE Switch 8p':         'poe_switch_8p.glb',
  // Patch Panel
  'Patch Panel 24p':       'patch_panel_24port.glb',
  'Patch Panel 48p':       'patch_panel_48p.glb',
  'Fiber Panel 12p LC':    'fiber_panel_12p_lc.glb',
  'Keystone Panel 24p':    'keystone_panel_24p.glb',
  'Angled Patch Panel 24p':'angled_patch_panel_24p.glb',
  // UPS
  'UPS 2U':                'ups_2u.glb',
  'UPS 1U 1000VA':         'ups_1u_1000va.glb',
  'UPS 3U 3000VA':         'ups_3u_3000va.glb',
  'UPS 6U Enterprise':     'ups_6u_enterprise.glb',
  'Battery Module 2U':     'battery_module_2u.glb',
  // PDU
  'PDU 1U':                'pdu_1u.glb',
  'PDU 1U 16-Outlet':      'pdu_1u_16outlet.glb',
  'PDU 2U 24-Outlet':      'pdu_2u_24outlet.glb',
  'Smart PDU 1U Switched': 'pdu_1u_switched.glb',
  'PDU 1U C19 8-Outlet':   'pdu_1u_c19.glb',
  // Blank / Cable
  'Blank Panel 1U':        'blank_panel_1u.glb',
  'Blank Panel 2U':        'blank_panel_2u.glb',
  'Cable Management 1U':   'cable_management_1u.glb',
  // KVM
  'KVM 1U':                'kvm_1u.glb',
  'LCD Console 1U':        'lcd_console_1u.glb',
  'KVM 8-Port IP 1U':      'kvm_8port_ip_1u.glb',
  'KVM 16-Port 2U':        'kvm_16port_2u.glb',
  'Console Server 1U':     'console_server_1u.glb',
  // Storage
  'NAS 2U 12-Bay':         'nas_2u_12bay.glb',
  'NAS 4U 24-Bay':         'storage_4u.glb',
  'SAN 2U 24-Bay':         'san_2u_24bay.glb',
  'All-Flash Array 2U':    'all_flash_array_2u.glb',
  'Tape Library 4U':       'tape_library_4u.glb',
  // Firewall
  'Firewall 1U':           'firewall_1u.glb',
  'Firewall 2U':           'firewall_2u.glb',
  'UTM Appliance 1U':      'utm_appliance_1u.glb',
  'VPN Gateway 1U':        'vpn_gateway_1u.glb',
  'IDS/IPS Sensor 1U':     'ids_ips_sensor_1u.glb',
  // Router
  'Core Router 2U':        'core_router_2u.glb',
  'Edge Router 1U':        'router_1u.glb',
  'SD-WAN Appliance 1U':   'sdwan_appliance_1u.glb',
};

export function seed() {
  const db = getDb();

  const existingNames = new Set(
    (db.prepare('SELECT name FROM component_models WHERE is_builtin = 1').all() as any[]).map((r) => r.name)
  );

  const toInsert = BUILT_IN_MODELS.filter((m) => !existingNames.has(m.name));

  if (toInsert.length > 0) {
    const insertModel = db.prepare(
      'INSERT INTO component_models (name, type, is_builtin, height_u, width, net_ports, power_ports) VALUES (?, ?, 1, ?, ?, ?, ?)'
    );
    const insertPort = db.prepare(
      'INSERT INTO ports (model_id, port_index, port_type, label, face, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    db.transaction(() => {
      for (const model of toInsert) {
        const result = insertModel.run(model.name, model.type, model.height_u, model.width, model.net_ports, model.power_ports);
        for (const port of model.ports) {
          insertPort.run(result.lastInsertRowid, port.port_index, port.port_type, port.label, port.face, port.position_x, port.position_y);
        }
      }
    })();
  }

  // Wire up GLB files for all built-in models (runs every startup)
  const modelsDir = getModelsDir();
  const updateFilePath = db.prepare(
    'UPDATE component_models SET file_path = ? WHERE name = ? AND is_builtin = 1 AND file_path IS NOT ?'
  );
  for (const [name, glbFile] of Object.entries(GLB_MAP)) {
    const filePath = path.join(modelsDir, glbFile);
    if (fs.existsSync(filePath)) {
      updateFilePath.run(filePath, name, filePath);
    }
  }
}
