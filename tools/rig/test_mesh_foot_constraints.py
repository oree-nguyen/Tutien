import unittest
import numpy as np
from scipy.spatial.transform import Rotation
from mesh_foot_constraints import MeshFootConstraints


class SourceFootFloor(unittest.TestCase):
    def fixture(self):
        p=np.array([[.1,.001,0],[.1,.2,.1],[-.1,.002,0],[-.1,.2,.1]])
        ids=np.tile([0,1,0,0],(4,1));weights=np.array([[1,0,0,0],[.2,.8,0,0],[.6,.4,0,0],[0,1,0,0]])
        bind=[]
        for xyz,angles in [([.03,.8,.1],[20,10,30]),([-.1,.2,-.3],[-10,45,20])]:
            m=np.eye(4);m[:3,:3]=Rotation.from_euler('xyz',angles,degrees=True).as_matrix();m[:3,3]=xyz;bind.append(m)
        selection={'sides':{'Left':{'vertexIds':[0,1],'soleVertexIds':[0]},'Right':{'vertexIds':[2,3],'soleVertexIds':[2]}}}
        return p,ids,weights,np.array(bind),selection

    def test_real_foot_vertices_match_independent_matrix_skinning_with_mixed_weights(self):
        p,ids,weights,bind,selection=self.fixture();inverse=np.linalg.inv(bind);names=['Foot','Leg']
        world=bind.copy();world[0,:3,:3]=Rotation.from_euler('x',45,degrees=True).as_matrix();world[1,:3,3]+=[.1,-.3,.2]
        result=MeshFootConstraints(p,ids,weights,inverse,names,selection).measure(dict(zip(names,world[:,:3,3])),dict(zip(names,world[:,:3,:3])))
        oracle=[]
        for i,point in enumerate(p):
            y=0
            for j,w in zip(ids[i],weights[i]):y+=w*(world[j]@inverse[j]@np.r_[point,1])[1]
            oracle.append(y)
        for side,indices in [('Left',[0,1]),('Right',[2,3])]:
            self.assertAlmostEqual(result[side]['minimumY'],min(oracle[i]for i in indices),places=12)
            self.assertAlmostEqual(result[side]['soleMinimumY'],oracle[indices[0]],places=12)
            self.assertAlmostEqual(result[side]['soleMaximumVerticalError'],abs(oracle[indices[0]]-p[indices[0],1]),places=12)

    def test_bind_pose_is_source_identity_and_missing_sole_is_rejected(self):
        p,ids,weights,bind,selection=self.fixture();names=['Foot','Leg'];r=MeshFootConstraints(p,ids,weights,np.linalg.inv(bind),names,selection)
        result=r.measure(dict(zip(names,bind[:,:3,3])),dict(zip(names,bind[:,:3,:3])))
        self.assertLess(result['Left']['soleMaximumVerticalError'],1e-14);self.assertLess(result['Right']['soleMaximumVerticalError'],1e-14)
        selection['sides']['Right']['soleVertexIds']=[0]
        with self.assertRaises(AssertionError):MeshFootConstraints(p,ids,weights,np.linalg.inv(bind),names,selection)


if __name__=='__main__':unittest.main()
