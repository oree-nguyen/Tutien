"""Transfer actual low-resolution surface weights to the unchanged source mesh.
Writes only a position/weight table; never exports or overwrites source geometry.
"""
import argparse, json, sys
from pathlib import Path
import bpy
import numpy as np

parser=argparse.ArgumentParser()
parser.add_argument('--source',required=True);parser.add_argument('--donor',required=True);parser.add_argument('--output',required=True);parser.add_argument('--names',required=True)
a=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
names=json.loads(Path(a.names).read_text());name_index={n:i for i,n in enumerate(names)}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(a.donor).resolve()))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');arm.data.pose_position='REST'
donor=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.update()
old=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=str(Path(a.source).resolve()))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o not in old)
for n in names:source.vertex_groups.new(name=n)
bpy.context.view_layer.objects.active=source
modifier=source.modifiers.new('SurfaceWeightTransfer','DATA_TRANSFER');modifier.object=donor
modifier.use_vert_data=True;modifier.data_types_verts={'VGROUP_WEIGHTS'};modifier.vert_mapping='POLYINTERP_NEAREST'
modifier.layers_vgroup_select_src='ALL';modifier.layers_vgroup_select_dst='NAME'
bpy.ops.object.modifier_apply(modifier=modifier.name)
array=np.zeros(len(source.data.vertices),dtype=[('p','<f4',(3,)),('j','u1',(4,)),('w','<f4',(4,))])
missing=0;max_error=0.;max_influences=0
for i,vertex in enumerate(source.data.vertices):
 p=source.matrix_world@vertex.co
 array['p'][i]=(p.x,p.z,-p.y)
 weights=sorted([(g.weight,name_index[source.vertex_groups[g.group].name]) for g in vertex.groups if g.weight>1e-8 and source.vertex_groups[g.group].name in name_index],reverse=True)[:4]
 total=sum(w for w,j in weights)
 if total<=1e-10:missing+=1;continue
 for k,(w,j) in enumerate(weights):array['j'][i,k]=j;array['w'][i,k]=w/total
 max_influences=max(max_influences,len(weights));max_error=max(max_error,abs(float(array['w'][i].sum())-1))
if missing:raise RuntimeError(f'{missing} source vertices have no skin weights; output rejected')
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);array.tofile(out)
out.with_suffix('.json').write_text(json.dumps({'source':a.source,'donor':a.donor,'vertexCount':len(array),'recordBytes':32,'jointNames':names,'missingWeights':missing,'maxInfluences':max_influences,'maxWeightSumError':max_error,'method':'Blender DataTransfer POLYINTERP_NEAREST; four largest influences, normalized; source geometry never exported'},indent=2))
print(f'WEIGHT TABLE: {len(array)} vertices, max {max_influences} influences, error {max_error}',flush=True)
