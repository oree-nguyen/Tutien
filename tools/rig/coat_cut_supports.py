"""Solve garment support fields on explicit cut source fans, never nearby XYZ."""
import argparse
import hashlib
import json
import time
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix,diags
from scipy.sparse.csgraph import connected_components
from source_garment_graph import source_fem_laplacian,solve_support_fields,sparsify_four_influences


def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('base',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--radius',type=float,default=.12);args=parser.parse_args()
    assert args.base.resolve()!=args.output.resolve() and 0<args.radius<1
    args.output.mkdir(parents=True,exist_ok=True);started=time.monotonic()
    meta=json.loads((args.base/'solver-meta.json').read_text());export=json.loads((args.base/'export.json').read_text())
    assert digest(args.base/'H01-C0-rigged.glb')==export['sha256']
    source=np.fromfile(args.base/'solver-positions.bin','<f4').reshape(-1,3).astype(float)
    triangles=np.fromfile(args.base/'solver-triangles.bin','<u4').reshape(-1,3)
    group=np.fromfile(args.base/'solver-groups.bin','<u4');unique,reps,inverse=np.unique(group,return_index=True,return_inverse=True)
    p=source[reps];tri=inverse[triangles]
    ids=np.fromfile(args.base/'solver-ids.bin','<u2').reshape(-1,4);weights=np.fromfile(args.base/'solver-weights.bin','<f4').reshape(-1,4)
    roles=np.fromfile(args.base/'solver-roles.bin','u1');protected=np.fromfile(args.base/'solver-protected.bin','u1').astype(bool)
    rolebits=np.zeros(len(p),dtype=np.uint16);np.bitwise_or.at(rolebits,inverse,np.left_shift(1,roles.astype(np.uint16)))
    fixed=np.zeros(len(p),bool);np.logical_or.at(fixed,inverse,protected|(roles==0))
    free=~fixed
    joints=[j['name'] for j in meta['joints']];names={name:i for i,name in enumerate(joints)}
    dense=np.zeros((len(p),len(joints)))
    for k in range(4):np.add.at(dense,(inverse,ids[:,k]),weights[:,k])
    dense/=np.bincount(inverse)[:,None]
    x,y=np.abs(p[:,0]),p[:,1];anchor=np.zeros(len(p),bool)
    def target(mask,bone):
        mask=mask&free;dense[mask]=0;dense[mask,names[bone]]=1;anchor[mask]=True
    lower=((rolebits&(1<<1|1<<2))!=0)
    target(lower&(y<.9),'Hips')
    target(lower&(y>=.9)&(y<1.04),'Spine')
    target(((rolebits&(1<<3))!=0)&(x<.15)&(y>1.13),'Spine2')
    target(((rolebits&(1<<3))!=0)&(x<.15)&(y<1.02),'Spine')
    for side,label in [('Left',4),('Right',5)]:
        sleeve=(rolebits&(1<<label))!=0
        for start,end in [('Arm','ForeArm'),('ForeArm','Hand')]:
            a=np.asarray(meta['originalJointPositions'][side+start]);b=np.asarray(meta['originalJointPositions'][side+end]);axis=b-a
            t=np.clip((p-a)@axis/np.dot(axis,axis),0,1);distance=np.linalg.norm(p-(a+t[:,None]*axis),axis=1)
            mask=sleeve&free&(distance<.065)
            amount=np.clip((t-.4)/.6,0,1);amount=amount*amount*(3-2*amount)
            dense[mask]=0;dense[mask,names[side+start]]=1-amount[mask];dense[mask,names[side+end]]=amount[mask];anchor[mask]=True
    stiffness,mass,operator=source_fem_laplacian(p,tri)
    adjacency=stiffness.copy();adjacency.setdiag(0);adjacency.eliminate_zeros()
    cc_count,component=connected_components(adjacency[free][:,free],directed=False)
    touches=np.asarray(abs(adjacency[free][:,~free]).sum(1)).ravel()>0
    reachable=np.zeros(cc_count,bool);np.logical_or.at(reachable,component,touches|anchor[free])
    free_ids=np.flatnonzero(free);free[free_ids[~reachable[component]]]=False
    boundary=~free;screen=mass[free]*anchor[free]/args.radius**2
    matrix=stiffness[free][:,free].tocsr()+diags(screen)
    rhs=-stiffness[free][:,boundary]@dense[boundary]+screen[:,None]*dense[free]
    print(json.dumps({'groups':len(p),'free':int(free.sum()),'anchors':int(anchor.sum()),'radius':args.radius,'sourceCutEdges':json.loads((args.base/'cut-plan.json').read_text())['diagnostics']['cutEdges']}),flush=True)
    import pyamg
    hierarchy=pyamg.smoothed_aggregation_solver(matrix,symmetry='symmetric',max_levels=12,max_coarse=500,coarse_solver='splu')
    solved,details=solve_support_fields(matrix,rhs,dense[free],joints,hierarchy.aspreconditioner(cycle='V'),nonnegative=True)
    assert np.isfinite(solved).all() and solved.min()>-1e-4
    solved=np.maximum(solved,0);solved/=solved.sum(1,keepdims=True);dense[free]=solved
    top,amount,discarded=sparsify_four_influences(dense)
    result_ids=ids.copy();result_weights=weights.copy();changed=free[inverse]
    result_ids[changed]=top[inverse[changed]];result_weights[changed]=amount[inverse[changed]]
    assert np.array_equal(result_ids[protected],ids[protected]) and np.array_equal(result_weights[protected],weights[protected])
    assert np.isfinite(result_weights).all() and result_weights.min()>=0 and np.max(np.abs(result_weights.sum(1)-1))<1e-5
    result_ids.astype('<u2').tofile(args.output/'result-ids.bin');result_weights.astype('<f4').tofile(args.output/'result-weights.bin')
    report={'base':str(args.base),'inputSha256':export['sha256'],'cutPlanSha256':meta['cutPlanSha256'],'radius':args.radius,'elapsedSeconds':time.monotonic()-started,
        'operator':operator,'freeGroups':int(free.sum()),'protectedSourceCopies':int(protected.sum()),'changedCopies':int(changed.sum()),'maximumDiscardedInfluence':float(discarded.max()),'solves':details,
        'inputHashes':{name:digest(args.base/name) for name in ['solver-positions.bin','solver-triangles.bin','solver-groups.bin','solver-ids.bin','solver-weights.bin','solver-roles.bin','solver-protected.bin','solver-meta.json']},
        'outputHashes':{name:digest(args.output/name) for name in ['result-ids.bin','result-weights.bin']},'accepted':False,'activated':False,
        'scope':'Support solve on explicit source-corner cut fans; no original face/UV/texture changes. Proposed pattern, all-pose skin/collision/contact and visual acceptance remain unverified.'}
    (args.output/'solve.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'elapsedSeconds':report['elapsedSeconds'],'changed':int(changed.sum()),'accepted':False}),flush=True)


if __name__=='__main__':main()
