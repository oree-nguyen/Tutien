"""Inspect remaining source surfaces before treating them as rigid anatomy."""
import json
import hashlib
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

base,output=Path(sys.argv[1]),Path(sys.argv[2]);output.mkdir(parents=True,exist_ok=True)
p=np.fromfile(base/'positions.bin','<f4').reshape(-1,3);t=np.fromfile(base/'triangles.bin','<u4').reshape(-1,3)
w=np.fromfile(base/'source-welds.u32bin','<u4');label=np.fromfile(base/'face-labels.bin','u1');rgb=np.fromfile(base/'rgb.bin','u1').reshape(-1,3)
tri=w[t];edges=np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1)
faces=np.tile(np.arange(len(t)),3);key=edges[:,0].astype(np.int64)*len(p)+edges[:,1];order=np.argsort(key);key=key[order];faces=faces[order]
pair=np.flatnonzero(key[:-1]==key[1:]);a,b=faces[pair],faces[pair+1]
keep=(label[a]==0)&(label[b]==0)&(a!=b);a0,b0=a[keep],b[keep]
g=coo_matrix((np.ones(len(a0)*2),(np.r_[a0,b0],np.r_[b0,a0])),shape=(len(t),len(t))).tocsr()
_,components=connected_components(g,directed=False)
counts=np.bincount(components[label==0]);rows=[]
for component in np.argsort(counts)[::-1]:
 if counts[component]==0:break
 selected=(components==component)&(label==0);ids=np.flatnonzero(selected);v=np.unique(t[ids])
 neighbors=np.r_[label[b[selected[a]]],label[a[selected[b]]]];neighbors=np.unique(neighbors[neighbors!=0]).tolist()
 rows.append({'firstSourceFace':int(ids[0]),'sourceFaces':len(ids),'sourceVertices':len(v),'bounds':[p[v].min(0).tolist(),p[v].max(0).tolist()],
              'meanSourceRGB':rgb[v].mean(0).tolist(),'neighborGarmentLabels':neighbors})
 if len(rows)==1:np.asarray(ids,dtype='<u4').tofile(output/'largest-remaining-source-faces.u32bin')
report={'base':str(base),'parentCandidateSha256':hashlib.sha256((base/'H01-C0-rigged.glb').read_bytes()).hexdigest(),
        'inputHashes':{n:hashlib.sha256((base/n).read_bytes()).hexdigest() for n in ['positions.bin','triangles.bin','source-welds.u32bin','face-labels.bin','rgb.bin']},
        'method':'Original triangle face adjacency with validated opposite UV-boundary welds, restricted to label0. No spatial proximity or color-based semantic approval.',
        'remainingComponents':len(rows),'largestSourceFaceListSha256':hashlib.sha256((output/'largest-remaining-source-faces.u32bin').read_bytes()).hexdigest(),
        'components':rows,'semanticApproval':False,'scope':'Remaining_Source includes unreviewed surfaces; its name is not evidence that every component is rigid body.'}
(output/'components.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(rows[:8],indent=2))
