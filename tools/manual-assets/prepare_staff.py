"""Blender CPU LOD reduction and high-to-low PBR rebake of the user's mesh."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--source',required=True,type=Path)
parser.add_argument('--output',required=True,type=Path)
parser.add_argument('--detail',choices=['high','medium','low'],action='append')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.output.mkdir(parents=True,exist_ok=True)
receipt=args.output/'provenance.json'
old=json.loads(receipt.read_text()) if receipt.exists() else {}
levels={r['detail']:r for r in old.get('levels',[])}
for detail,budget in [('high',12000),('medium',4000),('low',800)]:
    if args.detail and detail not in args.detail:continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    if len(meshes)!=1:raise RuntimeError('Review multi-mesh source before reducing')
    source=meshes[0];bpy.context.view_layer.objects.active=source;source.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    points=[v.co.copy() for v in source.data.vertices]
    lo=Vector([min(v[i] for v in points) for i in range(3)])
    hi=Vector([max(v[i] for v in points) for i in range(3)])
    height=hi.z-lo.z
    if height<=0:raise RuntimeError('Invalid height')
    center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    for vertex in source.data.vertices:vertex.co=(vertex.co-center)*(2.0384/height)
    grip_slice=[v.co.copy() for v in source.data.vertices if abs(v.co.z-2.0384*.62)<.025]
    if not grip_slice:raise RuntimeError('Review staff axis: no geometry at the prescribed grip')
    grip_x=(min(v.x for v in grip_slice)+max(v.x for v in grip_slice))/2
    grip_y=(min(v.y for v in grip_slice)+max(v.y for v in grip_slice))/2
    diameter=max(max(v.x for v in grip_slice)-min(v.x for v in grip_slice),max(v.y for v in grip_slice)-min(v.y for v in grip_slice))
    transverse=.04/diameter
    for vertex in source.data.vertices:
        vertex.co.x=(vertex.co.x-grip_x)*transverse
        vertex.co.y=(vertex.co.y-grip_y)*transverse
    if source.data.has_custom_normals:bpy.ops.mesh.customdata_custom_splitnormals_clear()
    source.data.update()
    before=sum(len(p.vertices)-2 for p in source.data.polygons)
    obj=source.copy();obj.data=source.data.copy();bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    # Weld duplicate geometric vertices while keeping face-corner UV data on
    # the untouched high-poly source. The mobile mesh receives a fresh atlas.
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=0.00001);bpy.ops.object.mode_set(mode='OBJECT')
    total=sum(len(p.vertices)-2 for p in obj.data.polygons)
    modifier=obj.modifiers.new('AndroidStaffBudget','DECIMATE');modifier.ratio=min(1,budget/total)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    if obj.data.has_custom_normals:bpy.ops.mesh.customdata_custom_splitnormals_clear()
    for polygon in obj.data.polygons:polygon.use_smooth=True
    while obj.data.uv_layers:obj.data.uv_layers.remove(obj.data.uv_layers[0])
    obj.data.uv_layers.new(name='MobileBakedUV')
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.151917,island_margin=0.015)
    bpy.ops.object.mode_set(mode='OBJECT')
    material=bpy.data.materials.new('HunyuanBakedPBR');material.use_nodes=True
    nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
    shader=nodes.new('ShaderNodeBsdfPrincipled');output=nodes.new('ShaderNodeOutputMaterial');links.new(shader.outputs['BSDF'],output.inputs['Surface'])
    obj.data.materials.clear();obj.data.materials.append(material)
    for polygon in obj.data.polygons:polygon.material_index=0
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
    scene.cycles.use_denoising=False
    scene.render.bake.use_selected_to_active=True;scene.render.bake.use_clear=True;scene.render.bake.margin=8
    scene.render.bake.cage_extrusion=0.025;scene.render.bake.max_ray_distance=0.10
    scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
    resolution=1024 if detail=='high' else 512 if detail=='medium' else 256
    surfaces=[]
    for slot in source.material_slots:
        mat=slot.material
        out=next(n for n in mat.node_tree.nodes if n.type=='OUTPUT_MATERIAL')
        surfaces.append((mat,out,out.inputs['Surface'].links[0].from_socket))
    textures={}
    for channel,bake_type in [('albedo','EMIT'),('normal','NORMAL'),('roughness','ROUGHNESS'),('metallic','EMIT')]:
        image=bpy.data.images.new(f'{detail}_{channel}',width=resolution,height=resolution,alpha=False)
        image.colorspace_settings.name='sRGB' if channel=='albedo' else 'Non-Color'
        target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
        if channel=='normal':
            for mat,out,socket in surfaces:mat.node_tree.links.new(socket,out.inputs['Surface'])
        if channel in ['metallic','albedo']:
            for slot in source.material_slots:
                mat=slot.material
                bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
                out=next(n for n in mat.node_tree.nodes if n.type=='OUTPUT_MATERIAL')
                emission=mat.node_tree.nodes.new('ShaderNodeEmission')
                metallic=bsdf.inputs['Metallic' if channel=='metallic' else 'Base Color']
                if metallic.is_linked:mat.node_tree.links.new(metallic.links[0].from_socket,emission.inputs['Color'])
                else:emission.inputs['Color'].default_value=(metallic.default_value,)*3+(1,) if channel=='metallic' else metallic.default_value
                mat.node_tree.links.new(emission.outputs[0],out.inputs['Surface'])
        bpy.ops.object.select_all(action='DESELECT');source.select_set(True);obj.select_set(True);bpy.context.view_layer.objects.active=obj
        print(f'BAKE {detail} {channel}',flush=True)
        bpy.ops.object.bake(type=bake_type)
        image.pack();textures[channel]=target
    links.new(textures['albedo'].outputs['Color'],shader.inputs['Base Color'])
    normal=nodes.new('ShaderNodeNormalMap');links.new(textures['normal'].outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs['Normal'])
    links.new(textures['roughness'].outputs['Color'],shader.inputs['Roughness'])
    links.new(textures['metallic'].outputs['Color'],shader.inputs['Metallic'])
    length=2.0384
    for vertex in obj.data.vertices:vertex.co.z-=length*.62
    obj.name='MocTinhTruong_TexturedMesh'
    root=bpy.data.objects.new('Staff_Root',None);bpy.context.collection.objects.link(root);obj.parent=root
    bottom=min(v.co.z for v in obj.data.vertices)
    base_points=[v.co for v in obj.data.vertices if v.co.z<bottom+.002]
    base_tip=(sum(v.x for v in base_points)/len(base_points),sum(v.y for v in base_points)/len(base_points),bottom)
    for name,point in [('Staff_Base_Tip',base_tip),('Staff_Head_Core',(0,0,length*.32))]:
        node=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(node);node.parent=root;node.location=point
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);root.select_set(True)
    for child in root.children:child.select_set(True)
    bpy.context.view_layer.objects.active=obj
    target=args.output/f'h01-staff-{detail}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target.resolve()),export_format='GLB',export_extras=True,use_selection=True)
    levels[detail]={'detail':detail,'targetTriangles':budget,'triangles':sum(len(p.vertices)-2 for p in obj.data.polygons),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'file':target.name,'texturePreparation':'high-to-low selected-to-active PBR rebake','textureResolution':resolution}
    report={'assetId':'H01-W0','sourceShare':'https://3d.hunyuan.tencent.com/share?shareId=4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6','sourceSha256':hashlib.sha256(args.source.read_bytes()).hexdigest(),'sourceBytes':args.source.stat().st_size,'sourceTriangles':before,'lengthMeters':2.0384,'gripFractionFromBase':.62,'gripDiameterMeters':.04,'gripCenterCorrection':{'x':grip_x,'y':grip_y,'transverseScale':transverse},'nodes':['Staff_Root','Staff_Base_Tip','Staff_Head_Core'],'scope':'Reduced user-shared Hunyuan staff with high-to-low PBR rebake. No primitive replacement.','levels':[levels[k] for k in ['high','medium','low'] if k in levels]}
    receipt.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(levels[detail]),flush=True)
