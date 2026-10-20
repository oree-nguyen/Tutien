"""Derive bounded boot domains from actual source connectivity and sole IDs."""
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


def source_leg_domains(points, triangles, source_to_group, sides, crop):
    assert np.isfinite(crop) and crop>0
    below=np.all(points[triangles,1]<crop,axis=1)
    tri=triangles[below]
    assert len(tri),'Inspection crop contains no source triangles'
    edges=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]])
    graph=coo_matrix((np.ones(len(edges)),(edges[:,0],edges[:,1])),shape=(len(points),len(points))).tocsr()
    _,components=connected_components(graph,directed=False)
    result={};occupied=np.zeros(len(points),bool)
    for side in ['Left','Right']:
        seeds=np.asarray(sides[side]['soleVertexIds'],dtype=np.int64)
        assert len(seeds)>0 and seeds.min()>=0 and seeds.max()<len(source_to_group),'Missing or invalid source sole IDs'
        groups=source_to_group[seeds]
        assert np.all(points[groups,1]<crop),'Sole lies outside crop'
        labels=np.unique(components[groups])
        assert len(labels)==1,'Source sole is not a connected domain'
        selected=components==labels[0]
        assert not np.any(occupied&selected),'Left/right boot domains merged'
        assert np.all(points[selected,0]*(1 if side=='Left'else -1)>0),'Source boot component crosses body midline; crop includes attached clothing'
        occupied|=selected;result[side]=selected
    return result
