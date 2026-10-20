"""World-space torso direction; absolute tilt alone cannot certify a crouch."""
import numpy as np


def measure_torso(rotation):
    r=np.asarray(rotation,dtype=float)
    if r.shape!=(3,3) or not np.isfinite(r).all() or not np.allclose(r.T@r,np.eye(3),atol=1e-6) or abs(np.linalg.det(r)-1)>1e-6:
        raise ValueError('Torso direction requires a finite proper rotation')
    up=r@np.array([0.,1.,0.])
    return {'tilt':float(np.degrees(np.arccos(np.clip(up[1],-1,1)))),
            'forwardLean':float(np.degrees(np.arctan2(up[2],up[1]))),
            'lateralLean':float(np.degrees(np.arctan2(up[0],up[1])))}


def reference_torso_valid(rotation):
    m=measure_torso(rotation)
    return m['tilt']<=26 and 15<=m['forwardLean']<=25
