"""Restore complete lined garment panels using source topology, never RGB holes."""
import json
import hashlib
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components,dijkstra

base,output=Path(sys.argv[1]),Path(sys.argv[2]);output.mkdir(parents=True,exist_ok=True)
p=np.fromfile(base/'positions.bin','<f4').reshape(-1,3);tri=np.fromfile(base/'triangles.bin','<u4').reshape(-1,3)
weld=np.fromfile(base/'source-welds.u32bin','<u4');old=np.fromfile(base/'face-labels.bin','u1');protected=np.fromfile(base/'protected.bin','u1')
reps,inverse=np.unique(weld,return_inverse=True);points=p[reps];t=inverse[tri]
remaining=np.flatnonzero(old==0);rt=t[remaining]
edge=np.unique(np.sort(np.concatenate([rt[:,[0,1]],rt[:,[1,2]],rt[:,[2,0]]]),axis=1),axis=0)
g=coo_matrix((np.ones(len(edge)*2),(np.r_[edge[:,0],edge[:,1]],np.r_[edge[:,1],edge[:,0]])),shape=(len(reps),len(reps))).tocsr()
_,group=connected_components(g,directed=False)
seed=12616
assert old[seed]==0
selected=remaining[group[t[remaining,0]]==group[t[seed,0]]]
vertices=np.unique(tri[selected]);bounds=[p[vertices].min(0),p[vertices].max(0)]
assert len(selected)==348389,'Unexpected source component; inspect the changed asset before proceeding'
assert not protected[vertices].any()
assert bounds[0][1]>.1 and bounds[1][1]<1.03 and np.abs(p[vertices,0]).max()<.3
cloth=t[selected];ce=np.unique(np.sort(np.concatenate([cloth[:,[0,1]],cloth[:,[1,2]],cloth[:,[2,0]]]),axis=1),axis=0)
length=np.maximum(np.linalg.norm(points[ce[:,0]]-points[ce[:,1]],axis=1),1e-12)
graph=coo_matrix((np.r_[length,length],(np.r_[ce[:,0],ce[:,1]],np.r_[ce[:,1],ce[:,0]])),shape=g.shape).tocsr()
cloth_vertices=np.unique(cloth);distance=[];seeds=[]
for label in [1,2]:
 s=np.intersect1d(cloth_vertices,np.unique(t[old==label]));assert len(s)>0
 seeds.append(len(s));distance.append(dijkstra(graph,indices=s,directed=False,min_only=True))
distance=np.stack(distance);score=distance[:,cloth].mean(2);assert np.isfinite(score).all()
owner=np.where(score[0]<=score[1],1,2)
for label,name in [(1,'left'),(2,'right')]:np.asarray(selected[owner==label],dtype='<u4').tofile(output/f'lining-{name}.u32bin')
np.asarray(selected,dtype='<u4').tofile(output/'lower-fabric-source-faces.u32bin')
report={'base':str(base),'candidateSha256':hashlib.sha256((base/'H01-C0-rigged.glb').read_bytes()).hexdigest(),
 'sourceSha256':json.loads((base/'input.json').read_text())['sourceSha256'],
 'selection':'Existing vertex-connected source lower lining/fabric/trim, seeded by source face12616 and visually inspected as the348289edge-connected main surface plus100point-connected source faces. No head, hands, boots or fabricated body.',
 'reviewImages':['docs/anim-report/conver10-redo/remaining-source-review/corrected-label/largest-remaining-front.png','docs/anim-report/conver10-redo/remaining-source-review/corrected-label/largest-remaining-back.png'],
 'method':'Original source triangle edges and validated UV welds; intrinsic distances from lining to original left/right outer-panel boundary seeds. Color never removes fabric from a panel.',
 'selectedSourceFaces':len(selected),'sourceBounds':[a.tolist() for a in bounds],'boundarySeedGroups':seeds,
 'leftFaces':int((owner==1).sum()),'rightFaces':int((owner==2).sum()),
 'sourceArraysUnchanged':True,'weightsUnchanged':True,'runtimeActivated':False,'garmentPatternAccepted':False,
 'metricDilutionGuard':'Original v6 panel regions must remain separate output primitives; adding lining cannot hide existing region strain failures.',
 'files':{name:{'sha256':hashlib.sha256((output/name).read_bytes()).hexdigest(),'count':(output/name).stat().st_size//4} for name in ['lining-left.u32bin','lining-right.u32bin','lower-fabric-source-faces.u32bin']}}
(output/'ownership.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
