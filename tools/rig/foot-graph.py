"""Audit original lower-surface components; bounds are a crop, never anatomy proof."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from source_garment_graph import source_welds

directory=Path(sys.argv[1])
meta=json.loads((directory/'input.json').read_text())
p=np.fromfile(directory/'positions.bin',dtype='<f4').reshape(-1,3)
t=np.fromfile(directory/'triangles.bin',dtype='<u4').reshape(-1,3)
rgb=np.fromfile(directory/'rgb.bin',dtype='u1').reshape(-1,3)
ids=np.fromfile(directory/'ids.bin',dtype='<u2').reshape(-1,4)
w=np.fromfile(directory/'weights.bin',dtype='<f4').reshape(-1,4)
weld,proof=source_welds(p,t)
weld.astype('<u4').tofile(directory/'source-welds.u32bin')
_,inverse=np.unique(weld,return_inverse=True)
points=p[np.unique(weld)]
tri=inverse[t]
crop=float(sys.argv[2]) if len(sys.argv)>2 else .42
lower=points[:,1]<crop
faces=np.all(lower[tri],axis=1)
edges=np.concatenate([tri[faces][:,[0,1]],tri[faces][:,[1,2]],tri[faces][:,[2,0]]])
g=coo_matrix((np.ones(len(edges)*2),(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(len(points),len(points))).tocsr()
n,labels=connected_components(g,directed=False)
components=[]
for label in np.unique(labels[tri[faces].ravel()]):
    mask=labels[inverse]==label
    f=np.flatnonzero(faces & np.all(labels[tri]==label,axis=1))
    if len(f)<5: continue
    v=np.flatnonzero(mask)
    sums=np.bincount(ids[v].ravel(),weights=w[v].ravel(),minlength=len(meta['joints']))/len(v)
    components.append({'component':int(label),'vertices':len(v),'faces':len(f),'bounds':[p[v].min(axis=0).tolist(),p[v].max(axis=0).tolist()],
      'soleCandidateVertices':int(np.count_nonzero(p[v,1]<.01)), 'meanRGB':rgb[v].mean(axis=0).tolist(),
      'meanInfluences':{meta['joints'][j]:float(sums[j]) for j in np.flatnonzero(sums>.005)}})
components.sort(key=lambda a:-a['faces'])
np.asarray(labels[inverse],dtype='<u4').tofile(directory/'lower-components.u32bin')
out={'hero':meta['hero'],'sourceSha256':meta['sourceSha256'],'cropHeight':crop,'method':'Actual source triangle graph plus unique opposite original boundary halfedges, cropped solely for inspection; components do not establish anatomy','weldProof':proof,'components':components}
(directory/'lower-components.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
