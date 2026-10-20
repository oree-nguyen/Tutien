"""Offline convex source-edge skin-weight trial, with unchanged source geometry.

Chambolle-Pock splits the actual posed edge-length balls from per-vertex weight
simplices. Four source joint IDs stay fixed; protected hands are immutable.
This is a one-pose feasibility experiment, never a whole-rig certificate.
"""
import argparse
import hashlib
import json
import re
import time
from pathlib import Path
import numpy as np


def simplex(values):
    order=-np.sort(-values,axis=1)
    cumulative=np.cumsum(order,axis=1)-1
    count=(order>cumulative/np.arange(1,values.shape[1]+1)).sum(axis=1)
    theta=cumulative[np.arange(len(values)),count-1]/count
    return np.maximum(values-theta[:,None],0)


def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--iterations',type=int,default=300)
    parser.add_argument('--ratio',type=float,default=1.49)
    parser.add_argument('--resume',action='store_true')
    parser.add_argument('--warm-start',type=Path)
    args=parser.parse_args()
    assert re.fullmatch(r'\.local/rig-candidates/[a-z0-9-]+',str(args.output))
    assert args.base.resolve()!=args.output.resolve() and 1<args.ratio<2 and args.iterations>0 and not(args.resume and args.warm_start)
    args.output.mkdir(parents=True,exist_ok=True)
    started=time.monotonic()
    receipt=json.loads((args.base/'receipt.json').read_text())
    feasibility=json.loads((args.base/'feasibility-input.json').read_text())
    assert receipt['sha256']==feasibility['assetSha256']==digest(args.base/'H01-C0-rigged.glb')
    assert digest(args.base/'feasibility-matrices.bin')==feasibility['matricesSha256']
    names=['positions.bin','triangles.bin','source-welds.u32bin','protected.bin','result-ids.bin','result-weights.bin','feasibility-matrices.bin']
    hashes={name:digest(args.base/name) for name in names}
    source=np.fromfile(args.base/'positions.bin','<f4').reshape(-1,3)
    triangles=np.fromfile(args.base/'triangles.bin','<u4').reshape(-1,3)
    weld=np.fromfile(args.base/'source-welds.u32bin','<u4');reps,inverse=np.unique(weld,return_inverse=True)
    point=source[reps].astype(float);tri=inverse[triangles]
    ids=np.fromfile(args.base/'result-ids.bin','<u2').reshape(-1,4)
    original=np.fromfile(args.base/'result-weights.bin','<f4').reshape(-1,4)
    w0=original[reps].astype(float);w=w0.copy();extrapolated=w.copy()
    fixed=np.zeros(len(reps),bool);np.logical_or.at(fixed,inverse,np.fromfile(args.base/'protected.bin','u1').astype(bool))
    # Preserve head and boots; the full torso/lining/sleeve domain is solved
    # together so a color label cannot hard-pin an internal fabric layer.
    free=(point[:,1]>.19)&(point[:,1]<1.55)&(np.abs(point[:,0])<.55)&~fixed
    matrices=np.fromfile(args.base/'feasibility-matrices.bin','<f8').reshape(-1,4,4).transpose(0,2,1)
    transformed=np.empty((len(point),4,3))
    for k in range(4):
        m=matrices[ids[reps,k]]
        transformed[:,k]=np.einsum('nij,nj->ni',m[:,:3,:3],point)+m[:,:3,3]
    origin=transformed.mean(axis=1);coeff=transformed-origin[:,None,:]
    edges=np.unique(np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1),axis=0)
    length=np.linalg.norm(point[edges[:,0]]-point[edges[:,1]],axis=1)
    edges=edges[length>1e-12];length=length[length>1e-12];left,right=edges.T
    inverse_length=1/length
    # Absolute row/column sums give conservative diagonal primal-dual steps.
    # One scalar per vertex and per edge preserves Euclidean simplex/ball prox.
    row_bound=np.max((np.abs(coeff[left]).sum(axis=1)+np.abs(coeff[right]).sum(axis=1))*inverse_length[:,None],axis=1)
    incident=np.bincount(edges.ravel(),weights=np.repeat(inverse_length,2),minlength=len(point))
    column_bound=np.max(np.abs(coeff).sum(axis=2),axis=1)*incident
    tau=np.where(free,.95/np.maximum(column_bound,1e-12),0)
    sigma=.95/np.maximum(row_bound,1e-12)
    movable=(free[left]|free[right])&(row_bound>1e-12)
    sigma[~movable]=0
    dual=np.zeros((len(edges),3));history=[];continuation=None
    if args.resume or args.warm_start:
        previous=args.output if args.resume else args.warm_start
        prior=json.loads((previous/'solve.json').read_text())
        assert prior['assetSha256']==receipt['sha256'] and prior['inputHashes']==hashes and prior['parameters']['ratio']==args.ratio
        assert digest(previous/'result-weights.bin')==prior['outputWeightsSha256']
        continuation={'directory':str(previous),'solveSha256':digest(previous/'solve.json'),'kind':'resume' if args.resume else 'warm-start'}
        if args.resume:
            for name,expected in prior['stateHashes'].items():assert digest(previous/name)==expected
            w=np.load(previous/'state-weights.npy');extrapolated=np.load(previous/'state-extrapolated.npy');dual=np.load(previous/'state-dual.npy')
        else:
            w=np.fromfile(previous/'result-weights.bin','<f4').reshape(-1,4)[reps].astype(float);extrapolated=w.copy()
        assert w.shape==w0.shape and extrapolated.shape==w.shape and dual.shape==(len(edges),3)
        assert np.isfinite(w).all() and np.isfinite(extrapolated).all() and np.isfinite(dual).all()
        assert np.max(np.abs(w[~free]-w0[~free]))<1e-8
    def posed(weights):return origin+np.einsum('nkj,nk->nj',coeff,weights)
    def measure(weights):
        p=posed(weights);ratios=np.linalg.norm(p[left]-p[right],axis=1)*inverse_length
        return{'p999':float(np.quantile(ratios,.999)),'maximum':float(ratios.max()),'edgesOverTarget':int((ratios>args.ratio).sum()),'immutableEdgesOverTarget':int(((ratios>args.ratio)&~movable).sum())}
    initial=measure(w)
    print(json.dumps({'vertices':len(point),'freeVertices':int(free.sum()),'edges':len(edges),'initial':initial}),flush=True)
    for iteration in range(args.iterations):
        p=posed(extrapolated)
        dual+=sigma[:,None]*(p[left]-p[right])*inverse_length[:,None]
        norm=np.linalg.norm(dual,axis=1)
        dual*=np.maximum(0,1-sigma*args.ratio/np.maximum(norm,1e-30))[:,None]
        flux=dual*inverse_length[:,None]
        divergence=np.stack([np.bincount(left,weights=flux[:,k],minlength=len(point))-np.bincount(right,weights=flux[:,k],minlength=len(point)) for k in range(3)],axis=1)
        gradient=np.einsum('nkj,nj->nk',coeff,divergence)
        value=simplex(w-tau[:,None]*gradient)
        value[~free]=w0[~free]
        extrapolated=2*value-w;w=value
        if iteration%25==24 or iteration==args.iterations-1:
            status={'iteration':iteration+1,'elapsedSeconds':time.monotonic()-started,**measure(w)};history.append(status);print(json.dumps(status),flush=True)
    result=original.copy();result[free[inverse]]=w[inverse[free[inverse]]]
    protected=np.fromfile(args.base/'protected.bin','u1').astype(bool)
    assert np.array_equal(result[protected],original[protected])
    assert np.isfinite(result).all() and result.min()>=0 and np.max(np.abs(result.sum(1)-1))<1e-5
    result.astype('<f4').tofile(args.output/'result-weights.bin')
    for name,value in [('state-weights.npy',w),('state-extrapolated.npy',extrapolated),('state-dual.npy',dual)]:np.save(args.output/name,value)
    report={'base':str(args.base),'assetSha256':receipt['sha256'],'poseFile':feasibility['poseFile'],'poseSha256':feasibility['poseSha256'],
        'inputHashes':hashes,'outputWeightsSha256':digest(args.output/'result-weights.bin'),'jointIdsChanged':False,
        'protectedWeightsPreserved':True,'initial':initial,'final':measure(w),'history':history,
        'parameters':{'iterations':args.iterations,'ratio':args.ratio},'continuation':continuation,
        'stateHashes':{name:digest(args.output/name) for name in ['state-weights.npy','state-extrapolated.npy','state-dual.npy']},'accepted':False,'activated':False,
        'scope':'One-pose convex four-fixed-joint weight simplex and original posed source-edge length-ball trial. Unique-edge metrics cannot replace per-primitive limits, lower compression/collision, joint sections, full animation or visual acceptance.'}
    (args.output/'solve.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':main()
