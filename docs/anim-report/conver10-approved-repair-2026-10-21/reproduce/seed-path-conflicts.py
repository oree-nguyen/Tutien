"""Independent triangle-path obstruction test for fixed source seed assignments."""
from pathlib import Path
import hashlib,json
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
base=Path('.local/rig-candidates/approved-source-cp-h02-geodesic-input')
meta=json.loads((base/'input.json').read_text());spec=json.loads((base/'feasibility-input.json').read_text())
p=np.fromfile(base/'positions.bin','<f4').reshape(-1,3).astype(float);tri=np.fromfile(base/'triangles.bin','<u4').reshape(-1,3);weld=np.fromfile(base/'source-welds.u32bin','<u4');reps,inverse=np.unique(weld,return_inverse=True);points=p[reps];protected=np.fromfile(base/'protected.bin','u1').astype(bool)
ids=np.fromfile(base/'result-ids.bin','<u2').reshape(-1,4);w=np.fromfile(base/'result-weights.bin','<f4').reshape(-1,4);matrices=np.fromfile(base/'feasibility-matrices.bin','<f8').reshape(spec['poseCount'],-1,4,4).transpose(0,1,3,2)
edges=np.unique(np.sort(np.concatenate([inverse[tri[:,[0,1]]],inverse[tri[:,[1,2]]],inverse[tri[:,[2,0]]]]),axis=1),axis=0);length=np.linalg.norm(points[edges[:,0]]-points[edges[:,1]],axis=1);valid=length>1e-12;edges=edges[valid];length=length[valid]
frames=json.loads(Path('data/rig/hand-frames.json').read_text())['heroes']['H02']['hands'];rows=[]
for side,hand in frames.items():
    landmarks=np.array([hand['wrist']]+[x for f in hand['fingers'].values()for x in f['points']]);lo=landmarks.min(0)-.022;hi=landmarks.max(0)+.022;selected=((points>=lo)&(points<=hi)).all(1);groups=np.flatnonzero(selected);lookup=np.full(len(points),-1,dtype=int);lookup[groups]=np.arange(len(groups));inside=selected[edges].all(1);e=lookup[edges[inside]];graph=coo_matrix((length[inside],(e[:,0],e[:,1])),shape=(len(groups),len(groups))).tocsr()
    seed_sources=np.flatnonzero(protected&selected[inverse]);seed_groups=np.unique(inverse[seed_sources]);source=reps[seed_groups];distances=dijkstra(graph,directed=False,indices=lookup[seed_groups]);pair_paths=distances[:,lookup[seed_groups]]
    for pose,matrix in enumerate(matrices):
        positioned=np.zeros((len(source),3))
        for k in range(4):
            transform=matrix[ids[source,k]];positioned+=w[source,k,None]*(np.einsum('nij,nj->ni',transform[:,:3,:3],p[source])+transform[:,:3,3])
        delta=np.linalg.norm(positioned[:,None]-positioned[None,:],axis=2);ratio=np.divide(delta,pair_paths,out=np.zeros_like(delta),where=np.isfinite(pair_paths)&(pair_paths>1e-9));a,b=np.unravel_index(ratio.argmax(),ratio.shape);_,predecessor=dijkstra(graph,directed=False,indices=lookup[seed_groups[a]],return_predecessors=True);path=[];at=lookup[seed_groups[b]]
        while at>=0:
            path.append(int(reps[groups[at]]))
            if at==lookup[seed_groups[a]]:break
            at=int(predecessor[at])
        row={'side':side,'pose':pose,'seedVertices':len(source),'maximumRequiredEdgeRatioLowerBound':float(ratio[a,b]),'pairsImpossibleAtMaximumTwo':int((ratio>2+1e-5).sum()),'startSourceVertex':int(source[a]),'endSourceVertex':int(source[b]),'bindPathLengthMetres':float(pair_paths[a,b]),'posedEndpointDistanceMetres':float(delta[a,b]),'actualSourceEdgePath':path,'sourceJointIDs':ids[[source[a],source[b]]].tolist(),'weights':w[[source[a],source[b]]].tolist()};rows.append(row);print({k:v for k,v in row.items()if k not in ['actualSourceEdgePath','weights','sourceJointIDs']})
report={'scope':'Necessary condition only: if fixed endpoints exceed twice the length of any existing source-edge path, no weights at intervening vertices can satisfy maxstrain2. This does not certify any seed anatomy or feasible rig.','matricesSha256':hashlib.sha256((base/'feasibility-matrices.bin').read_bytes()).hexdigest(),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'rows':rows}
Path('docs/anim-report/conver10-approved-repair-2026-10-21/H02-seed-path-conflicts.json').write_text(json.dumps(report,indent=2)+'\n')
