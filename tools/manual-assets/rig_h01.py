"""Rig the approved Hunyuan H01 mesh locally, retaining its UVs and PBR images.
Run with blender -b --python tools/manual-assets/rig_h01.py.
The long robe receives conservative blended leg weights, not cloth simulation.
"""
import bpy
import math
import json
import hashlib
import shutil
from pathlib import Path
from mathutils import Vector, Quaternion

base=Path(__file__).resolve().parents[2]
folder=base/'public/models/h01-c0'
backup=base/'.local/manual-assets/static-lods'
backup.mkdir(parents=True,exist_ok=True)
receipt=json.loads((folder/'provenance.json').read_text())
bones=[('Root',(0,0,.85),(0,0,.97),None),
 ('Spine',(0,0,.97),(0,0,1.24),'Root'),('Chest',(0,0,1.24),(0,0,1.44),'Spine'),
 ('Neck',(0,0,1.44),(0,0,1.54),'Chest'),('Head',(0,0,1.54),(0,0,1.76),'Neck')]
for side,s in [('L',1),('R',-1)]:
 bones.extend([(f'UpperArm_{side}',(s*.17,0,1.40),(s*.34,0,1.18),'Chest'),
 (f'Forearm_{side}',(s*.34,0,1.18),(s*.48,-.015,.99),f'UpperArm_{side}'),
 (f'Hand_{side}',(s*.48,-.015,.99),(s*.54,-.025,.91),f'Forearm_{side}'),
 (f'Thigh_{side}',(s*.105,0,.88),(s*.105,-.005,.47),'Root'),
 (f'Shin_{side}',(s*.105,-.005,.47),(s*.105,0,.12),f'Thigh_{side}'),
 (f'Foot_{side}',(s*.105,0,.12),(s*.105,-.15,.065),f'Shin_{side}')])

def segment_distance(p,a,b):
 v=b-a
 return (p-(a+v*max(0,min(1,(p-a).dot(v)/v.length_squared)))).length

def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)))
 return t*t*(3-2*t)

for level in receipt['levels']:
 path=folder/level['file']
 original=backup/path.name
 if not original.exists():shutil.copy2(path,original)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(original))
 if any(o.type=='ARMATURE' for o in bpy.context.scene.objects):
  raise RuntimeError('Expected prebaked static LODs in .local/manual-assets/static-lods; do not rig an already skinned GLB twice')
 mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
 bpy.context.view_layer.objects.active=mesh
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 armdata=bpy.data.armatures.new('H01Skeleton');arm=bpy.data.objects.new('H01Rig',armdata)
 bpy.context.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm
 arm.select_set(True);mesh.select_set(False);bpy.ops.object.mode_set(mode='EDIT')
 for name,head,tail,parent in bones:
  bone=armdata.edit_bones.new(name);bone.head=head;bone.tail=tail
  if parent:bone.parent=armdata.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT')
 mesh.vertex_groups.clear()
 groups={name:mesh.vertex_groups.new(name=name) for name,*_ in bones}
 segments={name:(Vector(a),Vector(b)) for name,a,b,_ in bones}
 for v in mesh.data.vertices:
  p=v.co;x,y,z=p;side='L' if x>=0 else 'R';ax=abs(x)
  weights={}
  if z>1.49:
   h=smooth(1.49,1.57,z);weights={'Head':h,'Neck':1-h}
  elif z>.90:
   # Sleeves hang below their arm; assign their lateral fabric to the arm,
   # while avoiding long hair at the back and the central robe.
   arm_mix=smooth(.17,.30,ax)*(1-smooth(.12,.22,y))
   candidates=[f'UpperArm_{side}',f'Forearm_{side}',f'Hand_{side}']
   nearby=sorted(((segment_distance(p,*segments[n]),n) for n in candidates))[:2]
   inv=[1/max(.035,d)**3 for d,n in nearby];total=sum(inv)
   for (_,n),w in zip(nearby,inv):weights[n]=arm_mix*w/total
   torso='Chest' if z>1.22 else 'Spine'
   weights[torso]=1-arm_mix
  else:
   # Central skirt stays supported by pelvis; outer panels follow each leg
   # with reduced motion to prevent the single-layer robe tearing apart.
   leg_mix=smooth(.025,.12,ax)*(.48 if z>.17 else 1)
   candidates=[f'Thigh_{side}',f'Shin_{side}',f'Foot_{side}']
   nearby=sorted(((segment_distance(p,*segments[n]),n) for n in candidates))[:2]
   inv=[1/max(.04,d)**2 for d,n in nearby];total=sum(inv)
   for (_,n),w in zip(nearby,inv):weights[n]=leg_mix*w/total
   weights['Root']=1-leg_mix
  for name,w in weights.items():
   if w>.00001:groups[name].add([v.index],w,'REPLACE')
 modifier=mesh.modifiers.new('H01Skin','ARMATURE');modifier.object=arm;mesh.parent=arm
 scene=bpy.context.scene;scene.render.fps=30
 clips=[('Idle',60),('Run',24),('Attack',24),('Cast',30),('Dash',15)]
 for name,last in clips:
  arm.animation_data_create();action=bpy.data.actions.new(name);arm.animation_data.action=action
  for frame in range(0,last+1,3):
   t=frame/last;phase=t*math.tau
   for pb in arm.pose.bones:
    pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.location=(0,0,0)
   def rotate(bone,axis,angle):
    pb=arm.pose.bones[bone]
    local=pb.bone.matrix_local.to_quaternion().inverted() @ Vector(axis)
    pb.rotation_quaternion=Quaternion(local,angle)
   for side,s in [('L',1),('R',-1)]:
    rotate('UpperArm_'+side,(0,1,0),s*(.16+.025*math.sin(phase)))
    if name=='Run':
     swing=math.sin(phase)*s
     rotate('Thigh_'+side,(1,0,0),swing*.30)
     rotate('Shin_'+side,(1,0,0),-max(0,-swing)*.35)
     rotate('UpperArm_'+side,(1,0,0),-swing*.24)
     arm.pose.bones['Root'].location.z=.012*(1-math.cos(phase*2))
    elif name in ('Attack','Cast'):
     pulse=math.sin(math.pi*t)**2
     rotate('UpperArm_'+side,(1,0,0),(-.72 if name=='Cast' else -.55)*pulse*(1 if side=='R' else .6))
     rotate('Forearm_'+side,(0,1,0),-s*.20*pulse)
    elif name=='Dash':
     rotate('Thigh_'+side,(1,0,0),s*.25*math.sin(math.pi*t))
     rotate('Chest',(1,0,0),.14*math.sin(math.pi*t))
   if name=='Idle':rotate('Chest',(1,0,0),.012*math.sin(phase))
   for pb in arm.pose.bones:
    pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
    if pb.name=='Root':pb.keyframe_insert('location',frame=frame,group=pb.name)
  action.use_fake_user=True
  # One named NLA strip per clip lets the exporter preserve exact clip names.
  track=arm.animation_data.nla_tracks.new();track.name=name
  strip=track.strips.new(name,0,action);strip.action_frame_start=0;strip.action_frame_end=last
  track.mute=True
 arm.animation_data.action=None
 for pb in arm.pose.bones:pb.rotation_quaternion=Quaternion();pb.location=(0,0,0)
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);mesh.select_set(True)
 bpy.context.view_layer.objects.active=arm
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
  export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_all_influences=False)
 raw=path.read_bytes();level.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
 print('RIGGED',level['detail'],len(raw),flush=True)
receipt.update(rigged=True,animations=[n for n,_ in clips],skeletonBones=len(bones),
 scope='User-authorized animated trial. Actual skinned source mesh; locally authored clips. Conservative robe weights, no cloth simulation or separate anatomical meshes. Not final animation acceptance.')
(folder/'provenance.json').write_text(json.dumps(receipt,indent=2)+'\n')
shutil.copy2(folder/'h01-c0-high.glb',base/'assets/base_models/H01-C0_lam_dat_thanh_moc_y.glb')
