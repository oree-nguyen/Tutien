"""Bone heat on sealed source-derived hand proxies; export weights only."""
import argparse
import json
import sys
from pathlib import Path
import bpy
import bmesh
import numpy as np
from mathutils import Vector

p=argparse.ArgumentParser()
p.add_argument('--hero',required=True,choices=['H01','H02'])
p.add_argument('--input',required=True)
p.add_argument('--output',required=True)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
frames=json.loads(Path('data/rig/hand-frames.json').read_text())['heroes'][a.hero]['hands']
names=json.loads(Path('.local/rigging/'+a.hero+'-joints.json').read_text())
name_index={name:i for i,name in enumerate(names)}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.input).resolve()))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH')
source.animation_data_clear()
for mod in list(source.modifiers):
    source.modifiers.remove(mod)
source_coords=np.array([tuple(source.matrix_world@v.co) for v in source.data.vertices])
source_gltf=source_coords[:,[0,2,1]].copy()
source_gltf[:,2]*=-1
reports=[]
heat_scale=100.0
for side,frame in frames.items():
    points=np.array([frame['wrist']]+[point for finger in frame['fingers'].values() for point in finger['points']])
    lo=points.min(axis=0)-.022
    hi=points.max(axis=0)+.022
    mask=np.all((source_gltf>=lo)&(source_gltf<=hi),axis=1)
    selected=np.flatnonzero(mask)
    remap={int(v):i for i,v in enumerate(selected)}
    faces=[tuple(remap[v] for v in face.vertices) for face in source.data.polygons if all(mask[v] for v in face.vertices)]
    if len(faces)<100:raise RuntimeError('Source hand crop is empty')
    data=bpy.data.meshes.new(side+'SourceHandProxy')
    data.from_pydata((source_coords[selected]*heat_scale).tolist(),[],faces)
    data.update()
    proxy=bpy.data.objects.new(side+'SourceHandProxy',data)
    bpy.context.collection.objects.link(proxy)
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.holes_fill(bm,edges=[edge for edge in bm.edges if edge.is_boundary],sides=0)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(data);bm.free()
    bpy.context.view_layer.objects.active=proxy
    remesh=proxy.modifiers.new('Sealed source voxel proxy','REMESH')
    remesh.mode='VOXEL';remesh.voxel_size=.0012*heat_scale
    remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    if len(proxy.data.vertices)<1000:raise RuntimeError('Voxel proxy lost the hand surface')
    arm_data=bpy.data.armatures.new(side+'HandHeatSkeleton')
    arm=bpy.data.objects.new(side+'HandHeatSkeleton',arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active=arm
    bpy.ops.object.mode_set(mode='EDIT')
    convert=lambda point:Vector((point[0],-point[2],point[1]))*heat_scale
    root=arm.data.edit_bones.new(side+'Hand')
    root.head=convert(frame['wrist'])
    root.tail=convert(frame['fingers']['Middle']['points'][0])
    for finger,config in frame['fingers'].items():
        parent=root
        for k in range(3):
            bone=arm.data.edit_bones.new(side+'Hand'+finger+str(k+1))
            bone.head=convert(config['points'][k]);bone.tail=convert(config['points'][k+1])
            bone.parent=parent;bone.use_connect=False
            parent=bone
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    proxy.select_set(True);arm.select_set(True)
    bpy.context.view_layer.objects.active=arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    arm.scale=(1/heat_scale,)*3
    bpy.context.view_layer.update()
    counts={side+'Hand'+finger+str(k+1):0 for finger in frame['fingers'] for k in range(3)}
    for v in proxy.data.vertices:
        for group in v.groups:
            name=proxy.vertex_groups[group.group].name
            if name in counts and group.weight>.0001:counts[name]+=1
    if any(count==0 for count in counts.values()):
        raise RuntimeError('Source-derived proxy heat failed: '+str(counts))
    for group in source.vertex_groups:
        group.remove(selected.tolist())
    group=source.vertex_groups.new(name='ProxyTransferMask'+side)
    group.add(selected.tolist(),1,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    source.select_set(True)
    bpy.context.view_layer.objects.active=source
    transfer=source.modifiers.new('Source-derived hand heat transfer','DATA_TRANSFER')
    transfer.object=proxy
    transfer.use_vert_data=True
    transfer.data_types_verts={'VGROUP_WEIGHTS'}
    transfer.vert_mapping='POLYINTERP_NEAREST'
    transfer.layers_vgroup_select_src='ALL'
    transfer.layers_vgroup_select_dst='NAME'
    transfer.mix_mode='REPLACE';transfer.mix_factor=1
    transfer.vertex_group=group.name
    bpy.ops.object.datalayout_transfer(modifier=transfer.name)
    bpy.ops.object.modifier_apply(modifier=transfer.name)
    source.vertex_groups.remove(group)
    reports.append({'side':side,'sourceVertices':len(selected),'proxyVertices':len(proxy.data.vertices),'fingerCounts':counts})
    bpy.data.objects.remove(proxy,do_unlink=True)
    bpy.data.objects.remove(arm,do_unlink=True)
array=np.zeros(len(source.data.vertices),dtype=[('p','<f4',(3,)),('j','u1',(4,)),('w','<f4',(4,))])
missing=0
for i,v in enumerate(source.data.vertices):
    array['p'][i]=source_gltf[i]
    influences=sorted([(g.weight,name_index[source.vertex_groups[g.group].name]) for g in v.groups if g.weight>1e-8 and source.vertex_groups[g.group].name in name_index],reverse=True)[:4]
    total=sum(w for w,j in influences)
    if total<=0:
        missing+=1
        continue
    for k,(weight,joint) in enumerate(influences):
        array['j'][i,k]=joint;array['w'][i,k]=weight/total
if missing:raise RuntimeError('Unweighted source vertices after transfer: '+str(missing))
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
array.tofile(a.output)
Path(a.output+'.json').write_text(json.dumps({'hero':a.hero,'method':'Sealed source-derived hand voxel proxies, Blender bone heat, nearest source-surface transfer; only weights exported','voxelSize':.0012,'reports':reports,'vertices':len(array)},indent=2))
print('SOURCE-DERIVED HAND HEAT',reports,flush=True)
