"""Open verified source robe/boot junction edges below the knee inspection crop.

This is an unapproved source pattern proposal. It retains every original face,
does not cut the waistband, and does not fabricate the body under the robe.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from coat_cut_topology import corner_components
from verify_cut_fans import reconstruct


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('raw',type=Path);parser.add_argument('base',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--boot-selection',type=Path);args=parser.parse_args()
    assert args.output.resolve() not in [args.raw.resolve(),args.base.resolve()]
    plan=json.loads((args.base/'cut-plan.json').read_text())
    for name,entry in plan['files'].items():assert sha(args.base/name)==entry['sha256']
    p=np.fromfile(args.raw/'positions.bin','<f4').reshape(-1,3);tri=np.fromfile(args.raw/'triangles.bin','<u4').reshape(-1,3);weld=np.fromfile(args.raw/'source-welds.u32bin','<u4')
    roles=np.fromfile(args.base/'face-roles.u8bin','u1');protected=np.fromfile(args.raw/'protected.bin','u1');assert len(roles)==len(tri)
    t=weld[tri];edge=np.sort(np.concatenate([t[:,[0,1]],t[:,[1,2]],t[:,[2,0]]]),axis=1);face=np.tile(np.arange(len(t)),3)
    good=edge[:,0]!=edge[:,1];edge,face=edge[good],face[good];keys=edge[:,0].astype(np.uint64)*np.uint64(len(weld))+edge[:,1]
    order=np.argsort(keys,kind='stable');edge,face,keys=edge[order],face[order],keys[order];start=np.r_[0,np.flatnonzero(keys[1:]!=keys[:-1])+1];count=np.diff(np.r_[start,len(keys)])
    pair=start[count==2];a,b=roles[face[pair]],roles[face[pair+1]];centres=p[edge[pair]].mean(1)
    touching=((a==0)&np.isin(b,[1,2]))|((b==0)&np.isin(a,[1,2]));selected=touching&(centres[:,1]<.5)
    ownership=[];boot_proof=None;additional_lining=[]
    if args.boot_selection:
        selection=json.loads(args.boot_selection.read_text());assert selection['sourceSha256']==plan['sourceSha256']
        _,rep,inverse=np.unique(weld,return_index=True,return_inverse=True);rt=inverse[tri[roles==0]]
        edges=np.concatenate([rt[:,[0,1]],rt[:,[1,2]],rt[:,[2,0]]]);graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(rep),len(rep))).tocsr();_,component=connected_components(graph,directed=False)
        boot_components={}
        for side in ['Left','Right']:
            ids=selection['sides'][side]['soleVertexIds'];assert len(ids)>0
            group=np.unique(component[inverse[ids]]);assert len(group)==1
            boot_components[side]=int(group[0])
        assert boot_components['Left']!=boot_components['Right']
        zero_face=np.where(a==0,face[pair],face[pair+1]);other=np.where(a==0,b,a);face_component=component[inverse[tri[:,0]]];at=face_component[zero_face]
        for group in np.unique(at[selected]):
            if group in boot_components.values():continue
            adjacent=np.unique(other[selected&(at==group)]);assert len(adjacent)==1 and adjacent[0] in [1,2],'Ambiguous fabric patch ownership'
            faces=np.flatnonzero((roles==0)&(face_component==group));vertices=np.unique(tri[faces]);assert len(faces)<=100 and not protected[vertices].any()
            assert p[vertices,1].min()>.1 and p[vertices,1].max()<.5,'Unexpected remaining fabric patch'
            roles[faces]=adjacent[0];additional_lining.extend(faces.tolist());ownership.append({'component':int(group),'sourceFaces':faces.tolist(),'ownerRole':int(adjacent[0]),'sourceBounds':[p[vertices].min(0).tolist(),p[vertices].max(0).tolist()]})
        selected&=np.isin(at,list(boot_components.values()))
        boot_proof={'selection':str(args.boot_selection),'sha256':sha(args.boot_selection),'components':boot_components,'method':'Original remaining-source triangle connectivity to actual graph-selected sole IDs, not colour or spatial proximity'}
    extra=edge[pair[selected]];assert len(extra)>0 and not protected[extra].any();old=np.fromfile(args.base/'cut-edges.u32bin','<u4').reshape(-1,2)
    cuts=np.unique(np.concatenate([old,extra]),axis=0).astype(np.uint32);assert len(cuts)==len(old)+len(extra),'Overlapping cut proposal'
    corners,diagnostic=corner_components(tri,weld,cuts);oracle=reconstruct(tri,weld,cuts);assert np.array_equal(corners,oracle),'Independent source corner graph disagrees'
    args.output.mkdir(parents=True,exist_ok=True)
    for name,values in [('cut-edges.u32bin',cuts.astype('<u4')),('corner-components.u32bin',corners.astype('<u4')),('face-roles.u8bin',roles)]:values.tofile(args.output/name)
    plan.update({'previousPlan':str(args.base/'cut-plan.json'),'previousPlanSha256':sha(args.base/'cut-plan.json'),
        'operation':'Retain original sleeve cuts; detach lower robe from residual source boot/body junctions below500mm. Waist, upper torso and source faces unchanged. No leg or body surface invented.',
        'diagnostics':diagnostic,'additionalLowerJunctionEdges':len(extra),'additionalBounds':[centres[selected].min(0).tolist(),centres[selected].max(0).tolist()],
        'bootConnectivityProof':boot_proof,'repartition':bool(ownership),'ownershipCorrections':ownership,'additionalLiningFaces':additional_lining,
        'independentCornerGraphPassed':True,'sourceInputs':{name:{'file':str(args.raw/name),'sha256':sha(args.raw/name)}for name in ['positions.bin','triangles.bin','source-welds.u32bin','protected.bin']},
        'files':{name:{'sha256':sha(args.output/name),'bytes':(args.output/name).stat().st_size}for name in ['cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin']},
        'patternApproved':False,'accepted':False,'activated':False})
    (args.output/'cut-plan.json').write_text(json.dumps(plan,indent=2)+'\n');print(json.dumps({'cutEdges':len(cuts),'additionalLowerJunctionEdges':len(extra),'independentCornerGraphPassed':True,'accepted':False}))


if __name__=='__main__':main()
