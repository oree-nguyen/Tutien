"""Recover cuff seed patches from reviewed source-ray face IDs and source edges."""
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

base=Path('.local/rig-candidates/semantic-garment-v3')
review=Path('docs/anim-report/semantic-garment-cuff-review')
picks=json.loads((review/'source-ray-picks.json').read_text())
meta=json.loads((base/'input.json').read_text())
assert picks['sourceSha256']==meta['sourceSha256']
p=np.fromfile(base/'positions.bin',dtype='<f4').reshape(-1,3)
t=np.fromfile(base/'triangles.bin',dtype='<u4').reshape(-1,3)
weld=np.fromfile(base/'source-welds.u32bin',dtype='<u4')
reps,inverse=np.unique(weld,return_inverse=True)
rgb=np.fromfile(base/'rgb.bin',dtype='u1').reshape(-1,3).astype(float)
counts=np.bincount(inverse)
rgb=np.stack([np.bincount(inverse,weights=rgb[:,k])/counts for k in range(3)],axis=1)
r,g,b=rgb.T
gold=(r>1.08*g)&(g>1.7*b)&(g>45)
points=p[reps]
edges=np.unique(np.sort(inverse[np.concatenate((t[:,[0,1]],t[:,[1,2]],t[:,[2,0]]))],axis=1),axis=0)
patches=[]
for group in picks['picks']:
    side=group['side']
    faces=np.array([pick['hit']['originalSourceFace'] for pick in group['picks'] if pick['hit']],dtype=np.uint32)
    seed_groups=np.unique(inverse[t[faces]])
    # This anatomical window limits the candidate SEARCH. A face enters the
    # patch only through a source-edge gold component reached by exact ray IDs.
    search=(points[:,0]>.26 if side=='Left' else points[:,0]<-.26)&(points[:,1]>.55)&(points[:,1]<1.2)
    active=gold&search
    active[seed_groups]=True
    kept_edges=edges[active[edges[:,0]]&active[edges[:,1]]]
    graph=coo_matrix((np.ones(len(kept_edges)*2),(np.r_[kept_edges[:,0],kept_edges[:,1]],np.r_[kept_edges[:,1],kept_edges[:,0]])),shape=(len(points),len(points))).tocsr()
    _,cc=connected_components(graph,directed=False)
    chosen=np.isin(cc,np.unique(cc[seed_groups]))&active
    selected=np.flatnonzero(chosen[inverse[t]].sum(axis=1)>=2).astype(np.uint32)
    selected=np.unique(np.r_[selected,faces]).astype('<u4')
    filename=f'{side}-Cuff-source-face-seeds.u32bin'
    selected.tofile(review/filename)
    corners=np.unique(t[selected])
    patches.append({'side':side,'semanticRegion':'H01_Sleeve_'+side,'sourceSha256':meta['sourceSha256'],
                    'rayPickedSourceFaces':faces.tolist(),'sourceFaceMap':{'file':filename,'count':len(selected),'sha256':hashlib.sha256((review/filename).read_bytes()).hexdigest()},
                    'sourceBoundsMin':p[corners].min(axis=0).tolist(),'sourceBoundsMax':p[corners].max(axis=0).tolist(),
                    'selection':'Source-edge gold components reached from exact original source-ray face picks; anatomical window limits search, never forces box labels',
                    'reviewStatus':'pending-isolated-front-side-back-patch-review'})
report={'sourceSha256':meta['sourceSha256'],'rayPickAssetSha256':picks['assetSha256'],'patches':patches,
        'spatialNearestNeighborUsed':False,'garmentPatternAccepted':False}
(review/'source-cuff-patches.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
