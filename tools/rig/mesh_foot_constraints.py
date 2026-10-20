"""Offline floor residuals from unchanged, graph-selected source boot vertices."""
import hashlib,json
from pathlib import Path
import numpy as np


class MeshFootConstraints:
    def __init__(self,points,ids,weights,inverse_bind,joint_names,selection):
        self.names=joint_names;self.rows={}
        assert points.shape[1]==3 and ids.shape==weights.shape==(len(points),4)
        assert inverse_bind.shape==(len(joint_names),4,4)
        assert np.isfinite(points).all() and np.isfinite(weights).all() and weights.min()>=0
        assert np.max(np.abs(weights.sum(1)-1))<1e-5 and ids.max()<len(joint_names)
        for side in ['Left','Right']:
            selected=np.asarray(selection['sides'][side]['vertexIds'],dtype=np.int64)
            sole_ids=np.asarray(selection['sides'][side]['soleVertexIds'],dtype=np.int64)
            assert len(selected)>0 and selected.min()>=0 and selected.max()<len(points)
            sole=np.isin(selected,sole_ids);assert sole.any() and set(sole_ids).issubset(set(selected))
            xyz=np.c_[points[selected],np.ones(len(selected))]
            local=np.einsum('nkij,nj->nki',inverse_bind[ids[selected]],xyz)[:,:,:3]
            self.rows[side]={'ids':ids[selected],'weights':weights[selected],'local':local,'sole':sole,'bindY':points[selected,1]}

    def measure(self,world_position,world_rotation):
        positions=np.array([world_position[n]for n in self.names]);rotations=np.array([world_rotation[n]for n in self.names]);result={}
        for side,row in self.rows.items():
            y=np.sum((np.einsum('nkj,nkj->nk',rotations[row['ids'],1,:],row['local'])+positions[row['ids'],1])*row['weights'],axis=1)
            sole=y[row['sole']]
            result[side]={'minimumY':float(y.min()),'maximumY':float(y.max()),'soleMinimumY':float(sole.min()),'soleMaximumY':float(sole.max()),'soleMaximumVerticalError':float(np.max(np.abs(sole-row['bindY'][row['sole']])))}
        return result


def load_source_foot_constraints(directory):
    directory=Path(directory);solve=json.loads((directory/'solve.json').read_text());base=Path(solve['base']);meta=json.loads((base/'input.json').read_text());selection=json.loads((base/'selection.json').read_text())
    assert meta['sourceSha256']==selection['sourceSha256']==solve['sourceSha256']
    for root,hashes in [(base,solve['inputHashes']),(directory,solve['outputHashes'])]:
        for name,digest in hashes.items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest
    # glTF matrices are column-major; convert to the ordinary row/column array.
    ibm=np.asarray(meta['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
    return MeshFootConstraints(np.fromfile(base/'positions.bin','<f4').reshape(-1,3).astype(float),np.fromfile(directory/'result-ids.bin','<u2').reshape(-1,4),np.fromfile(directory/'result-weights.bin','<f4').reshape(-1,4).astype(float),ibm,meta['joints'],selection)
