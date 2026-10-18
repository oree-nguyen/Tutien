"""Prepare full-resolution display copies of the four user-shared Hunyuan assets.

Geometry, triangle topology, UVs and source PBR textures are retained. Only the
world scale, model origin and weapon attachment nodes are adjusted for the game.
"""
import argparse
import hashlib
import json
from pathlib import Path
import bpy
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--input-dir', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(__import__('sys').argv[__import__('sys').argv.index('--') + 1:])
args.output_dir.mkdir(parents=True, exist_ok=True)

specs = [
    ('h01-body.glb', 'H01-C0-source.glb', 'body-h01'),
    ('h02-body.glb', 'H02-C0-source.glb', 'body-h02'),
    ('h01-staff.glb', 'H01-W0-source.glb', 'staff'),
    ('h02-hammer.glb', 'H02-W0-source.glb', 'hammer'),
]
share_ids = {
    'h01-body.glb': 'a93d658b-a40d-4854-b755-ad1fa9bcc79b',
    'h02-body.glb': 'cd050512-738f-449f-95d3-7c11a9c06851',
    'h01-staff.glb': '4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6',
    'h02-hammer.glb': '45b118bc-58ce-4000-94c6-8e09945aa9f1',
}
receipt = {'source': 'Tencent Hunyuan public user shares', 'assets': []}

for input_name, output_name, kind in specs:
    source_path = args.input_dir / input_name
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source_path.resolve()))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if len(meshes) != 1:
        raise RuntimeError(f'{input_name}: expected one source mesh, found {len(meshes)}')
    mesh = meshes[0]
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    points = [vertex.co.copy() for vertex in mesh.data.vertices]
    low = Vector([min(point[i] for point in points) for i in range(3)])
    high = Vector([max(point[i] for point in points) for i in range(3)])
    original_triangles = sum(len(poly.vertices) - 2 for poly in mesh.data.polygons)

    if kind == 'body-h01':
        height = high.z - low.z
        center = Vector(((low.x + high.x) * .5, (low.y + high.y) * .5, low.z))
        for vertex in mesh.data.vertices:
            vertex.co = (vertex.co - center) * (1.82 / height)
        mesh.name = 'H01_Tencent_Original_Body'
    elif kind == 'body-h02':
        height = high.z - low.z
        center = Vector(((low.x + high.x) * .5, 0, low.z))
        for vertex in mesh.data.vertices:
            vertex.co = (vertex.co - center) * (2.2 / height)
        mesh.name = 'H02_Tencent_Original_Body'
    elif kind == 'staff':
        height = high.z - low.z
        center = Vector(((low.x + high.x) * .5, (low.y + high.y) * .5, low.z))
        for vertex in mesh.data.vertices:
            vertex.co = (vertex.co - center) * (2.0384 / height)
        grip_z = 2.0384 * .62
        grip = [vertex.co.copy() for vertex in mesh.data.vertices if abs(vertex.co.z - grip_z) < .025]
        if not grip:
            raise RuntimeError('H01 staff source does not contain its grip section')
        grip_x = (min(point.x for point in grip) + max(point.x for point in grip)) * .5
        grip_y = (min(point.y for point in grip) + max(point.y for point in grip)) * .5
        diameter = max(max(point.x for point in grip) - min(point.x for point in grip),
                       max(point.y for point in grip) - min(point.y for point in grip))
        transverse_scale = .04 / diameter
        for vertex in mesh.data.vertices:
            vertex.co.x = (vertex.co.x - grip_x) * transverse_scale
            vertex.co.y = (vertex.co.y - grip_y) * transverse_scale
            vertex.co.z -= grip_z
        mesh.name = 'MocTinhTruong_Tencent_Original'
        root = bpy.data.objects.new('Staff_Root', None)
        bpy.context.collection.objects.link(root)
        mesh.parent = root
        base = min(vertex.co.z for vertex in mesh.data.vertices)
        base_points = [vertex.co for vertex in mesh.data.vertices if vertex.co.z < base + .002]
        base_tip = (sum(point.x for point in base_points) / len(base_points),
                    sum(point.y for point in base_points) / len(base_points), base)
        nodes = [('Staff_Base_Tip', base_tip), ('Staff_Head_Core', (0, 0, 2.0384 * .32))]
        for name, point in nodes:
            node = bpy.data.objects.new(name, None)
            bpy.context.collection.objects.link(node)
            node.parent = root
            node.location = point
    else:
        length = high.x - low.x
        rotation = Matrix.Rotation(-1.5707963267948966, 3, 'Y')
        center = Vector((low.x, (low.y + high.y) * .5, (low.z + high.z) * .5))
        for vertex in mesh.data.vertices:
            vertex.co = rotation @ ((vertex.co - center) * (1.9 / length))
            vertex.co.z -= 1.15
        mesh.name = 'ChanNhacChuy_Tencent_Original'
        root = bpy.data.objects.new('Hammer_Root', None)
        bpy.context.collection.objects.link(root)
        mesh.parent = root
        for name, point in [('Hammer_Base_Tip', (0, 0, -1.15)),
                            ('Hammer_Head_Core', (0, 0, .49)),
                            ('Hammer_Head_Impact', (0, 0, .75))]:
            node = bpy.data.objects.new(name, None)
            bpy.context.collection.objects.link(node)
            node.parent = root
            node.location = point

    mesh.data.update()
    expected = original_triangles
    actual = sum(len(poly.vertices) - 2 for poly in mesh.data.polygons)
    if actual != expected:
        raise RuntimeError(f'{input_name}: triangle count changed {expected} -> {actual}')
    target = args.output_dir / output_name
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' or obj.name in {'Staff_Root', 'Hammer_Root', 'Staff_Base_Tip',
                                              'Staff_Head_Core', 'Hammer_Base_Tip',
                                              'Hammer_Head_Core', 'Hammer_Head_Impact'}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.export_scene.gltf(filepath=str(target.resolve()), export_format='GLB',
                              export_extras=True, use_selection=True)
    receipt['assets'].append({
        'file': output_name,
        'sourceShareId': share_ids[input_name],
        'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
        'sourceBytes': source_path.stat().st_size,
        'sourceTriangles': original_triangles,
        'outputBytes': target.stat().st_size,
        'outputSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'textureAndUvPolicy': 'preserve source textures and UVs; no resampling or rebake',
        'trianglePolicy': 'preserve every source triangle',
    })
    print(f'{output_name}: {actual:,} triangles, {target.stat().st_size:,} bytes', flush=True)

(args.output_dir / 'provenance.json').write_text(json.dumps(receipt, indent=2) + '\n')
