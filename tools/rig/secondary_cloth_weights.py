"""Secondary cloth weights on exact source-corner fans, never spatial welds.

Protected hands and fans touching any non-panel primitive remain immutable.
The actual source-edge distance to this boundary blends back to old weights.
"""
import hashlib,json,sys,time
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from source_garment_graph import sparsify_four_influences

def smooth(t):
    t=np.clip(t,0,1);return t*t*(3-2*t)

def main():
    directory=Path(sys.argv[1]);meta=json.loads((directory/'input.json').read_text());started=time.monotonic()
    for name,digest in meta['files'].items():assert hashlib.sha256((directory/name).read_bytes()).hexdigest()==digest
    points=np.fromfile(directory/'positions.f32bin','<f4').reshape(-1,3);fans=np.fromfile(directory/'fans.u32bin','<u4');roles=np.fromfile(directory/'roles.u8bin','u1');triangles=np.fromfile(directory/'triangles.u32bin','<u4').reshape(-1,3)
    ids=np.fromfile(directory/'ids.u16bin','<u2').reshape(-1,4);weights=np.fromfile(directory/'weights.f32bin','<f4').reshape(-1,4);protected=np.fromfile(directory/'protected.u8bin','u1').astype(bool)
    unique,reps,inverse=np.unique(fans,return_index=True,return_inverse=True);p=points[reps].astype(float);tri=inverse[triangles];n=len(p)
    dense=np.zeros((n,meta['skeleton']['jointCount']));counts=np.bincount(inverse)
    for k in range(4):np.add.at(dense,(inverse,ids[:,k]),weights[:,k])
    dense/=counts[:,None]
    core_dense=dense.copy();free=np.ones(n,bool);np.logical_and.at(free,inverse,(roles>0)&~protected)
    edges=np.unique(np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1),axis=0);edges=edges[edges[:,0]!=edges[:,1]]
    boundary=np.zeros(n,bool);cross=free[edges[:,0]]!=free[edges[:,1]];boundary[edges[cross].ravel()]=True
    # The one-ring of protected hands is hard-pinned, including UV fan copies.
    group_protected=np.zeros(n,bool);np.logical_or.at(group_protected,inverse,protected);ring=group_protected.copy()
    np.logical_or.at(ring,edges[:,0],group_protected[edges[:,1]]);np.logical_or.at(ring,edges[:,1],group_protected[edges[:,0]]);free[ring]=False
    cross=free[edges[:,0]]!=free[edges[:,1]];boundary[edges[cross].ravel()]=True
    length=np.maximum(np.linalg.norm(p[edges[:,0]]-p[edges[:,1]],axis=1),1e-12)
    graph=coo_matrix((np.r_[length,length],(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(n,n)).tocsr()
    assert boundary.any();distance=dijkstra(graph,indices=np.flatnonzero(boundary),min_only=True,directed=False)
    config=meta['config'];alpha=smooth(distance/config['transitionMetres'])*smooth((config['waistFade'][1]-p[:,1])/(config['waistFade'][1]-config['waistFade'][0]));alpha[~free]=0
    # Separate source front/back directions smoothly. A control bone is not a
    # substitute model, and no source surface is generated or removed here.
    back=smooth((.03-p[:,2])/.06);front=1-back;group_role=roles[reps]
    cloth=np.zeros_like(dense)
    for chain in config['chains']:
        selected=group_role==chain['role'];amount=front if chain['sign']==1 else back
        coordinate=np.clip((chain['anchor'][1]-p[:,1])/chain['spacing'],0,chain['rows']-1);lower=np.floor(coordinate).astype(int);upper=np.minimum(lower+1,chain['rows']-1);fraction=coordinate-lower
        joint_ids=np.array([next(r['index']for r in meta['skeleton']['records']if r['chain']==chain['name']and r['row']==i)for i in range(chain['rows'])])
        row=np.flatnonzero(selected);np.add.at(cloth,(row,joint_ids[lower[row]]),amount[row]*(1-fraction[row]));np.add.at(cloth,(row,joint_ids[upper[row]]),amount[row]*fraction[row])
    assert np.max(np.abs(cloth[free].sum(1)-1))<1e-12
    dense=core_dense*(1-alpha[:,None])+cloth*alpha[:,None];top,new_weights,discarded=sparsify_four_influences(dense)
    changed=(alpha[inverse]>0)&~protected;out_ids=ids.copy();out_weights=weights.copy();out_ids[changed]=top[inverse[changed]];out_weights[changed]=new_weights[inverse[changed]]
    assert np.array_equal(out_ids[protected],ids[protected])and np.array_equal(out_weights[protected],weights[protected]);assert np.isfinite(out_weights).all()and out_weights.min()>=0 and np.max(np.abs(out_weights.sum(1)-1))<1e-5
    out_ids.astype('<u2').tofile(directory/'result-ids.u16bin');out_weights.astype('<f4').tofile(directory/'result-weights.f32bin');changed.astype('u1').tofile(directory/'changed.u8bin')
    report={'inputSha256':meta['inputSha256'],'freeFans':int(free.sum()),'changedCopies':int(changed.sum()),'protectedCopies':int(protected.sum()),'maximumDiscardedInfluence':float(discarded.max()),'seconds':time.monotonic()-started,'accepted':False,
        'scope':'Secondary cloth skin-support experiment only. Exact source fans, protected hands and source-edge boundary fade; floor/strain/sections/collision and full animation must be measured independently.'}
    (directory/'solve.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

if __name__=='__main__':main()
