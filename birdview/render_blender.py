# -*- coding: utf-8 -*-
"""
미장동 장례식장 — Blender / Cycles 패스트레이싱 렌더

scene_export.json (three.js 모델을 그대로 덤프한 것)을 읽어 형상을 재구성하므로
도면에서 뽑은 치수가 렌더 단계에서 바뀔 여지가 없다.

  python3.11 render_blender.py [front back left right top] [--samples N] [--res W H]
"""
import json, math, os, sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, 'scene_export.json')))
OUT = os.path.join(HERE, 'renders_pbr')
os.makedirs(OUT, exist_ok=True)

args = sys.argv[1:]
def opt(flag, n, default):
    if flag in args:
        i = args.index(flag)
        return [args[i + 1 + k] for k in range(n)]
    return default

SAMPLES = int(opt('--samples', 1, ['96'])[0])
RES = [int(v) for v in opt('--res', 2, ['1800', '1260'])]
VIEWS = [a for a in args if not a.startswith('--') and a in DATA['views']] or ['front']

# ---------------------------------------------------------------- 초기화
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = 'CYCLES'
scn.cycles.device = 'CPU'
scn.cycles.samples = SAMPLES
scn.cycles.use_denoising = True
scn.cycles.max_bounces = 6
scn.cycles.transmission_bounces = 6
scn.cycles.transparent_max_bounces = 6
scn.render.resolution_x, scn.render.resolution_y = RES
scn.render.film_transparent = False
for vt in ('AgX', 'Filmic', 'Standard'):
    try:
        scn.view_settings.view_transform = vt
        break
    except TypeError:
        continue
for lk in ('AgX - Medium Contrast', 'Medium Contrast', 'None'):
    try:
        scn.view_settings.look = lk
        break
    except TypeError:
        continue
scn.view_settings.exposure = -0.75
scn.render.image_settings.file_format = 'JPEG'
scn.render.image_settings.quality = 94

def setin(node, name, val):
    """소켓이 없는 Blender 버전이면 노드 속성으로 시도, 그것도 없으면 무시"""
    try:
        node.inputs[name].default_value = val
        return
    except Exception:
        pass
    try:
        setattr(node, name.lower().replace(' ', '_'), val)
    except Exception:
        pass

# ---------------------------------------------------------------- 하늘
world = bpy.data.worlds.new('World'); scn.world = world
world.use_nodes = True
nt = world.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
# 흐린 날 그라디언트 하늘 (지평선 밝고 천정 약간 어두운 회청)
texco = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ')
ramp = nt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.interpolation = 'EASE'
e = ramp.color_ramp.elements
e[0].position = 0.34; e[0].color = (0.62, 0.63, 0.63, 1)     # 지평선
e[1].position = 1.00; e[1].color = (0.30, 0.38, 0.50, 1)     # 천정
m2 = ramp.color_ramp.elements.new(0.47); m2.color = (0.72, 0.74, 0.76, 1)
nt.links.new(texco.outputs['Generated'], sep.inputs['Vector'])
nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
bg = nt.nodes.new('ShaderNodeBackground')
setin(bg, 'Strength', 1.15)
outw = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
nt.links.new(bg.outputs[0], outw.inputs[0])

# 부드러운 그림자용 태양
sun_d = bpy.data.lights.new('Sun', 'SUN')
sun_d.energy = 2.2
sun_d.angle = math.radians(7)     # 큰 각지름 = 흐린 날 그림자
sun_o = bpy.data.objects.new('Sun', sun_d)
scn.collection.objects.link(sun_o)
sun_o.rotation_euler = (math.radians(42), 0, math.radians(205))

# ---------------------------------------------------------------- 재질
def hex_rgb(h):
    h = h.lstrip('#')
    return tuple((int(h[i:i + 2], 16) / 255.0) ** 2.2 for i in (0, 2, 4)) + (1.0,)

MATS = {}

def principled(name, color, rough=0.7, metal=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    setin(b, 'Base Color', color)
    setin(b, 'Roughness', rough)
    setin(b, 'Metallic', metal)
    if 'Specular IOR Level' in b.inputs:
        setin(b, 'Specular IOR Level', spec)
    return m

def add_noise_bump(m, scale=40.0, strength=0.12, detail=6.0):
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexNoise')
    setin(tex, 'Scale', scale)
    setin(tex, 'Detail', detail)
    bump = nt.nodes.new('ShaderNodeBump')
    setin(bump, 'Strength', strength)
    nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return tex

def add_color_noise(m, c1, c2, scale=30.0):
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexNoise')
    setin(tex, 'Scale', scale)
    setin(tex, 'Detail', 8.0)
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = c1
    ramp.color_ramp.elements[1].color = c2
    nt.links.new(tex.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    return tex

def brick_mat(name, mortar, brick_a, brick_b, size=0.9, rough=0.92):
    m = principled(name, brick_a, rough)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexBrick')
    setin(tex, 'Color1', brick_a)
    setin(tex, 'Color2', brick_b)
    setin(tex, 'Mortar', mortar)
    setin(tex, 'Scale', size)
    setin(tex, 'Mortar Size', 0.012)
    setin(tex, 'Bias', 0.0)
    setin(tex, 'Brick Width', 0.42)
    setin(tex, 'Row Height', 0.14)
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump')
    setin(bump, 'Strength', 0.35)
    nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def panel_mat(name, color, width, height, rough, joint=(0.45, 0.44, 0.42, 1)):
    """대형 판석 / 타일 — 줄눈 그리드"""
    m = principled(name, color, rough)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexBrick')
    setin(tex, 'Color1', color)
    setin(tex, 'Color2', tuple(min(1, c * 1.06) for c in color[:3]) + (1,))
    setin(tex, 'Mortar', joint)
    setin(tex, 'Scale', 1.0)
    setin(tex, 'Mortar Size', 0.006)
    setin(tex, 'Bias', 0.0)
    setin(tex, 'Brick Width', width)
    setin(tex, 'Row Height', height)
    setin(tex, 'Offset', 0.0)
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump')
    setin(bump, 'Strength', 0.10)
    nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    add_noise_bump(m, 90, 0.04)
    return m

def build_materials():
    M = MATS
    # --- 건물 외장
    M['brick'] = brick_mat('brick', (0.30, 0.29, 0.28, 1), (0.34, 0.33, 0.31, 1), (0.30, 0.29, 0.28, 1))
    M['granite'] = panel_mat('granite', (0.62, 0.59, 0.52, 1), 0.30, 0.30, 0.52)
    add_noise_bump(M['granite'], 220, 0.22, 10)
    M['tile'] = panel_mat('tile', (0.80, 0.78, 0.73, 1), 0.20, 0.28, 0.34)
    M['panel'] = principled('panel', (0.70, 0.69, 0.66, 1), 0.55)
    M['band'] = principled('band', (0.055, 0.060, 0.065, 1), 0.36, 0.85)
    M['roofMt'] = principled('roofMt', (0.05, 0.055, 0.06, 1), 0.40, 0.8)
    M['coping'] = principled('coping', (0.48, 0.47, 0.44, 1), 0.62)
    M['frame'] = principled('frame', (0.72, 0.71, 0.68, 1), 0.35, 0.30)
    M['metal'] = principled('metal', (0.42, 0.44, 0.45, 1), 0.32, 0.9)
    M['tyre'] = principled('tyre', (0.012, 0.012, 0.013, 1), 0.85)

    # --- 유리
    g = principled('glassW', (0.035, 0.055, 0.065, 1), 0.05, 0.0)
    g.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.72
    g.node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value = 1.5
    M['glassW'] = g
    c = principled('curtain', (0.05, 0.075, 0.085, 1), 0.04, 0.0)
    c.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.8
    M['curtain'] = c
    r = principled('glassR', (0.85, 0.90, 0.92, 1), 0.02, 0.0)
    r.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 0.95
    r.node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value = 1.5
    M['glassR'] = r

    # --- 옥상 / 포장
    M['roof'] = principled('roof', (0.36, 0.37, 0.36, 1), 0.80)
    add_noise_bump(M['roof'], 60, 0.06)
    M['paving'] = panel_mat('paving', (0.44, 0.43, 0.40, 1), 0.10, 0.10, 0.70)
    M['asphalt'] = principled('asphalt', (0.032, 0.033, 0.035, 1), 0.62)
    add_noise_bump(M['asphalt'], 300, 0.10, 10)
    M['line'] = principled('line', (0.80, 0.79, 0.75, 1), 0.55)
    M['bluepaint'] = principled('bluepaint', (0.04, 0.10, 0.32, 1), 0.55)
    M['edge'] = principled('edge', (0.03, 0.035, 0.04, 1), 0.7)
    M['gravel'] = principled('gravel', (0.62, 0.60, 0.55, 1), 0.95)
    add_noise_bump(M['gravel'], 700, 0.55, 12)
    M['stone'] = principled('stone', (0.50, 0.48, 0.44, 1), 0.72)
    add_noise_bump(M['stone'], 160, 0.16)
    M['court'] = principled('court', (0.030, 0.115, 0.062, 1), 0.72)
    M['courtEdge'] = principled('courtEdge', (0.30, 0.34, 0.30, 1), 0.85)
    M['wood'] = principled('wood', (0.20, 0.12, 0.062, 1), 0.62)

    # --- 지반 / 식재
    lawn = principled('lawn', (0.075, 0.16, 0.055, 1), 1.0)
    add_color_noise(lawn, (0.055, 0.125, 0.040, 1), (0.115, 0.215, 0.075, 1), 55)
    add_noise_bump(lawn, 400, 0.35, 10)
    M['lawn'] = lawn
    field = principled('field', (0.155, 0.175, 0.105, 1), 1.0)
    add_color_noise(field, (0.115, 0.135, 0.078, 1), (0.205, 0.225, 0.140, 1), 22)
    M['field'] = field
    farm = principled('farm', (0.135, 0.150, 0.085, 1), 1.0)
    add_color_noise(farm, (0.095, 0.100, 0.058, 1), (0.185, 0.195, 0.118, 1), 30)
    M['farm'] = farm
    M['soil'] = principled('soil', (0.085, 0.070, 0.048, 1), 1.0)
    M['soilM'] = principled('soilM', (0.135, 0.115, 0.075, 1), 1.0)
    M['moss'] = principled('moss', (0.045, 0.105, 0.032, 1), 1.0)
    add_noise_bump(M['moss'], 260, 0.30)
    M['hedge'] = principled('hedge', (0.030, 0.075, 0.022, 1), 1.0)
    add_noise_bump(M['hedge'], 180, 0.45, 12)
    M['trunk'] = principled('trunk', (0.075, 0.052, 0.032, 1), 0.95)
    add_noise_bump(M['trunk'], 120, 0.30)
    for k, col in (('leaf1', (0.048, 0.115, 0.030, 1)),
                   ('leaf2', (0.032, 0.088, 0.042, 1)),
                   ('leaf3', (0.098, 0.150, 0.048, 1))):
        mm = principled(k, col, 0.92)
        add_noise_bump(mm, 90, 0.60, 12)
        M[k] = mm

    # --- 물 : 정지 수면
    w = principled('water', (0.010, 0.030, 0.036, 1), 0.020, 0.0)
    wb = w.node_tree.nodes['Principled BSDF']
    setin(wb, 'Transmission Weight', 0.35)
    setin(wb, 'IOR', 1.333)
    add_noise_bump(w, 1.2, 0.035, 4)
    M['water'] = w

    # --- 차량
    for i, col in enumerate([(0.55, 0.55, 0.58, 1), (0.020, 0.022, 0.026, 1),
                             (0.18, 0.022, 0.028, 1), (0.020, 0.045, 0.10, 1),
                             (0.36, 0.38, 0.40, 1)]):
        cm = principled('car%d' % i, col, 0.16, 0.55)
        cm.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value = 0.9
        MATS['car%d' % i] = cm

build_materials()

def get_mat(name, color):
    if name in MATS:
        return MATS[name]
    m = principled(name or 'default', hex_rgb(color), 0.7)
    MATS[name] = m
    return m

# ---------------------------------------------------------------- 형상 재구성
# three.js(Y-up) → Blender(Z-up)
YUP = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

def to_matrix(e):                       # three.js elements = column-major
    return Matrix(((e[0], e[4], e[8], e[12]),
                   (e[1], e[5], e[9], e[13]),
                   (e[2], e[6], e[10], e[14]),
                   (e[3], e[7], e[11], e[15])))

mesh_cache = {}

def unit_mesh(kind, s):
    key = (kind, tuple(round(v, 4) for v in s))
    if key in mesh_cache:
        return mesh_cache[key]
    bpy.ops.object.select_all(action='DESELECT')
    if kind == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1)
        ob = bpy.context.object
        ob.scale = (s[0], s[1], s[2])
    elif kind == 'plane':
        bpy.ops.mesh.primitive_plane_add(size=1)
        ob = bpy.context.object
        ob.scale = (s[0], s[1], 1)
    elif kind == 'cyl':
        bpy.ops.mesh.primitive_cone_add(radius1=s[1], radius2=s[0], depth=s[2], vertices=16)
        ob = bpy.context.object
    elif kind == 'cone':
        bpy.ops.mesh.primitive_cone_add(radius1=s[0], radius2=0, depth=s[1], vertices=14)
        ob = bpy.context.object
    elif kind == 'ico':
        bpy.ops.mesh.primitive_ico_sphere_add(radius=s[0], subdivisions=2)
        ob = bpy.context.object
    elif kind == 'circle':
        bpy.ops.mesh.primitive_circle_add(radius=s[0], vertices=20, fill_type='NGON')
        ob = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    me = ob.data
    bpy.data.objects.remove(ob, do_unlink=True)
    mesh_cache[key] = me
    return me

coll = scn.collection
n_made = 0
for rec in DATA['meshes']:
    mat = get_mat(rec['mat'], rec.get('color', '#cccccc'))
    M = YUP @ to_matrix(rec['m'])
    if rec['t'] == 'mesh':
        me = bpy.data.meshes.new('poly')
        verts = rec['v']
        vs = [(verts[i], verts[i + 1], verts[i + 2]) for i in range(0, len(verts), 3)]
        idx = rec['i'] or list(range(len(vs)))
        faces = [tuple(idx[i:i + 3]) for i in range(0, len(idx), 3)]
        me.from_pydata(vs, [], faces)
        me.update()
    else:
        me = unit_mesh(rec['t'], rec['s'])
    ob = bpy.data.objects.new('m%d' % n_made, me)
    ob.matrix_world = M
    if ob.data.materials:
        ob.data = ob.data.copy()
        ob.data.materials[0] = mat
    else:
        ob.data.materials.append(mat)
    # three.js Plane/Circle 은 XY 평면 기준 → 그대로 두면 됨
    coll.objects.link(ob)
    n_made += 1

# 평면(three.js Plane/Circle)은 단면 → 그림자 자연스럽게
print('objects', n_made, 'materials', len(MATS))

# ---------------------------------------------------------------- 카메라 · 렌더
cam_d = bpy.data.cameras.new('Cam')
cam_d.lens_unit = 'FOV'
cam_d.angle_y = math.radians(34)
cam_d.clip_end = 3000
cam_o = bpy.data.objects.new('Cam', cam_d)
coll.objects.link(cam_o)
scn.camera = cam_o

def look_at(pos, tgt):
    p = Vector((pos[0], -pos[2], pos[1]))       # three.js → Blender
    t = Vector((tgt[0], -tgt[2], tgt[1]))
    d = (p - t).normalized()
    cam_o.location = p
    cam_o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()

for key in VIEWS:
    v = DATA['views'][key]
    look_at(v['pos'], v['target'])
    scn.render.filepath = os.path.join(OUT, key + '.jpg')
    print('>>> rendering', key, RES, SAMPLES, 'samples')
    bpy.ops.render.render(write_still=True)
    print('    saved', scn.render.filepath)
