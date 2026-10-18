"""Solve weights on the real source surface; export weight records, never geometry."""
import argparse
import json
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--hero', required=True, choices=['H01','H02'])
p.add_argument('--rigged', required=True)
p.add_argument('--output', required=True)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
frames = json.loads(Path('data/rig/hand-frames.json').read_text())['heroes'][a.hero]['hands']
names = json.loads(Path('.local/rigging/'+a.hero+'-joints.json').read_text())
name_index = {name:i for i,name in enumerate(names)}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.rigged).resolve()))
arm = next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type=='MESH')
arm.animation_data_clear()
arm.data.pose_position='REST'
bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
for side, hand in frames.items():
    for finger, data in hand['fingers'].items():
        for k in range(3):
            bone=arm.data.edit_bones[side+'Hand'+finger+str(k+1)]
            bone.use_connect=False
            for attr, point in [('head',data['points'][k]),('tail',data['points'][k+1])]:
                x,y,z=point
                setattr(bone,attr,arm.matrix_world.inverted()@Vector((x,-z,y)))
bpy.ops.object.mode_set(mode='OBJECT')
mesh.vertex_groups.clear()
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
bpy.context.view_layer.update()
array=np.zeros(len(mesh.data.vertices),dtype=[('p','<f4',(3,)),('j','u1',(4,)),('w','<f4',(4,))])
counts={name:0 for name in names if 'Hand' in name and name[-1:] in '123'}
for i,v in enumerate(mesh.data.vertices):
    point=mesh.matrix_world@v.co
    array['p'][i]=(point.x,point.z,-point.y)
    influences=sorted([(g.weight,name_index[mesh.vertex_groups[g.group].name]) for g in v.groups if g.weight>1e-8 and mesh.vertex_groups[g.group].name in name_index],reverse=True)[:4]
    total=sum(w for w,j in influences)
    if not total: continue
    for k,(weight,joint) in enumerate(influences):
        array['j'][i,k]=joint
        array['w'][i,k]=weight/total
        if names[joint] in counts: counts[names[joint]]+=1
if any(count==0 for count in counts.values()):
    raise RuntimeError('Bone heat did not weight every finger; rejected: '+str(counts))
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
array.tofile(a.output)
Path(a.output+'.json').write_text(json.dumps({'hero':a.hero,'method':'Blender automatic bone heat on unchanged source surface','fingerCounts':counts,'vertices':len(array)},indent=2))
print('HAND HEAT WEIGHTS',counts,flush=True)
