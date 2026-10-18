"""Attempt body-only heat weights on the real source; never export geometry."""
import argparse
import hashlib
import json
import sys
from pathlib import Path
import bpy
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--rigged', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(args.rigged).resolve()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
arm = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
mesh = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH')
arm.animation_data_clear()
arm.data.pose_position = 'REST'
names = json.loads(Path('.local/rigging/H01-joints.json').read_text())
name_index = {name: i for i, name in enumerate(names)}
disabled = []
for bone in arm.data.bones:
    if 'Hand' in bone.name and bone.name[-1:] in '123':
        bone.use_deform = False
        disabled.append(bone.name)
mesh.vertex_groups.clear()
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
print('BODY HEAT START; disabled finger bones:', len(disabled), flush=True)
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
bpy.context.view_layer.update()
records = np.zeros(len(mesh.data.vertices), dtype=[('p', '<f4', (3,)), ('j', 'u1', (4,)), ('w', '<f4', (4,))])
counts = {name: 0 for name in names}
unweighted = 0
for i, vertex in enumerate(mesh.data.vertices):
    point = mesh.matrix_world @ vertex.co
    records['p'][i] = (point.x, point.z, -point.y)
    influences = sorted([(group.weight, name_index[mesh.vertex_groups[group.group].name])
                         for group in vertex.groups if group.weight > 1e-8
                         and mesh.vertex_groups[group.group].name in name_index], reverse=True)[:4]
    total = sum(weight for weight, joint in influences)
    if not total:
        unweighted += 1
        continue
    for k, (weight, joint) in enumerate(influences):
        records['j'][i, k] = joint
        records['w'][i, k] = weight / total
        counts[names[joint]] += 1
required = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Head'] + [side + part for side in ['Left', 'Right'] for part in ['Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot']]
passed = unweighted == 0 and all(counts[name] > 0 for name in required)
report = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'method': 'Blender automatic bone heat on the real source topology, finger bones excluded',
          'passed': passed, 'scope': 'Weight generation only; independent source/strain/contact checks still required',
          'disabledBones': disabled, 'vertexCounts': counts, 'unweightedVertices': unweighted}
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
Path(str(output) + '.json').write_text(json.dumps(report, indent=2) + '\n')
if not passed:
    raise RuntimeError('Body heat rejected: missing required weights or unweighted source vertices')
records.tofile(output)
print('BODY HEAT WEIGHTS WRITTEN', report, flush=True)
