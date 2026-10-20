"""Isolated actual-source H02 left-hand grip experiment (no threshold changes)."""
import json, os, time
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares, minimize
from scipy.spatial.transform import Rotation

DIR=Path('.local/rig-candidates/h02-left-grip')
OUT=Path(os.environ.get('GRIP_SEARCH_DIR',str(DIR)))
OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((DIR/'input.json').read_text())
pos=np.array(data['positions']); ids=np.array(data['ids']); weights=np.array(data['weights'])
joints=data['joints']; names=[j['name'] for j in joints]
local=np.array([np.array(j['local']).reshape(4,4).T for j in joints])
bindworld=np.array([np.array(j['world']).reshape(4,4).T for j in joints])
ibm=np.array([np.array(j['inverse']).reshape(4,4).T for j in joints])
fingers=['Thumb','Index','Middle','Ring','Pinky']
fj=np.array([[names.index('LeftHand'+f+str(i+1)) for i in range(3)] for f in fingers])
frame=data['frame']; f=np.array(frame['f']); u=np.array(frame['u']); n=np.array(frame['n'])
radius=data['weapon']['shaftRadius']
ph=np.c_[pos,np.ones(len(pos))]
base=np.zeros((len(pos),3))
active=[]
for j in range(len(joints)):
    matches=(ids==j); weight=np.sum(matches*weights,axis=1)
    if j not in fj:
        base+=weight[:,None]*(ph@(bindworld[j]@ibm[j]).T)[:,:3]
    elif np.any(weight):
        sel=np.flatnonzero(weight>0)
        active.append((j,sel,weight[sel],ph[sel]))
initial=data['initial']['result']['fingers']
x0=np.array([v for finger in fingers for v in (initial[finger]['angles']+[initial[finger]['opposition']]+initial[finger]['twists'])]+[15,0,0,.004])
lower=np.array(([-30,-5,-5,-20,-10,-10,-10]*5)+[-10,-25,-35,.003])
upper=np.array(([90,100,80,20,10,10,10]*5)+[20,25,35,.005])
x0=np.clip(x0,lower+1e-8,upper-1e-8)

def normalized(a): return a/np.maximum(1e-14,np.linalg.norm(a,axis=-1,keepdims=True))

def forward(x):
    angles=x[:35].reshape(5,7)
    world=bindworld.copy()
    for k in range(5):
        for q,j in enumerate(fj[k]):
            rv=np.radians([angles[k,q],0,angles[k,3] if q==0 else 0])
            rot=Rotation.from_rotvec(rv).as_matrix()@Rotation.from_rotvec([0,np.radians(angles[k,q+4]),0]).as_matrix()
            loc=local[j].copy();loc[:3,:3]=loc[:3,:3]@rot
            world[j]=world[joints[j]['parent']]@loc
    posed=base.copy()
    for j,sel,weight,p in active:
        posed[sel]+=weight[:,None]*(p@(world[j]@ibm[j]).T)[:,:3]
    points=[]
    for k,finger in enumerate(fingers):
        chain=world[fj[k],:3,3]
        tip=np.r_[frame['fingers'][finger]['points'][3],1]@(world[fj[k,2]]@ibm[fj[k,2]]).T
        points.append(np.vstack([chain,tip[:3]]))
    return posed,np.array(points)

def evaluate(x,patch,report=False):
    posed,points=forward(x)
    corners=posed[patch['vertices']]
    palm=np.array(patch['bary'])@corners
    pn=normalized(np.cross(corners[1]-corners[0],corners[2]-corners[0]))
    if pn@patch['normal']<0:pn=-pn
    theta=np.radians(x[-4]);phi=np.radians(x[-3]);axis=normalized(u+f*np.tan(theta)+n*np.tan(phi))
    normal=normalized(pn-axis*(pn@axis))
    normal=Rotation.from_rotvec(axis*np.radians(x[-2])).apply(normal)
    center=palm+normal*(radius+x[-1])
    delta=posed-center;along=delta@axis
    radial=np.linalg.norm(delta-along[:,None]*axis,axis=1)
    a=points[:,:-1]-center;b=points[:,1:]-center
    ar=a-(a@axis)[...,None]*axis;br=b-(b@axis)[...,None]*axis
    line=br-ar;t=np.clip(-np.sum(ar*line,axis=-1)/np.maximum(1e-12,np.sum(line*line,axis=-1)),0,1)
    lineDist=np.linalg.norm(ar+t[...,None]*line,axis=-1)
    thickness=np.array([frame['fingers'][finger]['thickness'] for finger in fingers])
    capsule=np.maximum(0,radius+(thickness[:,:-1]+thickness[:,1:])*.25-lineDist)
    tip=points[:,-1]-center;tip=tip-(tip@axis)[:,None]*axis
    contact=-normal;sign=1 if np.cross(axis,contact)@f>=0 else -1
    wraps=np.degrees(np.arctan2(np.cross(np.tile(contact,(5,1)),tip)@axis,tip@contact))*sign
    total=np.sum(x[:35].reshape(5,7)[:,:3],axis=1)
    distance=np.linalg.norm(tip,axis=1)-radius
    residual=np.r_[
        np.maximum(0,radius-.0025-radial)*3000,
        np.maximum(0,capsule-.0028).ravel()*float(os.environ.get('CAPSULE_WEIGHT','2500')),
        np.maximum(0,150.2-total)*float(os.environ.get('ANGLE_WEIGHT','.5')),
        np.maximum(0,total-259.8)*float(os.environ.get('ANGLE_WEIGHT','.5')),
        np.maximum(0,100.2-wraps[1:])*float(os.environ.get('ANGLE_WEIGHT','.5')),
        np.maximum(0,90.2+wraps[:1])*float(os.environ.get('ANGLE_WEIGHT','.5')),
        np.maximum(0,np.abs(distance[:1])-.0245)*3000,
        max(0,.805-pn@normal)*100,
        max(0,.805-n@normal)*100,
        max(0,np.degrees(np.arccos(np.clip(axis@np.array(frame['gripAxis']),-1,1)))-24.8)*2,
        max(0,abs(np.degrees(np.arccos(np.clip(axis@f,-1,1)))-90)-19.8)*2,
        # A weak tip-surface preference leaves the hard contact residuals dominant.
        np.maximum(0,np.abs(distance)-.012)*3,
    ]
    if not report:return residual
    return dict(cost=float(np.sum(residual**2)),maximumCylinderIntrusion=float(np.max(radius-radial)),
        maximumCapsuleIntrusion=float(np.max(capsule)),facingDot=float(pn@normal),anatomicalFacingDot=float(n@normal),
        totalFlex=total.tolist(),signedWrap=wraps.tolist(),tipDistance=distance.tolist(),
        palm=palm.tolist(),palmNormal=pn.tolist(),shaftCenter=center.tolist(),shaftAxis=axis.tolist(),
        parameters=x.tolist(),patch=patch,gripAxisErrorDeg=float(np.degrees(np.arccos(np.clip(axis@np.array(frame['gripAxis']),-1,1)))),
        fingers={finger:dict(angles=x[k*7:k*7+3].tolist(),opposition=float(x[k*7+3]),twists=x[k*7+4:k*7+7].tolist(),points=points[k].tolist()) for k,finger in enumerate(fingers)},
        worstVertex=int(data['sourceIds'][np.argmin(radial)]))

started=time.time(); reports=[]
ratios=[float(v) for v in os.environ.get('PATCHES','0.95,1,1.02,1.1,0.8,0.65,0.5,1.2').split(',')]
for ratio in ratios:
    patch=next(p for p in data['patches'] if p['ratio']==ratio)
    seed=x0.copy()
    prior=OUT/f'patch-{ratio:g}.json'
    seedfile=Path(os.environ.get('GRIP_SEED_FILE',str(prior)))
    if seedfile.exists():
        seed=np.array(json.loads(seedfile.read_text())['parameters'])
        if len(seed)==38:seed=np.r_[seed[:-2],0,seed[-2:]]
    if 'START_PHI' in os.environ:seed[-3]=float(os.environ['START_PHI'])
    if 'START_ROLL' in os.environ:seed[-2]=float(os.environ['START_ROLL'])
    if 'START_THUMB_OPPOSITION' in os.environ:seed[3]=float(os.environ['START_THUMB_OPPOSITION'])
    seed=np.clip(seed,lower+1e-7,upper-1e-7)
    initialReport=evaluate(seed,patch,True)
    print('START',ratio,'cost',initialReport['cost'],'intrusion',initialReport['maximumCylinderIntrusion'],flush=True)
    method=os.environ.get('GRIP_SOLVER','least-squares')
    if method=='slsqp':
        cached={}
        def measured(x):
            key=x.tobytes()
            if cached.get('key')!=key:
                cached['key']=key;cached['report']=evaluate(x,patch,True)
            return cached['report']
        def constraints(x):
            r=measured(x);total=np.asarray(r['totalFlex']);wrap=np.asarray(r['signedWrap'])
            return np.r_[total-150.05,259.95-total,wrap[1:]-100.05,-90.05-wrap[:1],
                .0026-r['maximumCylinderIntrusion'],.0028-r['maximumCapsuleIntrusion'],
                r['facingDot']-.805,r['anatomicalFacingDot']-.805,24.8-r['gripAxisErrorDeg']]
        # Keep C2 requirements as constraints instead of allowing a soft cost to
        # exchange a failed finger wrap for a small source-surface improvement.
        solved=minimize(lambda x: measured(x)['cost'],seed,method='SLSQP',bounds=list(zip(lower,upper)),
            constraints=[{'type':'ineq','fun':constraints}],options={'maxiter':int(os.environ.get('MAX_NFEV','150')),'ftol':1e-8})
    elif method=='least-squares':
        solved=least_squares(evaluate,seed,args=(patch,),bounds=(lower,upper),max_nfev=int(os.environ.get('MAX_NFEV','100')),ftol=1e-6,xtol=1e-7,gtol=1e-5,x_scale='jac',diff_step=1e-4)
    else:
        raise ValueError('Unknown staging grip solver: '+method)
    report=evaluate(solved.x,patch,True)
    report.update(nfev=solved.nfev,elapsedSeconds=time.time()-started,rigSha256=data['rigSha256'],message=solved.message,solver=method,optimizerSuccess=bool(solved.success),
        scope='Cylinder and actual-skinned-source-vertex optimization only; requires independent exact weapon triangle proof before acceptance.',passed=False)
    prior.write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
    print('RESULT',ratio,{k:report[k] for k in ['cost','maximumCylinderIntrusion','maximumCapsuleIntrusion','facingDot','anatomicalFacingDot','totalFlex','signedWrap','tipDistance','nfev','elapsedSeconds']},flush=True)
    x0=solved.x.copy()
reports.sort(key=lambda r:r['cost'])
(OUT/'search.json').write_text(json.dumps(dict(rigSha256=data['rigSha256'],reports=reports,passed=False),indent=2)+'\n')
