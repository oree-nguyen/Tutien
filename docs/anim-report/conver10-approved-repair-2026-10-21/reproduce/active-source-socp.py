"""Experimental local cone solve on actual source edges, with full remeasurement.
Not a whole-animation, anatomy or contact acceptance validator.
"""
from pathlib import Path
import hashlib,json,sys,time
import numpy as np
from scipy.sparse import coo_matrix
import cvxpy as cp
base=Path('.local/rig-candidates/approved-source-cp-h02-geodesic-input');previous=Path('.local/rig-candidates/approved-source-cp-h02-geodesic-v3');output=Path('.local/rig-candidates/approved-source-socp-h02-v1');output.mkdir(exist_ok=True)
report=json.loads((previous/'solve.json').read_text())
for name,sha in report['inputHashes'].items():
    if hashlib.sha256((base/name).read_bytes()).hexdigest()!=sha:raise ValueError('Stale source '+name)
if hashlib.sha256((previous/'result-weights.bin').read_bytes()).hexdigest()!=report['outputWeightsSha256']:raise ValueError('Stale weight state')
p=np.fromfile(base/'positions.bin','<f4').reshape(-1,3).astype(float);tri=np.fromfile(base/'triangles.bin','<u4').reshape(-1,3);weld=np.fromfile(base/'source-welds.u32bin','<u4');reps,inverse=np.unique(weld,return_inverse=True);points=p[reps];tri=inverse[tri];ids=np.fromfile(base/'result-ids.bin','<u2').reshape(-1,4)[reps];original=np.fromfile(previous/'result-weights.bin','<f4').reshape(-1,4);weights=original[reps].astype(float);matrices=np.fromfile(base/'feasibility-matrices.bin','<f8').reshape(2,-1,4,4).transpose(0,1,3,2)
protected=np.zeros(len(points),bool);np.logical_or.at(protected,inverse,np.fromfile(base/'protected.bin','u1').astype(bool));transformed=np.stack([np.stack([np.einsum('nij,nj->ni',m[ids[:,k],:3,:3],points)+m[ids[:,k],:3,3]for k in range(4)],axis=1)for m in matrices]);coeff=transformed-transformed.mean(2)[:,:,None,:];origin=transformed.mean(2)
edges=np.unique(np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1),axis=0);length=np.linalg.norm(points[edges[:,0]]-points[edges[:,1]],axis=1);valid=length>1e-12;edges=edges[valid];length=length[valid];left,right=edges.T

def posed(w):return origin+np.einsum('pnkj,nk->pnj',coeff,w)
def ratios(w):
    q=posed(w);return np.linalg.norm(q[:,left]-q[:,right],axis=2)/length[None,:]
start=time.monotonic();before=ratios(weights);worst=before.max(0);seed=np.argsort(worst)[-1000:];free=np.zeros(len(points),bool);free[edges[seed].ravel()]=True
for _ in range(3):free[edges[free[edges].any(1)].ravel()]=True
free&=~protected;selected=free[edges].any(1);e=edges[selected];lens=length[selected];lookup=np.full(len(points),-1,dtype=int);lookup[free]=np.arange(free.sum());q0=posed(weights);delta=cp.Variable((int(free.sum()),4));flat=cp.reshape(delta,(int(free.sum())*4,),order='C');constraints=[cp.sum(delta,axis=1)==0,delta>=-weights[free],delta<=1-weights[free]]
for pose in range(2):
    rows=[];cols=[];values=[]
    for endpoint,sign in [(0,1),(1,-1)]:
        v=e[:,endpoint];active=free[v];edge_index=np.flatnonzero(active)
        for k in range(4):
            for axis in range(3):rows.append(edge_index*3+axis);cols.append(lookup[v[active]]*4+k);values.append(sign*coeff[pose,v[active],k,axis]/lens[active])
    matrix=coo_matrix((np.concatenate(values),(np.concatenate(rows),np.concatenate(cols))),shape=(len(e)*3,int(free.sum())*4)).tocsr();constant=(q0[pose,e[:,0]]-q0[pose,e[:,1]])/lens[:,None];vectors=cp.reshape(matrix@flat,(len(e),3),order='C')+constant;constraints.append(cp.norm(vectors,axis=1)<=1.49)
problem=cp.Problem(cp.Minimize(cp.sum_squares(delta)),constraints);print(json.dumps({'freeVertices':int(free.sum()),'constrainedEdges':len(e),'poses':2,'cvxpy':cp.__version__}),flush=True)
error=None
try:problem.solve(solver='CLARABEL',max_iter=100,tol_gap_abs=1e-8,tol_gap_rel=1e-8,tol_feas=1e-9,time_limit=90,verbose=False)
except Exception as exc:error=str(exc)
record={'scope':'Experimental local source-edge feasibility only; not anatomy, whole skin or animation acceptance','accepted':False,'activated':False,'parent':str(previous),'parentSolveSha256':hashlib.sha256((previous/'solve.json').read_bytes()).hexdigest(),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'solverStatus':problem.status,'error':error,'seconds':time.monotonic()-start,'freeVertices':int(free.sum()),'constrainedEdges':len(e),'outputWritten':False}
if problem.status=='optimal' and delta.value is not None:
    result=weights.copy();result[free]+=delta.value;simplex_error=float(np.abs(result.sum(1)-1).max());after=ratios(result);valid=result.min()>-1e-8 and simplex_error<1e-6 and after[:,selected].max()<=1.4901;record.update({'simplexError':simplex_error,'localFeasible':bool(valid),'maximumConstrainedRatio':float(after[:,selected].max()),'before':[{'p999':float(np.quantile(row,.999)),'maximum':float(row.max())}for row in before],'after':[{'p999':float(np.quantile(row,.999)),'maximum':float(row.max())}for row in after]})
    if valid:
        result=np.maximum(result,0);result/=result.sum(1)[:,None];out=result[inverse].astype('<f4');out.tofile(output/'result-weights.bin');record['outputWeightsSha256']=hashlib.sha256((output/'result-weights.bin').read_bytes()).hexdigest();record['outputWritten']=True
(output/'solve.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record),flush=True)
if not record['outputWritten']:sys.exit(2)
