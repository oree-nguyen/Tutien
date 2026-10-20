"""Extend reviewed boot source seeds on the original color-weighted surface graph."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components,dijkstra

d=Path(sys.argv[1]);meta=json.loads((d/'input.json').read_text());old=json.loads((d/'selection.json').read_text())
p=np.fromfile(d/'positions.bin',dtype='<f4').reshape(-1,3);t=np.fromfile(d/'triangles.bin',dtype='<u4').reshape(-1,3);rgb=np.fromfile(d/'rgb.bin',dtype='u1').reshape(-1,3)
weld=np.fromfile(d/'source-welds.u32bin',dtype='<u4');unique,inverse=np.unique(weld,return_inverse=True);points=p[unique];tri=inverse[t]
color=np.zeros((len(unique),3));counts=np.bincount(inverse)
for k in range(3):color[:,k]=np.bincount(inverse,weights=rgb[:,k])/counts
edges=np.unique(np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1),axis=0)
length=np.linalg.norm(points[edges[:,0]]-points[edges[:,1]],axis=1)
cost=np.maximum(length,1e-10)*(1+(np.linalg.norm(color[edges[:,0]]-color[edges[:,1]],axis=1)/30)**2)
graph=coo_matrix((np.r_[cost,cost],(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=(len(unique),len(unique))).tocsr()
seed=np.zeros(len(unique),dtype='u1')
for label,side in [(1,'Left'),(2,'Right')]:seed[inverse[old['sides'][side]['vertexIds']]]=label
# Other connected lower source pieces are competing cloth seeds. This includes
# H02's hanging panels above the smaller 220mm boot crop.
faces=np.all(points[tri,1]<.42,axis=1);low_edges=edges[np.all(points[edges,1]<.42,axis=1)]
low=coo_matrix((np.ones(len(low_edges)*2),(np.r_[low_edges[:,0],low_edges[:,1]],np.r_[low_edges[:,1],low_edges[:,0]])),shape=graph.shape).tocsr()
_,components=connected_components(low,directed=False)
boot_components=set(components[seed>0]);used=np.unique(tri[faces]);remaining=used[~np.isin(components[used],list(boot_components))]
seed[remaining]=3;seed[points[:,1]>=.65]=3
# The smaller crop identifies additional cloth even where source topology later
# joins a boot to a garment at a higher elevation.
small=np.all(points[tri,1]<.22,axis=1);small_vertices=np.unique(tri[small]);seed[small_vertices[seed[small_vertices]==0]]=3
distances=[]
for label in [1,2,3]:
    seeds=np.flatnonzero(seed==label);assert len(seeds)
    distances.append(dijkstra(graph,indices=seeds,directed=False,min_only=True))
distances=np.stack(distances);labels=np.argmin(distances,axis=0)+1
labels[seed>0]=seed[seed>0]
np.asarray(labels[inverse],dtype='u1').tofile(d/'boot-domain.bin')
# A transition returns to parent influences at every graph boundary. The lower
# reviewed seed domain remains fully controlled by Foot/Toe/Leg supports.
boundary=np.zeros(len(points),dtype=bool)
cross=labels[edges[:,0]]!=labels[edges[:,1]];boundary[edges[cross].ravel()]=True
distance=dijkstra(coo_matrix((np.r_[np.maximum(length,1e-10),np.maximum(length,1e-10)],(np.r_[edges[:,0],edges[:,1]],np.r_[edges[:,1],edges[:,0]])),shape=graph.shape).tocsr(),indices=np.flatnonzero(boundary),directed=False,min_only=True)
np.asarray(distance[inverse],dtype='<f4').tofile(d/'boot-boundary-distance.bin')
report={'hero':meta['hero'],'sourceSha256':meta['sourceSha256'],'seedSelectionSha256':hashlib.sha256((d/'selection.json').read_bytes()).hexdigest(),'method':'Multi-source shortest paths on original opposite-boundary welded triangle edges, weighted by source edge length and UV-sampled albedo difference; reviewed lowerboot source components compete with actual lower cloth components and upper source surfaces. No nearest-spatial graph or geometry generation.','visuallyVerified':False,'sides':{s:{'vertices':int(np.count_nonzero(labels[inverse]==i)),'bounds':[p[labels[inverse]==i].min(0).tolist(),p[labels[inverse]==i].max(0).tolist()]} for i,s in [(1,'Left'),(2,'Right')]}}
(d/'boot-domain.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
