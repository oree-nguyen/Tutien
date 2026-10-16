#!/usr/bin/env python3
"""Blender CPU orthographic concept projection; not generative PBR or unseen-back reconstruction.

Only imports an existing mesh. Preserves its geometry, originals and existing UVs;
adds an atlas if necessary, bakes front concept into it, uses neutral color on the
back, and embeds the resulting albedo. No primitives, rig or anatomy is created.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import bpy
import numpy as np
from mathutils import Vector


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--image', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--front', choices=['-Y', '+Y', '-Z', '+Z'], required=True,
                        help='Reviewed front direction in Blender coordinates after GLB import')
    parser.add_argument('--resolution', type=int, default=2048)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    if args.output.resolve() == args.source.resolve():
        raise RuntimeError('Projection must not overwrite the original Tencent mesh')
    if args.resolution not in [512, 1024, 2048]:
        raise RuntimeError('Atlas resolution must be 512, 1024 or 2048')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError('Source contains no mesh')
    points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    bounds = [(min(v[i] for v in points), max(v[i] for v in points)) for i in range(3)]
    vertical = 2 if 'Y' in args.front else 1
    horizontal = 0
    direction = Vector((0, -1 if args.front == '-Y' else 1, 0)) if 'Y' in args.front else Vector((0, 0, -1 if args.front == '-Z' else 1))
    image = bpy.data.images.load(str(args.image.resolve()))
    image.colorspace_settings.name = 'sRGB'
    # The concept usually has white margins; map the detected subject bounds,
    # not the full canvas, onto the mesh bounds. This cannot infer hidden views.
    pixels = np.empty(len(image.pixels), dtype=np.float32)
    image.pixels.foreach_get(pixels)
    pixels = pixels.reshape(image.size[1], image.size[0], 4)
    mask = (pixels[:, :, 3] > 0.05) & (np.min(pixels[:, :, :3], axis=2) < 0.90)
    rows, columns = np.nonzero(mask)
    if len(rows) < 100:
        raise RuntimeError('Cannot locate a non-white concept subject')
    subject_box = (float(columns.min())/image.size[0], float(rows.min())/image.size[1],
                   float(columns.max()+1)/image.size[0], float(rows.max()+1)/image.size[1])
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 1
    scene.render.bake.use_clear = True
    scene.render.bake.margin = 8
    records = []
    for obj in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True); bpy.context.view_layer.objects.active = obj
        mesh = obj.data
        before = (len(mesh.vertices), len(mesh.polygons))
        existing_uv = bool(mesh.uv_layers)
        if not existing_uv:
            mesh.uv_layers.new(name='ProjectionAtlas')
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(angle_limit=1.151917, island_margin=0.015)
            bpy.ops.object.mode_set(mode='OBJECT')
        atlas_uv = mesh.uv_layers.active.name
        original_uv = [tuple(loop.uv) for loop in mesh.uv_layers.active.data]
        projection = mesh.uv_layers.new(name='ConceptFrontProjection')
        for face in mesh.polygons:
            for index in face.loop_indices:
                point = obj.matrix_world @ mesh.vertices[mesh.loops[index].vertex_index].co
                u = (point[horizontal] - bounds[horizontal][0]) / max(1e-6, bounds[horizontal][1]-bounds[horizontal][0])
                v = (point[vertical] - bounds[vertical][0]) / max(1e-6, bounds[vertical][1]-bounds[vertical][0])
                if args.front in ['+Y', '-Z']:
                    u = 1-u
                projection.data[index].uv = (subject_box[0]+u*(subject_box[2]-subject_box[0]), subject_box[1]+v*(subject_box[3]-subject_box[1]))
        mesh.uv_layers.active = mesh.uv_layers[atlas_uv]
        mesh.uv_layers[atlas_uv].active_render = True
        material = bpy.data.materials.new('ConceptProjection_' + obj.name)
        material.use_nodes = True
        nodes = material.node_tree.nodes; nodes.clear(); links = material.node_tree.links
        uv = nodes.new('ShaderNodeUVMap'); uv.uv_map = projection.name
        source = nodes.new('ShaderNodeTexImage'); source.image = image; source.extension = 'CLIP'
        links.new(uv.outputs['UV'], source.inputs['Vector'])
        geometry = nodes.new('ShaderNodeNewGeometry')
        dot = nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = direction
        links.new(geometry.outputs['Normal'], dot.inputs[0])
        threshold = nodes.new('ShaderNodeMath'); threshold.operation = 'GREATER_THAN'; threshold.inputs[1].default_value = 0.15
        links.new(dot.outputs['Value'], threshold.inputs[0])
        mix = nodes.new('ShaderNodeMixRGB'); mix.inputs[1].default_value = (0.16, 0.25, 0.21, 1)
        links.new(threshold.outputs[0], mix.inputs[0]); links.new(source.outputs['Color'], mix.inputs[2])
        emission = nodes.new('ShaderNodeEmission'); links.new(mix.outputs[0], emission.inputs['Color'])
        output = nodes.new('ShaderNodeOutputMaterial'); links.new(emission.outputs[0], output.inputs['Surface'])
        target = bpy.data.images.new('ProjectedAlbedo_' + obj.name, width=args.resolution, height=args.resolution, alpha=False)
        target.colorspace_settings.name = 'sRGB'
        bake_node = nodes.new('ShaderNodeTexImage'); bake_node.image = target; nodes.active = bake_node
        obj.data.materials.clear(); obj.data.materials.append(material)
        for polygon in obj.data.polygons:
            polygon.material_index = 0
            polygon.use_smooth = True
        bpy.ops.object.bake(type='EMIT')
        nodes.clear()
        principled = nodes.new('ShaderNodeBsdfPrincipled'); principled.inputs['Roughness'].default_value = 0.7
        texture = nodes.new('ShaderNodeTexImage'); texture.image = target
        uv_node = nodes.new('ShaderNodeUVMap'); uv_node.uv_map = atlas_uv
        output = nodes.new('ShaderNodeOutputMaterial')
        links.new(uv_node.outputs['UV'], texture.inputs['Vector'])
        links.new(texture.outputs['Color'], principled.inputs['Base Color'])
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])
        target.pack()
        mesh.uv_layers.remove(projection)
        if before != (len(mesh.vertices), len(mesh.polygons)):
            raise RuntimeError('Projection changed source topology')
        if original_uv != [tuple(loop.uv) for loop in mesh.uv_layers.active.data]:
            raise RuntimeError('Projection changed original atlas UV coordinates')
        records.append({'node': obj.name, 'vertices': before[0], 'polygons': before[1], 'existingUVPreserved': existing_uv})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), export_format='GLB', export_extras=True)
    receipt = {'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
               'imageSha256': hashlib.sha256(args.image.read_bytes()).hexdigest(),
               'outputSha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
               'textureOrigin': 'single-view-orthographic-concept-projection', 'generatedPBR': False,
               'unseenBackReconstructed': False, 'runtimeApproved': False, 'front': args.front,
               'nodes': records, 'resolution': args.resolution, 'conceptSubjectBoxUV': subject_box}
    args.output.with_suffix('.projection.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))

if __name__ == '__main__':
    main()
