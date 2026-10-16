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
bones=[('Hips',(0,0,.85),(0,0,.97),None),
 ('Spine',(0,0,.97),(0,0,1.12),'Hips'),('Spine1',(0,0,1.12),(0,0,1.28),'Spine'),
 ('Spine2',(0,0,1.28),(0,0,1.44),'Spine1'),
 ('Neck',(0,0,1.44),(0,0,1.54),'Spine2'),('Head',(0,0,1.54),(0,0,1.76),'Neck')]
# Reviewed landmarks on the actual H01 A-pose (Blender Z up, front -Y).
# Each finger is a real deforming chain; no decorative empty bone placeholders.
fingers={
 'Thumb':[(-.529,1.003,.113),(-.558,1.024,.127),(-.583,1.019,.13),(-.604,1.017,.13)],
 'Index':[(-.548,.983,.115),(-.587,.957,.137),(-.611,.941,.143),(-.631,.934,.143)],
 'Middle':[(-.543,.962,.118),(-.578,.926,.144),(-.600,.906,.15),(-.612,.894,.15)],
 'Ring':[(-.528,.947,.119),(-.557,.912,.145),(-.572,.894,.15),(-.579,.883,.15)],
 'Pinky':[(-.510,.938,.115),(-.528,.915,.137),(-.538,.901,.14),(-.544,.889,.14)]}
for side,short,sgn in [('Left','L',1),('Right','R',-1)]:
 bones.extend([(side+'Shoulder',(sgn*.08,0,1.41),(sgn*.17,0,1.40),'Spine2'),
 (side+'Arm',(sgn*.17,0,1.40),(sgn*.34,-.03,1.19),side+'Shoulder'),
 (side+'ForeArm',(sgn*.34,-.03,1.19),(sgn*.49,-.09,1.025),side+'Arm'),
 (side+'Hand',(sgn*.49,-.09,1.025),(sgn*.55,-.12,.972),side+'ForeArm'),
 (side+'UpLeg',(sgn*.105,0,.88),(sgn*.105,-.005,.47),'Hips'),
 (side+'Leg',(sgn*.105,-.005,.47),(sgn*.105,0,.12),side+'UpLeg'),
 (side+'Foot',(sgn*.105,0,.12),(sgn*.105,-.12,.065),side+'Leg'),
 (side+'ToeBase',(sgn*.105,-.12,.065),(sgn*.105,-.18,.055),side+'Foot')])
 for finger,points in fingers.items():
  points=[(-sgn*x,-z,y) for x,y,z in points]
  for j in range(3):bones.append((side+'Hand'+finger+str(j+1),points[j],points[j+1],side+'Hand' if j==0 else side+'Hand'+finger+str(j)))

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
  p=v.co;x,y,z=p;side='Left' if x>=0 else 'Right';ax=abs(x)
  weights={}
  if z>1.49:
   h=smooth(1.49,1.57,z);weights={'Head':h,'Neck':1-h}
  elif z>.90:
   # Sleeves hang below their arm; assign their lateral fabric to the arm,
   # while avoiding long hair at the back and the central robe.
   arm_mix=smooth(.17,.30,ax)*(1-smooth(.12,.22,y))
   candidates=[side+'Arm',side+'ForeArm',side+'Hand']
   nearby=sorted(((segment_distance(p,*segments[n]),n) for n in candidates))[:2]
   inv=[1/max(.035,d)**3 for d,n in nearby];total=sum(inv)
   for (_,n),w in zip(nearby,inv):weights[n]=arm_mix*w/total
   torso='Spine2' if z>1.28 else 'Spine1' if z>1.12 else 'Spine'
   weights[torso]=1-arm_mix
  else:
   # Central skirt stays supported by pelvis; outer panels follow each leg
   # with reduced motion to prevent the single-layer robe tearing apart.
   leg_mix=smooth(.025,.12,ax)*(.48 if z>.17 else 1)
   candidates=[side+'UpLeg',side+'Leg',side+'Foot']
   nearby=sorted(((segment_distance(p,*segments[n]),n) for n in candidates))[:2]
   inv=[1/max(.04,d)**2 for d,n in nearby];total=sum(inv)
   for (_,n),w in zip(nearby,inv):weights[n]=leg_mix*w/total
   weights['Hips']=1-leg_mix
  if z<.15 and y<-.08:
   toe=1-smooth(-.16,-.08,y)
   weights={n:w*(1-toe) for n,w in weights.items()}
   weights[side+'ToeBase']=toe
  if ax>.50 and .87<z<1.065 and -.20<y<-.045:
   candidates=[n for n in segments if n.startswith(side+'Hand') and n!=side+'Hand']
   nearby=sorted((segment_distance(p,*segments[n]),n) for n in candidates)[:2]
   blend=1-smooth(.012,.03,nearby[0][0])
   if blend>0:
    weights={n:w*(1-blend) for n,w in weights.items()}
    inv=[1/max(.004,d)**3 for d,n in nearby];total=sum(inv)
    for (_,n),w in zip(nearby,inv):weights[n]=weights.get(n,0)+blend*w/total
  for name,w in weights.items():
   if w>.00001:groups[name].add([v.index],w,'REPLACE')
 modifier=mesh.modifiers.new('H01Skin','ARMATURE');modifier.object=arm;mesh.parent=arm
 socket=bpy.data.objects.new('RightHand_WeaponSocket',None);bpy.context.collection.objects.link(socket)
 socket.parent=arm;socket.parent_type='BONE';socket.parent_bone='RightHand'
 # Blender bone parenting starts at the tail. Offset into the palm, toward its front.
 hand=armdata.bones['RightHand']
 socket.location=(.0,-.025,-.025)

 scene=bpy.context.scene;scene.render.fps=60
 clips=[('Idle',120),('Run',48),('Attack',48),('Cast',60),('Dash',30),('Entrance',252)]
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
   for side,s in [('Left',1),('Right',-1)]:
    rotate(side+'Arm',(0,1,0),s*(.16+.025*math.sin(phase)))
    if name=='Run':
     swing=math.sin(phase)*s
     rotate(side+'UpLeg',(1,0,0),swing*.30)
     rotate(side+'Leg',(1,0,0),-max(0,-swing)*.35)
     rotate(side+'Arm',(1,0,0),-swing*.24)
     arm.pose.bones['Hips'].location.y=.012*(1-math.cos(phase*2))
    elif name in ('Attack','Cast'):
     pulse=math.sin(math.pi*t)**2
     rotate(side+'Arm',(1,0,0),(-.72 if name=='Cast' else -.55)*pulse*(1 if side=='Right' else .6))
     rotate(side+'ForeArm',(0,1,0),-s*.20*pulse)
    elif name=='Dash':
     rotate(side+'UpLeg',(1,0,0),s*.25*math.sin(math.pi*t))
     rotate('Spine2',(1,0,0),.14*math.sin(math.pi*t))
   if name=='Idle':rotate('Spine2',(1,0,0),.012*math.sin(phase))
   seconds=frame/60
   if name=='Entrance':
    crouch=1-smooth(2.45,2.95,seconds)
    emerge=smooth(.75,1.28,seconds)
    arm.pose.bones['Hips'].location.y=-.69*crouch-1.6*(1-emerge)
    arm.pose.bones['Hips'].location.z=-.08*crouch
    rotate('Hips',(1,0,0),math.radians(12)*crouch)
    rotate('Spine',(1,0,0),math.radians(55)*crouch)
    rotate('Head',(1,0,0),math.radians(-62)*crouch*smooth(1.5,1.85,seconds))
    for side,sgn in [('Left',1),('Right',-1)]:
     rotate(side+'UpLeg',(1,0,0),-math.radians(85)*crouch)
     rotate(side+'Leg',(1,0,0),math.radians(120)*crouch)
     rotate(side+'Foot',(1,0,0),-math.radians(47)*crouch)
   for finger in fingers:
    for j,angle in enumerate(([48,48,25] if finger=='Thumb' else [70,75,45])):
     bone='RightHand'+finger+str(j+1)
     axis=(armdata.bones[bone].tail_local-armdata.bones[bone].head_local).cross(Vector((0,-1,0))).normalized()
     grip=smooth(3.0,3.05,seconds) if name=='Entrance' else 1
     rotate(bone,axis,math.radians(angle)*grip)

   for pb in arm.pose.bones:
    pb.keyframe_insert('rotation_quaternion',frame=frame,group=pb.name)
    if pb.name=='Hips':pb.keyframe_insert('location',frame=frame,group=pb.name)
  action.use_fake_user=True
  # One named NLA strip per clip lets the exporter preserve exact clip names.
  track=arm.animation_data.nla_tracks.new();track.name=name
  strip=track.strips.new(name,0,action);strip.action_frame_start=0;strip.action_frame_end=last
  track.mute=True
 arm.animation_data.action=None
 for pb in arm.pose.bones:pb.rotation_quaternion=Quaternion();pb.location=(0,0,0)
 bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);mesh.select_set(True);socket.select_set(True)
 bpy.context.view_layer.objects.active=arm
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
  export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_all_influences=False)
 raw=path.read_bytes();level.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
 print('RIGGED',level['detail'],len(raw),flush=True)
receipt.update(rigged=True,animations=[n for n,_ in clips],skeletonBones=len(bones),
 scope='User-authorized animated trial. Actual skinned source mesh; locally authored clips. Humanoid finger skinning and entrance clip, no cloth simulation or separate anatomical meshes. Not final animation acceptance.')
(folder/'provenance.json').write_text(json.dumps(receipt,indent=2)+'\n')
shutil.copy2(folder/'h01-c0-high.glb',base/'assets/base_models/H01-C0_lam_dat_thanh_moc_y.glb')
