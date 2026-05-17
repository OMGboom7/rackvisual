"""
RackVisual – Blender 3D Model Generator
========================================
Öffne Blender → Scripting-Tab → Paste → Run Script
Exportiert GLB-Dateien nach ~/Desktop/rack_models/

Blender 3.x oder 4.x, metrische Einheiten.

Physikalische Rack-Maße (Meter):
  Breite:  0.482 m  (19")
  1U:      0.0445 m (44.45 mm)
  Tiefe:   je nach Gerät
"""

import bpy
import math
import os

OUTPUT_DIR = os.path.expanduser("~/Desktop/rack_models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

RU_W = 0.482    # 19"-Breite
RU_H = 0.0445   # 1U-Höhe


# ─────────────────────────────────────────────────────────────────────────────
# Hilfsfunktionen
# ─────────────────────────────────────────────────────────────────────────────

def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for b in list(bpy.data.meshes) + list(bpy.data.materials):
        b.user_clear()
        try:
            type(b).remove(b)
        except Exception:
            pass


def mat(name, rgb, metallic=0.8, roughness=0.3, emit_rgb=None, emit_str=2.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if emit_rgb:
        b.inputs["Emission Color"].default_value = (*emit_rgb, 1)
        b.inputs["Emission Strength"].default_value = emit_str
    return m


def box(name, size, loc, m=None):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if m:
        if o.data.materials:
            o.data.materials[0] = m
        else:
            o.data.materials.append(m)
    return o


def cyl(name, r, depth, loc, rot=(math.pi / 2, 0, 0), m=None):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=depth, location=loc, rotation=rot, vertices=16
    )
    o = bpy.context.active_object
    o.name = name
    if m:
        if o.data.materials:
            o.data.materials[0] = m
        else:
            o.data.materials.append(m)
    return o


def export(filename):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUTPUT_DIR, filename),
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_materials='EXPORT',
    )
    print(f"  ✓ {filename}")


def chassis(height_u, depth, m_body, m_front):
    """Hauptgehäuse + Frontblende. Gibt (h, fy) zurück."""
    h = RU_H * height_u
    fy = depth / 2 + 0.0015   # Y-Abstand zur Frontfläche (negiert beim Aufruf)
    box("body",  (RU_W, depth, h), (0, 0, h / 2), m_body)
    box("front", (RU_W, 0.002, h * 0.98), (0, -(depth / 2 + 0.001), h / 2), m_front)
    return h, fy


# ─────────────────────────────────────────────────────────────────────────────
# Farb-Paletten
# ─────────────────────────────────────────────────────────────────────────────
DARK   = (0.11, 0.11, 0.13)
DARKER = (0.07, 0.07, 0.09)
SILVER = (0.52, 0.52, 0.55)
BLACK  = (0.04, 0.04, 0.04)

G_LED  = (0.0,  1.0,  0.2)
A_LED  = (1.0,  0.5,  0.0)
B_LED  = (0.1,  0.4,  1.0)
R_LED  = (1.0,  0.08, 0.05)
P_LED  = (0.6,  0.1,  1.0)

SCR_G  = (0.0,  0.35, 0.12)   # grüner LCD-Hintergrund
SCR_B  = (0.03, 0.07, 0.22)   # blauer LCD-Hintergrund
SCR_O  = (0.18, 0.07, 0.0)    # oranger Firewall-Display


# ─────────────────────────────────────────────────────────────────────────────
# 1  –  1U SERVER
# ─────────────────────────────────────────────────────────────────────────────
def make_server_1u():
    clear()
    depth = 0.58
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g", G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'led_a': mat("led_a", A_LED,  metallic=0, roughness=0.5, emit_rgb=A_LED),
        'scr':   mat("scr",   SCR_G,  metallic=0, roughness=0.9, emit_rgb=SCR_G, emit_str=1.5),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2   # vertikale Mitte

    # 8 Drive-Bay-Indikatoren (Slim-Rechtecke, gleichmäßig verteilt)
    bw, bh = 0.033, h * 0.52
    for i in range(8):
        x = -RU_W / 2 + 0.038 + i * (bw + 0.004)
        box(f"bay{i}", (bw, 0.003, bh), (x, -fy, z), M['blk'])

    # LCD-Display (rechts)
    box("lcd", (0.065, 0.002, h * 0.42), (RU_W / 2 - 0.096, -fy, z), M['scr'])

    # Power-Button
    cyl("pwr", 0.007, 0.003, (RU_W / 2 - 0.032, -fy, z), m=M['led_g'])

    # Aktivitäts-LEDs (3 Punkte oben rechts)
    for i, mk in enumerate(['led_g', 'led_a', 'led_g']):
        cyl(f"al{i}", 0.003, 0.003, (RU_W / 2 - 0.175 + i * 0.016, -fy, h * 0.80), m=M[mk])

    # Ear-Schrauben
    for sx in (-RU_W / 2 + 0.01, RU_W / 2 - 0.01):
        cyl(f"scr{sx}", 0.004, 0.003, (sx, -fy, h * 0.5), m=M['sil'])

    export("server_1u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 2  –  2U SERVER
# ─────────────────────────────────────────────────────────────────────────────
def make_server_2u():
    clear()
    depth = 0.60
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g", G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'led_a': mat("led_a", A_LED,  metallic=0, roughness=0.5, emit_rgb=A_LED),
        'scr':   mat("scr",   SCR_G,  metallic=0, roughness=0.9, emit_rgb=SCR_G, emit_str=1.5),
    }
    h, fy = chassis(2, depth, M['body'], M['front'])

    # 2×4 Drive-Grid
    bw = 0.052
    bh = (h - 0.018) / 2
    for row in range(2):
        for col in range(4):
            x = -RU_W / 2 + 0.032 + col * (bw + 0.006)
            z = 0.007 + row * (bh + 0.006) + bh / 2
            box(f"bay{row}{col}", (bw, 0.004, bh), (x, -fy, z), M['blk'])
            # Latch-Streifen oben
            box(f"latch{row}{col}", (bw * 0.6, 0.003, 0.005),
                (x, -fy - 0.004, z + bh / 2 - 0.004), M['sil'])

    # LCD
    box("lcd", (0.085, 0.002, h * 0.28), (RU_W / 2 - 0.125, -fy, h / 2), M['scr'])

    # Power-Button
    cyl("pwr", 0.009, 0.003, (RU_W / 2 - 0.040, -fy, h * 0.70), m=M['led_g'])

    # LEDs
    for i, mk in enumerate(['led_g', 'led_a']):
        cyl(f"al{i}", 0.004, 0.003, (RU_W / 2 - 0.19 + i * 0.022, -fy, h * 0.87), m=M[mk])

    # iDRAC-Port (kleines RJ45 rechts oben)
    box("idrac", (0.013, 0.007, 0.010), (RU_W / 2 - 0.040, -fy, h * 0.30), M['sil'])

    export("server_2u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 3  –  24-PORT SWITCH (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_switch_24():
    clear()
    depth = 0.36
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g", G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'led_a': mat("led_a", A_LED,  metallic=0, roughness=0.5, emit_rgb=A_LED),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # 24 RJ45-Ports: 2 Reihen à 12
    pw, ph = 0.014, 0.012
    for col in range(12):
        x = -RU_W / 2 + 0.038 + col * (pw + 0.006)
        for row in range(2):
            rz = 0.006 + row * (ph + 0.007) + ph / 2
            box(f"p{col}{row}", (pw, 0.008, ph), (x, -fy, rz), M['blk'])
            # LED über Port
            mk = 'led_g' if (col + row) % 3 != 2 else 'led_a'
            cyl(f"pl{col}{row}", 0.002, 0.002,
                (x + pw / 2 - 0.003, -fy, rz + ph / 2 + 0.004), m=M[mk])

    # 4 SFP+-Uplink-Ports (rechts)
    for i in range(4):
        box(f"sfp{i}", (0.014, 0.010, 0.012),
            (RU_W / 2 - 0.095 + i * 0.021, -fy, z), M['sil'])

    # Power-LED
    cyl("pwr", 0.005, 0.003, (RU_W / 2 - 0.022, -fy, z), m=M['led_g'])

    export("switch_24port.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 4  –  48-PORT SWITCH (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_switch_48():
    clear()
    depth = 0.40
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g", G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'led_a': mat("led_a", A_LED,  metallic=0, roughness=0.5, emit_rgb=A_LED),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # 48 Ports: 2 Reihen à 24
    pw, ph = 0.010, 0.011
    for col in range(24):
        x = -RU_W / 2 + 0.028 + col * (pw + 0.004)
        for row in range(2):
            rz = 0.005 + row * (ph + 0.006) + ph / 2
            box(f"p{col}{row}", (pw, 0.007, ph), (x, -fy, rz), M['blk'])
            mk = 'led_g' if (col + row) % 3 != 1 else 'led_a'
            cyl(f"pl{col}{row}", 0.0018, 0.002,
                (x + pw / 2 - 0.002, -fy, rz + ph / 2 + 0.003), m=M[mk])

    # 4 SFP28-Uplinks
    for i in range(4):
        box(f"sfp{i}", (0.013, 0.010, 0.011),
            (RU_W / 2 - 0.085 + i * 0.018, -fy, z), M['sil'])

    cyl("pwr", 0.004, 0.003, (RU_W / 2 - 0.020, -fy, z), m=M['led_g'])

    export("switch_48port.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 5  –  PATCH PANEL 24-PORT (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_patch_panel():
    clear()
    depth = 0.08
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # 24 RJ45-Ports in einer Reihe
    pw, ph = 0.013, 0.011
    for i in range(24):
        x = -RU_W / 2 + 0.028 + i * (pw + 0.006)
        box(f"port{i}", (pw, 0.009, ph), (x, -fy, z), M['blk'])
        # Beschriftungsfeld darunter
        box(f"lbl{i}", (pw, 0.001, 0.005),
            (x, -fy, z - ph / 2 - 0.004), M['sil'])

    # Kabelmanagement-Bügel oben
    box("cmgr", (RU_W * 0.94, 0.005, 0.004),
        (0, -fy, h - 0.006), M['sil'])

    # Schrauben-Ösen
    for sx in (-RU_W / 2 + 0.010, RU_W / 2 - 0.010):
        cyl(f"scr{sx:.2f}", 0.004, 0.003, (sx, -fy, z), m=M['sil'])

    export("patch_panel_24port.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 6  –  UPS (2U)
# ─────────────────────────────────────────────────────────────────────────────
def make_ups():
    clear()
    depth = 0.52
    M = {
        'body':  mat("body",   DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front",  DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",    SILVER, metallic=0.60, roughness=0.40),
        'led_g': mat("led_g",  G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'scr':   mat("scr",    SCR_G,  metallic=0, roughness=0.9, emit_rgb=SCR_G, emit_str=1.8),
        'orng':  mat("orng",   (0.80, 0.35, 0.05), metallic=0.3, roughness=0.5),
    }
    h, fy = chassis(2, depth, M['body'], M['front'])
    z = h / 2

    # LCD-Display (Mitte links)
    box("lcd", (0.13, 0.002, h * 0.42), (-0.04, -fy, z), M['scr'])

    # Akku-Balken (rechts vom LCD, aufsteigend)
    for i in range(5):
        bh = h * 0.055 * (i + 1) / 5 * 2
        mk = 'led_g' if i < 4 else 'sil'
        box(f"bat{i}", (0.014, 0.002, bh),
            (0.12 + i * 0.018, -fy, h * 0.20 + bh / 2), M[mk])

    # Lüftungsschlitze (links)
    for i in range(7):
        box(f"vent{i}", (0.055, 0.002, 0.005),
            (-RU_W / 2 + 0.050, -fy, 0.012 + i * 0.012), M['sil'])

    # Power-Button (rechts)
    cyl("pwr", 0.012, 0.003, (RU_W / 2 - 0.040, -fy, z), m=M['orng'])

    # LED
    cyl("led", 0.005, 0.003, (RU_W / 2 - 0.100, -fy, h * 0.82), m=M['led_g'])

    export("ups_2u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 7  –  PDU (1U, Rackmount Horizontal)
# ─────────────────────────────────────────────────────────────────────────────
def make_pdu():
    clear()
    depth = 0.07
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g", G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # 8 Steckdosen gleichmäßig verteilt
    n = 8
    spacing = (RU_W - 0.06) / (n - 1)
    for i in range(n):
        x = -RU_W / 2 + 0.03 + i * spacing
        # Steckdosen-Gehäuse
        box(f"soc{i}", (0.026, 0.006, h * 0.68), (x, -fy, z), M['blk'])
        # 2 Pin-Löcher
        for px in (-0.007, 0.007):
            cyl(f"pin{i}{px:.3f}", 0.003, 0.005, (x + px, -fy - 0.002, z), m=M['sil'])

    # Hauptschalter + LED (ganz rechts)
    box("breaker", (0.018, 0.005, 0.018), (RU_W / 2 - 0.030, -fy, z), M['sil'])
    cyl("led", 0.004, 0.003, (RU_W / 2 - 0.018, -fy, z + 0.012), m=M['led_g'])

    export("pdu_1u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 8  –  KVM (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_kvm():
    clear()
    depth = 0.46
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   BLACK,  metallic=0.30, roughness=0.80),
        'led_b': mat("led_b", B_LED,  metallic=0, roughness=0.5, emit_rgb=B_LED),
        'scr':   mat("scr",   SCR_B,  metallic=0, roughness=0.9, emit_rgb=SCR_B, emit_str=1.8),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # Monitor-Bereich (links)
    box("screen", (0.145, 0.002, h * 0.65), (-0.080, -fy, z), M['scr'])

    # Tastatur-Streifen (darunter)
    box("kbd", (0.125, 0.002, h * 0.26), (-0.080, -fy, z - h * 0.36), M['blk'])

    # 2 USB-A-Ports (Mitte rechts)
    for i in range(2):
        box(f"usb{i}", (0.013, 0.007, 0.009),
            (RU_W / 2 - 0.080, -fy, z - 0.008 + i * 0.016), M['sil'])

    # Port-Wahl-Tasten (4 Knöpfe, ganz rechts)
    for i in range(4):
        cyl(f"btn{i}", 0.006, 0.003,
            (RU_W / 2 - 0.028, -fy, 0.009 + i * 0.010), m=M['led_b'])

    export("kvm_1u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 9  –  NAS/STORAGE (4U)
# ─────────────────────────────────────────────────────────────────────────────
def make_storage_4u():
    clear()
    depth = 0.62
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",   SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",   (0.07, 0.07, 0.08), metallic=0.5, roughness=0.5),
        'led_b': mat("led_b", B_LED,  metallic=0, roughness=0.5, emit_rgb=B_LED),
        'led_a': mat("led_a", A_LED,  metallic=0, roughness=0.5, emit_rgb=A_LED),
    }
    h, fy = chassis(4, depth, M['body'], M['front'])

    cols, rows = 6, 4
    bw = (RU_W - 0.055) / cols - 0.003
    bh = (h - 0.020) / rows - 0.004

    for row in range(rows):
        for col in range(cols):
            x = -RU_W / 2 + 0.025 + col * (bw + 0.003) + bw / 2
            z = 0.008 + row * (bh + 0.004) + bh / 2
            # Drive-Schacht
            box(f"bay{row}{col}", (bw, 0.008, bh), (x, -fy, z), M['blk'])
            # Latch-Griff (oben)
            box(f"lch{row}{col}", (bw * 0.55, 0.004, 0.005),
                (x, -fy - 0.004, z + bh / 2 - 0.005), M['sil'])
            # Aktivitäts-LED (rechte Seite)
            mk = 'led_b' if (row + col) % 2 == 0 else 'led_a'
            cyl(f"al{row}{col}", 0.002, 0.002,
                (x + bw / 2 - 0.005, -fy, z + bh / 2 - 0.008), m=M[mk])

    export("storage_4u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 10  –  FIREWALL (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_firewall():
    clear()
    depth = 0.42
    M = {
        'body':  mat("body",   DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front",  DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",    SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",    BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g",  G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'led_r': mat("led_r",  R_LED,  metallic=0, roughness=0.5, emit_rgb=R_LED),
        'orng':  mat("orng",   (0.80, 0.30, 0.02), metallic=0.3, roughness=0.5),
        'scr':   mat("scr",    SCR_O,  metallic=0, roughness=0.9, emit_rgb=SCR_O, emit_str=2.0),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # Status-Display (links)
    box("disp", (0.075, 0.002, h * 0.50), (-RU_W / 2 + 0.085, -fy, z), M['scr'])

    # WAN-Ports (4 orange, Mitte links)
    pw, ph = 0.014, 0.011
    for i in range(4):
        x = -0.065 + i * 0.020
        box(f"wan{i}", (pw, 0.008, ph), (x, -fy, z + 0.009), M['orng'])
        cyl(f"wl{i}", 0.0025, 0.002, (x + 0.006, -fy, z + 0.009 + ph / 2 + 0.004), m=M['led_r'])

    # LAN-Ports (8 silber, Mitte rechts)
    for i in range(8):
        x = 0.040 + i * 0.020
        box(f"lan{i}", (pw, 0.008, ph), (x, -fy, z), M['blk'])
        mk = 'led_g' if i % 3 != 1 else 'led_r'
        cyl(f"ll{i}", 0.0025, 0.002, (x + 0.006, -fy, z + ph / 2 + 0.004), m=M[mk])

    # Console-Port
    box("con", (0.013, 0.007, 0.010), (RU_W / 2 - 0.075, -fy, z - 0.008), M['sil'])

    # Power-LED
    cyl("pwr", 0.005, 0.003, (RU_W / 2 - 0.025, -fy, z), m=M['led_g'])

    export("firewall_1u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 11  –  ROUTER (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_router():
    clear()
    depth = 0.44
    M = {
        'body':  mat("body",   DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front",  DARKER, metallic=0.70, roughness=0.40),
        'sil':   mat("sil",    SILVER, metallic=0.60, roughness=0.40),
        'blk':   mat("blk",    BLACK,  metallic=0.30, roughness=0.80),
        'led_g': mat("led_g",  G_LED,  metallic=0, roughness=0.5, emit_rgb=G_LED),
        'led_p': mat("led_p",  P_LED,  metallic=0, roughness=0.5, emit_rgb=P_LED),
        'scr':   mat("scr",    SCR_B,  metallic=0, roughness=0.9, emit_rgb=SCR_B, emit_str=1.8),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # Mittig: Display
    box("disp", (0.095, 0.002, h * 0.52), (0, -fy, z), M['scr'])

    # WAN-Modul links (lila LEDs = WAN-Uplink)
    box("wan_mod", (0.075, 0.005, h * 0.72), (-RU_W / 2 + 0.075, -fy, z), M['sil'])
    for i in range(2):
        x = -RU_W / 2 + 0.042 + i * 0.022
        box(f"wan_p{i}", (0.014, 0.008, 0.011), (x, -fy, z - 0.007), M['blk'])
        cyl(f"wpl{i}", 0.003, 0.002, (x + 0.006, -fy, z + 0.001), m=M['led_p'])

    # LAN-Modul rechts (grüne LEDs = Gigabit)
    box("lan_mod", (0.095, 0.005, h * 0.72), (RU_W / 2 - 0.085, -fy, z), M['sil'])
    for i in range(4):
        x = RU_W / 2 - 0.158 + i * 0.022
        box(f"lan_p{i}", (0.014, 0.008, 0.011), (x, -fy, z - 0.007), M['blk'])
        cyl(f"lpl{i}", 0.003, 0.002, (x + 0.006, -fy, z + 0.001), m=M['led_g'])

    # Console-Port
    box("con", (0.012, 0.007, 0.009), (RU_W / 2 - 0.032, -fy, z - 0.010), M['sil'])

    # Power-LED
    cyl("pwr", 0.005, 0.003, (RU_W / 2 - 0.022, -fy, z + 0.010), m=M['led_g'])

    export("router_1u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# 12  –  BLANK PANEL (1U)
# ─────────────────────────────────────────────────────────────────────────────
def make_blank():
    clear()
    depth = 0.018
    M = {
        'body':  mat("body",  DARK,   metallic=0.85, roughness=0.25),
        'front': mat("front", (0.18, 0.18, 0.20), metallic=0.75, roughness=0.30),
        'sil':   mat("sil",   SILVER, metallic=0.65, roughness=0.35),
    }
    h, fy = chassis(1, depth, M['body'], M['front'])
    z = h / 2

    # Schraubenlöcher (4 Ecken)
    for sx in (-RU_W / 2 + 0.013, RU_W / 2 - 0.013):
        for sz in (0.008, h - 0.008):
            cyl(f"s{sx:.2f}{sz:.3f}", 0.004, 0.003, (sx, -fy, sz), m=M['sil'])

    # Mittig geprägter Strich
    box("stripe", (RU_W * 0.45, 0.0008, 0.002), (0, -fy, z), M['sil'])

    export("blank_1u.glb")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
print(f"\nExportiere nach: {OUTPUT_DIR}\n")

make_server_1u()
make_server_2u()
make_switch_24()
make_switch_48()
make_patch_panel()
make_ups()
make_pdu()
make_kvm()
make_storage_4u()
make_firewall()
make_router()
make_blank()

print("\n✓ Fertig! 12 Modelle exportiert.")
print(f"  Ordner: {OUTPUT_DIR}")
