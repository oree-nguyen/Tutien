"""Propose shorter source-edge sleeve cuts inside a bounded surface band.

This changes face ownership only, retaining every source face/UV. Integer
source-dual min-cut removes small boundary detours without spatial stitching.
The result is staging, never an approved tailoring pattern.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra,maximum_flow,breadth_first_order
from coat_cut_topology import corner_components


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('base',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--band',type=float,default=.025);args=parser.parse_args()
    assert 0<args.band<=.05 and args.base.resolve()!=args.output.resolve()
    raw=Path('.local/rig-candidates/semantic-garment-v6');plan=json.loads((args.base/'cut-plan.json').read_text());args.output.mkdir(parents=True,exist_ok=True)
    p=np.fromfile(raw/'positions.bin','<f4').reshape(-1,3);tri=np.fromfile(raw/'triangles.bin','<u4').reshape(-1,3);weld=np.fromfile(raw/'source-welds.u32bin','<u4')
    roles=np.fromfile(args.base/'face-roles.u8bin','u1');original=roles.copy();t=weld[tri]
    edge=np.sort(np.concatenate([t[:,[0,1]],t[:,[1,2]],t[:,[2,0]]]),axis=1);face=np.tile(np.arange(len(t)),3);valid=edge[:,0]!=edge[:,1];edge,face=edge[valid],face[valid]
    keys=edge[:,0].astype(np.uint64)*len(weld)+edge[:,1];order=np.argsort(keys,kind='stable');edge,face,keys=edge[order],face[order],keys[order]
    start=np.r_[0,np.flatnonzero(keys[1:]!=keys[:-1])+1];counts=np.diff(np.r_[start,len(keys)]);assert counts.max()==2;pair=start[counts==2]
    a,b=face[pair],face[pair+1];centers=p[tri].mean(1);length=np.linalg.norm(p[edge[pair,0]]-p[edge[pair,1]],axis=1)
    areas=np.linalg.norm(np.cross(p[tri[:,1]]-p[tri[:,0]],p[tri[:,2]]-p[tri[:,0]]),axis=1)*.5;reports=[]
    for lower,sleeve,sign in [(1,4,1),(2,5,-1)]:
        domain=((roles==lower)|(roles==sleeve))&(centers[:,0]*sign>.14)&(centers[:,0]*sign<.40)&(centers[:,1]>.56)&(centers[:,1]<.99)
        chosen=np.flatnonzero(domain);lookup=np.full(len(t),-1,dtype=np.int32);lookup[chosen]=np.arange(len(chosen));both=domain[a]&domain[b]
        aa,bb=lookup[a[both]],lookup[b[both]];dist=np.maximum(1e-10,np.linalg.norm(centers[a[both]]-centers[b[both]],axis=1))
        graph=coo_matrix((np.r_[dist,dist],(np.r_[aa,bb],np.r_[bb,aa])),shape=(len(chosen),len(chosen))).tocsr()
        border=roles[a[both]]!=roles[b[both]];seed=np.unique(np.r_[aa[border],bb[border]])
        proximity=dijkstra(graph,indices=seed,directed=False,min_only=True);editable=proximity<=args.band
        desired=roles[chosen]==sleeve;capacity=np.maximum(1,np.round(length[both]*1e6)).astype(np.int64)
        area_cost=np.maximum(1,np.round(areas[chosen]/args.band*1e6)).astype(np.int64);infinite=int(capacity.sum()*2+area_cost.sum()+1)
        assert infinite<2**31, 'Integer max-flow capacities must fit the solver range'
        # Source side means sleeve; terminals charge changes to original labels.
        source=len(chosen);sink=source+1;node=np.arange(len(chosen))
        source_cost=np.where(desired,area_cost,0);sink_cost=np.where(desired,0,area_cost)
        source_cost[~editable&desired]=infinite;sink_cost[~editable&~desired]=infinite
        network=coo_matrix((np.r_[capacity,capacity,source_cost,sink_cost],(np.r_[aa,bb,np.full(len(node),source),node],np.r_[bb,aa,node,np.full(len(node),sink)])),shape=(sink+1,sink+1)).tocsr()
        flow=maximum_flow(network,source,sink);residual=network-flow.flow;residual.data=(residual.data>0).astype(np.int64);residual.eliminate_zeros()
        reachable=breadth_first_order(residual,source,directed=True,return_predecessors=False);result=np.zeros(len(chosen),bool);result[reachable[reachable<len(chosen)]]=True
        assert np.array_equal(result[~editable],desired[~editable]);roles[chosen]=np.where(result,sleeve,lower)
        reports.append({'lower':lower,'sleeve':sleeve,'bandMetres':args.band,'editableFaces':int(editable.sum()),'changedFaces':int((result!=desired).sum()),'flowCapacity':int(flow.flow_value)})
    la,lb=roles[a],roles[b];cut=((la==1)&(lb==4))|((la==4)&(lb==1))|((la==2)&(lb==5))|((la==5)&(lb==2));cuts=edge[pair[cut]]
    protected=np.fromfile(raw/'protected.bin','u1');assert not protected[cuts].any();corners,diagnostic=corner_components(tri,weld,cuts)
    for name,values in [('cut-edges.u32bin',cuts.astype('<u4')),('corner-components.u32bin',corners.astype('<u4')),('face-roles.u8bin',roles)]:values.tofile(args.output/name)
    plan.update({'previousPlan':str(args.base/'cut-plan.json'),'previousPlanSha256':hashlib.sha256((args.base/'cut-plan.json').read_bytes()).hexdigest(),'operation':'Bounded source-dual length/area Potts cut smoothing, source face ownership only; no geometry/texture synthesis','diagnostics':diagnostic,'smoothing':reports,'changedFaces':int((roles!=original).sum()),'patternApproved':False,'accepted':False,'activated':False,
        'files':{name:{'sha256':hashlib.sha256((args.output/name).read_bytes()).hexdigest(),'bytes':(args.output/name).stat().st_size}for name in ['cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin']}})
    plan['bounds']=[p[cuts].mean(1).min(0).tolist(),p[cuts].mean(1).max(0).tolist()];plan['leftEdges']=int((p[cuts].mean(1)[:,0]>0).sum());plan['rightEdges']=int((p[cuts].mean(1)[:,0]<0).sum())
    (args.output/'cut-plan.json').write_text(json.dumps(plan,indent=2)+'\n');print(json.dumps({'cutEdges':len(cuts),'changedFaces':plan['changedFaces'],'smoothing':reports,'accepted':False}))


if __name__=='__main__':main()
