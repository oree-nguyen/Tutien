"""CPU Blender asset build: source/demo -> triangulated high/medium/low GLB + preview."""
import argparse, json, math, sys
from pathlib import Path
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--preview', action='store_true')
parser.add_argument('--demo', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color, metal=0.0, rough=0.5, glow=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    n=m.node_tree.nodes; bs=n.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal
    bs.inputs['Roughness'].default_value=rough
    if glow:
        bs.inputs['Emission Color'].default_value=(*color,1)
        bs.inputs['Emission Strength'].default_value=glow
    return m

def finish(obj, name, mat):
    obj.name=name; obj.data.materials.append(mat)
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def tube(name, points, radius, mat, radial=16):
    verts=[]; faces=[]; tangent=Vector((0,0,1))
    for i,p in enumerate(points):
        tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])).normalized()
        side=tangent.cross(Vector((0,1,0)))
        if side.length < .01: side=tangent.cross(Vector((1,0,0)))
        side.normalize(); up=tangent.cross(side).normalized()
        for j in range(radial):
            a=2*math.pi*j/radial; r=radius*(1-.35*i/len(points))
            verts.append(Vector(p)+r*(math.cos(a)*side+math.sin(a)*up))
        if i:
            for j in range(radial):
                a=(i-1)*radial+j;b=(i-1)*radial+(j+1)%radial
                c=i*radial+(j+1)%radial;d=i*radial+j
                faces.append((a,b,c,d))
    faces.extend([tuple(reversed(range(radial))),tuple((len(points)-1)*radial+j for j in range(radial))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return finish(obj,name,mat)

def demo():
    wood=material('Ancient jade wood',(.045,.17,.12),.15,.5)
    gold=material('Engraved bronze',(.53,.31,.095),.85,.28)
    jade=material('Soul jade',(.13,.72,.45),.25,.22,1.2)
    leaf=material('Leaf enamel',(.06,.29,.14),.35,.4)
    tube('Tapered carved shaft',[(0,0,i/95*2.8) for i in range(96)],.055,wood,64)
    for winding in range(3):
        pts=[]
        for i in range(193):
            t=i/192; a=t*math.pi*8+winding*2*math.pi/3
            pts.append((.075*math.cos(a),.075*math.sin(a),.15+t*2.58))
        tube('Spiral vine '+str(winding),pts,.012,gold,24)
    for i,z in enumerate([.1,.32,1.1,1.18,2.55,2.7]):
        bpy.ops.mesh.primitive_torus_add(major_segments=128,minor_segments=24,major_radius=.068,minor_radius=.009,location=(0,0,z))
        finish(bpy.context.object,'Bronze collar '+str(i),gold)
    for k in range(3):
        a=k*2*math.pi/3
        pts=[]
        for i in range(129):
            t=i/128; r=.045+.25*math.sin(math.pi*t)
            pts.append((r*math.cos(a+.7*t),r*math.sin(a+.7*t),2.65+.65*t))
        tube('Crown vine '+str(k),pts,.024,wood,32)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128,ring_count=64,radius=.18,location=(0,0,3.03))
    finish(bpy.context.object,'Soul core',jade).scale=(.8,.8,1.35)
    for k in range(12):
        a=k*2*math.pi/6;z=2.6+(k//6)*.22
        pts=[(.1*math.cos(a),.1*math.sin(a),z),(.3*math.cos(a),.3*math.sin(a),z+.15),(.38*math.cos(a+.2),.38*math.sin(a+.2),z+.36)]
        o=tube('Enamel leaf '+str(k),pts,.035,leaf,32)
        o.scale.y=.45

if args.demo:
    demo()
elif args.input:
    source=args.input.resolve()
    if source.suffix.lower()=='.blend':
        bpy.ops.wm.open_mainfile(filepath=str(source))
    elif source.suffix.lower() in ['.glb','.gltf']:
        bpy.ops.import_scene.gltf(filepath=str(source))
    else:raise ValueError('Input must be .blend, .glb or .gltf')
else:raise ValueError('Use --demo or --input')

# Apply mesh modifiers and transforms once, preserving PBR slots and UV/vertex colors.
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise ValueError('No mesh objects to export')
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.convert(target='MESH')
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
bpy.ops.object.join();root=bpy.context.object;root.name='HonGioi_Asset'
tri=root.modifiers.new('Triangulate source','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=tri.name)
source_mesh=root.data.copy()
source_triangles=len(root.data.polygons)
if not source_triangles:raise ValueError('No triangles')
report={'tool':'Blender','version':bpy.app.version_string,'device':'CPU','origin':'procedural demonstration' if args.demo else str(args.input),'sourceTriangles':source_triangles,'lods':{}}
for name,budget in [('high',source_triangles),('medium',12000),('low',2500)]:
    root.data=source_mesh.copy()
    if source_triangles>budget:
        mod=root.modifiers.new('LOD budget','DECIMATE');mod.ratio=budget/source_triangles
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=root.modifiers.new('LOD triangulate','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)
    path=out/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
    report['lods'][name]={'triangles':len(root.data.polygons),'vertices':len(root.data.vertices),'bytes':path.stat().st_size,'file':path.name}
root.data=source_mesh.copy()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'source.blend'))
if args.preview:
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False
    scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    world=bpy.data.worlds.new('Studio');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.045,.065,.08,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.5;scene.world=world
    center=sum((root.matrix_world@Vector(c) for c in root.bound_box),Vector())/8
    extent=max((root.matrix_world@Vector(c)-center).length for c in root.bound_box)
    for pos,power,size in [((3,-4,6),650,4),((-4,-1,3),450,3),((1,3,4),800,3)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(pos)*extent/2)
        l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(center-l.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=center+Vector((1.8,-4.5,1))*extent)
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=extent*2.5;scene.camera=camera
    scene.render.filepath=str(out/'preview.png');bpy.ops.render.render(write_still=True)
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('ASSET_PIPELINE_COMPLETE '+json.dumps(report))
