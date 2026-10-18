"""Offline spatial propagation of high-confidence green/white fabric seeds."""
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
p=Path(sys.argv[1])
xyz=np.fromfile(p/'positions.bin',dtype='<f4').reshape(-1,3)
seeds=np.fromfile(p/'seeds.bin',dtype='u1')
region=(xyz[:,1]>.19)&(xyz[:,1]<.92)&(np.abs(xyz[:,0])<.25)
green=xyz[region&(seeds==1)]
white=xyz[region&(seeds==2)]
if not len(green) or not len(white): raise RuntimeError('Missing fabric seeds')
selected=np.zeros(len(xyz),dtype='u1')
points=xyz[region]
dg=cKDTree(green).query(points,workers=1)[0]
dw=cKDTree(white).query(points,workers=1)[0]
selected[region]=(dg<dw).astype('u1')
selected.tofile(p/'panel-mask.bin')
print(f'green seeds={len(green)} white seeds={len(white)} panel vertices={selected.sum()}')
