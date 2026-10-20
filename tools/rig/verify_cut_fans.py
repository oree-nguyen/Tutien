"""Reconstruct source corner fans with sparse graph connectivity, independently
of the compiler's union-find. All inputs are source topology, not posed XYZ.
"""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


def reconstruct(tri,weld,cuts):
    t=weld[tri];n=len(weld);corner=np.arange(t.size,dtype=np.uint32).reshape(-1,3)
    a=np.concatenate([corner[:,0],corner[:,1],corner[:,2]]);b=np.concatenate([corner[:,1],corner[:,2],corner[:,0]])
    va,vb=t.ravel()[a],t.ravel()[b];low=np.minimum(va,vb);high=np.maximum(va,vb)
    valid=low!=high;key=low.astype(np.uint64)*np.uint64(n)+high
    order=np.argsort(key[valid],kind='stable');which=np.flatnonzero(valid)[order];keys=key[which]
    start=np.r_[0,np.flatnonzero(keys[1:]!=keys[:-1])+1];counts=np.diff(np.r_[start,len(which)])
    if np.any(counts>2):raise ValueError('Nonmanifold source edge')
    pairs=start[counts==2];one,two=which[pairs],which[pairs+1]
    if not ((va[one]==vb[two])&(vb[one]==va[two])).all():raise ValueError('Wrong source winding')
    cuts=np.asarray(cuts,dtype=np.uint32).reshape(-1,2)
    if len(cuts) and (cuts[:,0]>=cuts[:,1]).any():raise ValueError('Unordered cut edge')
    cut_key=cuts[:,0].astype(np.uint64)*np.uint64(n)+cuts[:,1]
    if len(np.unique(cut_key))!=len(cut_key) or not np.isin(cut_key,key[one]).all():raise ValueError('Cut edge does not name a unique paired source edge')
    take=~np.isin(key[one],cut_key);one,two=one[take],two[take]
    first=np.r_[np.where(va[one]==low[one],a[one],b[one]),np.where(va[one]==high[one],a[one],b[one])]
    second=np.r_[np.where(va[two]==low[two],a[two],b[two]),np.where(va[two]==high[two],a[two],b[two])]
    graph=coo_matrix((np.ones(len(first),dtype=np.uint8),(first,second)),shape=(t.size,t.size)).tocsr()
    count,component=connected_components(graph,directed=False)
    smallest=np.full(count,t.size,dtype=np.uint32);np.minimum.at(smallest,component,np.arange(t.size,dtype=np.uint32))
    return smallest[component].reshape(-1,3)


if __name__=='__main__':
    directory=Path(sys.argv[1]);tri=np.fromfile(directory/'triangles.u32bin','<u4').reshape(-1,3);weld=np.fromfile(directory/'welds.u32bin','<u4');cuts=np.fromfile(directory/'cuts.u32bin','<u4').reshape(-1,2)
    result=reconstruct(tri,weld,cuts);result.astype('<u4').tofile(directory/'expected-corners.u32bin')
    print(json.dumps({'sourceFaces':len(tri),'cutEdges':len(cuts),'method':'Independent sparse source-corner graph connected components; canonical minimum original corner per fan'}))
