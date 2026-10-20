"""Bounded calibrated FK stance fitting; never changes source skeleton lengths/scales.
Ground/foot residuals are measured after solving; solver success is not pose acceptance.
"""
import hashlib,json,os
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares,minimize
from scipy.spatial.transform import Rotation
from stance_direction import measure_torso,reference_torso_valid
from mesh_foot_constraints import load_source_foot_constraints

hero=os.environ.get('HERO','H01')
mesh_foot=load_source_foot_constraints(os.environ['FIT_MESH_FOOT_SOURCE']) if os.environ.get('FIT_MESH_FOOT_SOURCE') else None
profile=os.environ.get('FIT_PROFILE','reference')
position_weight=200 if profile=='reference' else 40
orientation_weight=200 if profile=='reference' else 4
torso_weight=10 if profile=='reference' else .05
knee_weight=200 if profile=='reference' else 4
frames=json.loads(Path('data/rig/bind-frames.json').read_text())['heroes'][hero]['joints']
hands=json.loads(Path('data/rig/hand-frames.json').read_text())['heroes'][hero]['hands']
limits=json.loads(Path('data/rig/joint-limits.json').read_text())
names=list(frames)
parent={n:frames[n]['parent'] for n in names}
bind_p={n:np.array(frames[n]['bindPosition']) for n in names}
bind_r={n:Rotation.from_quat(frames[n]['bindRotation']).as_matrix() for n in names}
canonical={n:Rotation.from_quat(frames[n]['canonicalLocal']).as_matrix() for n in names}

def fk(rotations,hip):
    wp,wr={},{}
    for n in names:
        p=hip if n=='Hips' else bind_p[n]
        local=rotations.get(n,bind_r[n])
        par=parent[n]
        if par in wr:wp[n]=wp[par]+wr[par]@p;wr[n]=wr[par]@local
        else:wp[n]=p.copy();wr[n]=local.copy()
    return wp,wr
bp,br=fk({},bind_p['Hips'])
palm_local=br['RightHand'].T@(np.array(hands['Right']['palmCenter'])-bp['RightHand'])
normal_local=br['RightHand'].T@np.array(hands['Right']['n'])
anchors={s:bp[s+'Foot'].copy() for s in ('Left','Right')}
anchor_joints={s:s+'Foot' for s in anchors}
if hero=='H01' and os.environ.get('FIT_ASYMMETRIC','1')=='1':
    anchors={'Left':np.array([.16,.12,.16]),'Right':np.array([-.12,.065,-.22])}
    anchor_joints['Right']='RightToeBase'
if hero=='H02':
    for s in anchors:anchors[s][0]=.375 if s=='Left' else -.375
variables=[('Hips','tx',-.24,.24),('Hips','ty',.035,float(bp['Hips'][1])),('Hips','tz',-.55,.4)]
if hero in ('H01','H02'):
    anchor_bounds=[('Left',(.12,.40),(.10,.50)),('Right',(-.30,-.08),(-.52,-.16))] if hero=='H01' else [('Left',(.37525,.50),(-.08,.08)),('Right',(-.50,-.37525),(-.08,.08))]
    for side,xb,zb in anchor_bounds:
        variables.extend([(side+'Anchor','tx',*xb),(side+'Anchor','tz',*zb)])
        if mesh_foot:variables.append((side+'Anchor','ty',-.12,.20))
for axis,bounds in [('flex',[-15,15]),('lateral',[-15,15]),('twist',[-10,10])]:variables.append(('Hips',axis,*bounds))
for n in ('Spine','Spine1','Spine2'):variables.append((n,'flex',-15,25))
for axis in ('lateral','twist'):variables.append(('Spine2',axis,*limits['spine'][axis]))
for s in ('Left','Right'):
    for suffix in ('UpLeg','Leg','Foot'):
        n=s+suffix
        for axis in ('flex','lateral','twist'):
            bounds=limits[frames[n]['type']][axis]
            if hero=='H02' and axis=='flex':
                if suffix=='Leg':bounds=[120,140]
                if suffix=='UpLeg':bounds=[105,120]
            variables.append((n,axis,*bounds))
for suffix in ('Arm','ForeArm','Hand'):
    n='Right'+suffix
    for axis in (('flex',) if suffix=='ForeArm' else ('flex','lateral','twist')):
        lo,hi=limits['wristGround' if suffix=='Hand' else frames[n]['type']][axis]
        if suffix=='ForeArm':lo,hi=0,10
        variables.append((n,axis,lo,hi))
if hero=='H01':
    for suffix in ('Arm','ForeArm','Hand'):
        n='Left'+suffix
        for axis in (('flex',) if suffix=='ForeArm' else ('flex','lateral','twist')):
            lo,hi=limits[frames[n]['type']][axis]
            if suffix=='ForeArm':lo,hi=60,90
            variables.append((n,axis,lo,hi))
low=np.array([x[2] for x in variables]);high=np.array([x[3] for x in variables])

def decode(x):
    hip=bind_p['Hips'].copy();a={};active_anchors={s:v.copy() for s,v in anchors.items()}
    for value,(n,axis,*_) in zip(x,variables):
        if n.endswith('Anchor'):active_anchors[n[:-6]]['xyz'.index(axis[1])]=value
        elif axis.startswith('t') and len(axis)==2:hip['xyz'.index(axis[1])]=value
        else:a.setdefault(n,{'flex':0.,'lateral':0.,'twist':0.})[axis]=value
    r={}
    for n,angles in a.items():
        f=frames[n];swing=np.deg2rad([angles['flex'],0,angles['lateral']*f.get('lateralSign',1)])
        twist=Rotation.from_rotvec([0,np.deg2rad(angles['twist']*f.get('twistSign',1)),0]).as_matrix()
        r[n]=bind_r[n]@canonical[n]@Rotation.from_rotvec(swing).as_matrix()@twist@canonical[n].T
    return r,hip,a,active_anchors

def evaluate(x,regularize=True):
    r,hip,a,active_anchors=decode(x);p,w=fk(r,hip);palm=p['RightHand']+w['RightHand']@palm_local;normal=w['RightHand']@normal_local
    residual=[]
    for s in ('Left','Right'):
        residual.extend((p[anchor_joints[s]]-active_anchors[s])*position_weight)
        if anchor_joints[s].endswith('Foot'):residual.extend(Rotation.from_matrix(br[s+'Foot'].T@w[s+'Foot']).as_rotvec()*orientation_weight)
        # Natural knees face forward and remain on their own side.
        residual.extend([max(0,-p[s+'Leg'][2])*.5,max(0,(-1 if s=='Left' else 1)*p[s+'Leg'][0])*.5])
    residual.extend([palm[1]*position_weight,normal[0]*orientation_weight,(normal[1]+1)*orientation_weight,normal[2]*orientation_weight])
    residual.extend([max(0,palm[0]+.12)*5,max(0,-palm[0]-.65)*5,max(0,-palm[2])*.5,max(0,palm[2]-.6)*.5])
    torso=measure_torso(w['Spine2']);tilt=torso['tilt'];pelvis=measure_torso(w['Hips'])['tilt']
    residual.append(max(0,tilt-25)*torso_weight)
    residual.append(max(0,15-torso['forwardLean'],torso['forwardLean']-25)*torso_weight)
    residual.append(max(0,pelvis-15)*torso_weight)
    if hero=='H01':residual.extend([max(0,p['RightLeg'][1]-.08)*knee_weight,max(0,-p['RightLeg'][1])*knee_weight])
    if hero=='H01':
        residual.extend((p['LeftHand']-p['LeftLeg']-np.array([0,.07,.03]))*5)
        for s in anchors:residual.extend((active_anchors[s]-anchors[s])*.2)
    mesh_contact=mesh_foot.measure(p,w) if mesh_foot else None
    if mesh_contact:
        for side in anchors:residual.append(mesh_contact[side]['minimumY']*position_weight)
        residual.append(mesh_contact['Left']['soleMaximumVerticalError']*position_weight)
    if regularize:
        residual.extend((x-np.clip(np.zeros(len(x)),low,high))*.00008)
        residual.append((tilt-22)*.0005)
    return np.array(residual),{'p':p,'w':w,'palm':palm,'normal':normal,'tilt':tilt,'pelvisTilt':pelvis,'forwardLean':torso['forwardLean'],'lateralLean':torso['lateralLean'],'hip':hip,'angles':a,'rotations':r,'activeAnchors':active_anchors,'meshFoot':mesh_contact}

best=None;attempts=[]
warm=json.loads(Path(os.environ['FIT_WARM_START']).read_text()) if os.environ.get('FIT_WARM_START') else None
starts=((.12,-.15),) if warm else ((.12,-.15),(.22,-.25),(.32,-.35),(.15,.05))
for hy,hz in starts:
    x=np.clip(np.zeros(len(variables)),low+1e-6,high-1e-6)
    for i,(n,axis,*_) in enumerate(variables):
        if n.endswith('Anchor'):x[i]=anchors[n[:-6]]['xyz'.index(axis[1])]
    initial={('Hips','ty'):hy,('Hips','tz'):hz,('Spine','flex'):7,('Spine1','flex'):7,('Spine2','flex'):7,
             ('RightArm','flex'):45,('RightArm','lateral'):15,('RightHand','flex'):-60}
    for i,(n,axis,*_) in enumerate(variables):
        value=initial.get((n,axis),120 if axis=='flex' and n.endswith('Leg') and not n.endswith('UpLeg') else 75 if n.endswith('UpLeg') and axis=='flex' else x[i])
        x[i]=np.clip(value,low[i]+1e-6,high[i]-1e-6)
    if warm:
        for i,(n,axis,*_) in enumerate(variables):
            value=warm['anchors'][n[:-6]]['xyz'.index(axis[1])] if n.endswith('Anchor') else warm['translations']['Hips']['xyz'.index(axis[1])] if axis.startswith('t') and len(axis)==2 else warm['angles'].get(n,{}).get(axis,x[i])
            x[i]=np.clip(value,low[i]+1e-8,high[i]-1e-8)
    result=least_squares(lambda y:evaluate(y)[0],x,bounds=(low,high),max_nfev=int(os.environ.get('FIT_MAX_EVAL','500')),ftol=1e-10,xtol=1e-10,gtol=1e-9,x_scale='jac')
    attempts.append({'initialHip':[hy,hz],'cost':float(result.cost),'success':bool(result.success),'nfev':int(result.nfev),'message':result.message})
    if best is None or result.cost<best.cost:best=result
_,e=evaluate(best.x)
if os.environ.get('FIT_HARD_STANCE','0')=='1':
    def physical_constraints(x):
        _,k=evaluate(x)
        # Aim strictly inside the unchanged acceptance bounds. A solution on a
        # boundary must not require an outward numerical tolerance to pass.
        angular_margin=1e-4;position_margin=1e-7
        values=[26-angular_margin-k['tilt'],k['forwardLean']-15-angular_margin,25-angular_margin-k['forwardLean'],15-angular_margin-k['pelvisTilt'],.015-position_margin-abs(k['palm'][1]),-.85-1e-6-k['normal'][1]]
        for side in anchors:
            values.append(.005-position_margin-np.linalg.norm(k['p'][anchor_joints[side]]-k['activeAnchors'][side]))
            if anchor_joints[side].endswith('Foot'):values.append(1-angular_margin-np.degrees(Rotation.from_matrix(br[side+'Foot'].T@k['w'][side+'Foot']).magnitude()))
        if mesh_foot:
            for side in anchors:values.extend([k['meshFoot'][side]['minimumY']+.004,.004-k['meshFoot'][side]['minimumY']])
            values.append(.004-k['meshFoot']['Left']['soleMaximumVerticalError'])
        if hero=='H01':values.extend([k['p']['RightLeg'][1]-position_margin,.08-position_margin-k['p']['RightLeg'][1]])
        else:
            width=abs(k['p']['LeftFoot'][0]-k['p']['RightFoot'][0])/np.linalg.norm(bp['LeftArm']-bp['RightArm']);values.extend([width-1.5-1e-4,2-1e-4-width])
        return np.asarray(values)
    hard=minimize((lambda x:0.) if os.environ.get('FIT_HARD_FEASIBLE')=='1' else (lambda x:float(np.sum(evaluate(x)[0]**2))),best.x,method='SLSQP',bounds=list(zip(low,high)),constraints=[{'type':'ineq','fun':physical_constraints}],options={'maxiter':int(os.environ.get('FIT_HARD_ITER','600')),'ftol':1e-10})
    attempts.append({'method':'SLSQP hard world-forward torso, pelvis, exact hand/foot and hero-specific stance constraints','success':bool(hard.success),'message':hard.message,'iterations':int(hard.nit),'minimumConstraint':float(np.min(physical_constraints(hard.x)))})
    best.x=hard.x;best.success=hard.success;best.cost=float(hard.fun/2);_,e=evaluate(best.x)
if os.environ.get('FIT_HARD_REFERENCE','0')=='1':
    def constraints(x):
        _,k=evaluate(x)
        foot=np.linalg.norm(k['p']['LeftFoot']-k['activeAnchors']['Left'])
        flat=np.degrees(Rotation.from_matrix(br['LeftFoot'].T@k['w']['LeftFoot']).magnitude())
        toe=np.linalg.norm(k['p'][anchor_joints['Right']]-k['activeAnchors']['Right'])
        margin=os.environ.get('FIT_MARGIN','0')=='1'
        return np.array([k['p']['RightLeg'][1],(.075 if margin else .08)-k['p']['RightLeg'][1],(25.8 if margin else 26)-k['tilt'],k['forwardLean']-15,25-k['forwardLean'],(.002 if margin else .005)-foot,(.002 if margin else .005)-toe,(.8 if margin else 1)-flat,(.01 if margin else .015)-abs(k['palm'][1]),(-0.87 if margin else -0.85)-k['normal'][1]])
    hard=minimize((lambda x:0.) if os.environ.get('FIT_HARD_FEASIBLE')=='1' else (lambda x:float(np.sum(evaluate(x)[0]**2))),best.x,method='SLSQP',bounds=list(zip(low,high)),constraints=[{'type':'ineq','fun':constraints}],options={'maxiter':int(os.environ.get('FIT_HARD_ITER','600')),'ftol':1e-9})
    attempts.append({'method':'SLSQP hard knee/torso/left-foot constraints','success':bool(hard.success),'message':hard.message,'iterations':int(hard.nit),'minimumConstraint':float(min(constraints(hard.x)))})
    # Keep this distinct even on failure; acceptance checks below retain all residuals.
    best.x=hard.x;best.success=hard.success;best.cost=float(hard.fun/2)
    _,e=evaluate(best.x)
foot_errors={s:float(np.linalg.norm(e['p'][anchor_joints[s]]-e['activeAnchors'][s])) for s in anchors}
foot_angle={s:float(np.degrees(Rotation.from_matrix(br[s+'Foot'].T@e['w'][s+'Foot']).magnitude())) for s in anchors if anchor_joints[s].endswith('Foot')}
stance_width=float(abs(e['p']['LeftFoot'][0]-e['p']['RightFoot'][0])/np.linalg.norm(bp['LeftArm']-bp['RightArm']))
passed=(hero!='H02' or 1.5<=stance_width<=2) and max(foot_errors.values())<=.005 and max(foot_angle.values())<=1 and abs(e['palm'][1])<=.015 and e['normal'][1]<=-.85 and reference_torso_valid(e['w']['Spine2']) and e['pelvisTilt']<=15 and (hero!='H01' or 0<=e['p']['RightLeg'][1]<=.08)
if mesh_foot:passed=passed and all(abs(e['meshFoot'][s]['minimumY'])<=.005 for s in anchors) and e['meshFoot']['Left']['soleMaximumVerticalError']<=.005
output={'hero':hero,'profile':profile,'scope':'Bounded calibrated FK stance; source mesh/sole/strain acceptance not inferred','passed':bool(passed),'activated':False,
        'fitConfiguration':{'meshFootSource':os.environ.get('FIT_MESH_FOOT_SOURCE'),'meshFootSolveSha256':hashlib.sha256(Path(os.environ['FIT_MESH_FOOT_SOURCE'],'solve.json').read_bytes()).hexdigest() if mesh_foot else None,'warmStart':os.environ.get('FIT_WARM_START'),'warmStartSha256':hashlib.sha256(Path(os.environ['FIT_WARM_START']).read_bytes()).hexdigest() if os.environ.get('FIT_WARM_START') else None,'hardReference':os.environ.get('FIT_HARD_REFERENCE')=='1','hardWorldStance':os.environ.get('FIT_HARD_STANCE')=='1','hardFeasibilityOnly':os.environ.get('FIT_HARD_FEASIBLE')=='1','interiorContactMargins':os.environ.get('FIT_MARGIN')=='1','variables':variables},
        'attempts':attempts,'solverConverged':bool(best.success),'cost':float(best.cost),
        'metrics':{'stanceWidthInShoulders':float(abs(e['p']['LeftFoot'][0]-e['p']['RightFoot'][0])/np.linalg.norm(bp['LeftArm']-bp['RightArm'])),'footPositionErrors':foot_errors,'footRotationErrorsDegrees':foot_angle,'groundPalmHeight':float(e['palm'][1]),'groundPalmUpDot':float(e['normal'][1]),'torsoTiltDegrees':float(e['tilt']),'torsoForwardLeanDegrees':e['forwardLean'],'torsoLateralLeanDegrees':e['lateralLean'],'pelvisTiltDegrees':e['pelvisTilt'],'rightKneeHeight':float(e['p']['RightLeg'][1]),'hipFlexDegrees':{side:float(e['angles'][side+'UpLeg']['flex']) for side in ('Left','Right')},'kneeFlexDegrees':{side:float(e['angles'][side+'Leg']['flex']) for side in ('Left','Right')}},
        'groundPalm':e['palm'].tolist(),'anchors':{s:a.tolist() for s,a in e['activeAnchors'].items()},'anchorJoints':anchor_joints,'meshFoot':e['meshFoot'],
        'footPositions':{s:e['p'][s+'Foot'].tolist() for s in anchors},'footRotations':{s:Rotation.from_matrix(e['w'][s+'Foot']).as_quat().tolist() for s in anchors},
        'angles':e['angles'],'rotations':{n:Rotation.from_matrix(r).as_quat().tolist() for n,r in e['rotations'].items()},'translations':{'Hips':e['hip'].tolist()},
        'jointLimitsSha256':hashlib.sha256(Path('data/rig/joint-limits.json').read_bytes()).hexdigest(),
        'bindFramesSha256':hashlib.sha256(Path('data/rig/bind-frames.json').read_bytes()).hexdigest(),
        'handFramesSha256':hashlib.sha256(Path('data/rig/hand-frames.json').read_bytes()).hexdigest()}
p=Path(os.environ.get('STANCE_OUTPUT_DIR','.local/rig-candidates/stances'));p.mkdir(parents=True,exist_ok=True)
(p/f'{hero}-ground.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps({k:v for k,v in output.items() if k not in ('rotations','angles')},indent=2))
