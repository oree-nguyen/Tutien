"""Source-topology lower-body support trial, with immutable hand fields.

Boot/pant cores are actual sole-connected source components below an explicit
inspection crop (600mm for H02, 300mm for the current H01 trial).
No coordinate-nearness weld or whole-box leg label is introduced. Above the
core the original source FEM connects to the unchanged waist boundary.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path
import numpy as np
from scipy.sparse.csgraph import connected_components
from scipy.sparse import diags
from source_garment_graph import source_fem_laplacian,solve_support_fields,sparsify_four_influences
from lower_leg_domains import source_leg_domains


def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()


def smooth(t):
    t=np.clip(t,0,1)
    return t*t*(3-2*t)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('base',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--all-fields',action='store_true');parser.add_argument('--whole-body',action='store_true');parser.add_argument('--screen-metres',type=float,default=0);parser.add_argument('--component-crop',type=float,default=.60);parser.add_argument('--core-below',type=float,default=.55);parser.add_argument('--nonnegative-method',choices=['active-set','projected-newton'],default='active-set');args=parser.parse_args()
    assert np.isfinite(args.screen_metres) and args.screen_metres>=0
    assert np.isfinite(args.component_crop) and np.isfinite(args.core_below) and 0<args.core_below<args.component_crop
    assert not args.whole_body or args.all_fields,'Whole body continuation must solve every joint field'
    assert args.base.resolve()!=args.output.resolve();args.output.mkdir(parents=True,exist_ok=True);started=time.monotonic()
    meta=json.loads((args.base/'input.json').read_text());selection=json.loads((args.base/'selection.json').read_text());hero=meta['hero'];assert hero in ['H01','H02'] and selection['hero']==hero and selection['sourceSha256']==meta['sourceSha256']
    source=np.fromfile(args.base/'positions.bin','<f4').reshape(-1,3).astype(float);triangles=np.fromfile(args.base/'triangles.bin','<u4').reshape(-1,3);weld=np.fromfile(args.base/'source-welds.u32bin','<u4')
    _,reps,inverse=np.unique(weld,return_index=True,return_inverse=True);p=source[reps];tri=inverse[triangles]
    ids=np.fromfile(args.base/'ids.bin','<u2').reshape(-1,4);weights=np.fromfile(args.base/'weights.bin','<f4').reshape(-1,4);joint_names=meta['joints'];names={name:i for i,name in enumerate(joint_names)}
    dense=np.zeros((len(p),len(joint_names)));counts=np.bincount(inverse)
    for k in range(4):np.add.at(dense,(inverse,ids[:,k]),weights[:,k])
    dense/=counts[:,None]
    hands=json.loads(Path('data/rig/hand-frames.json').read_text())['heroes'][hero]['hands'];protected=np.zeros(len(source),bool)
    for frame in hands.values():
        landmarks=np.array([frame['wrist']]+[point for f in frame['fingers'].values() for point in f['points']]);low=landmarks.min(0)-.022;high=landmarks.max(0)+.022;protected|=np.all((source>=low)&(source<=high),axis=1)
    finger_ids=[i for i,name in enumerate(joint_names) if any('Hand'+f in name for f in ['Thumb','Index','Middle','Ring','Pinky'])]
    protected|=np.any(np.isin(ids,finger_ids)&(weights>1e-8),axis=1);original=protected.copy()
    for k in range(3):np.logical_or.at(protected,triangles[:,(k+1)%3],original[triangles[:,k]]);np.logical_or.at(protected,triangles[:,k],original[triangles[:,(k+1)%3]])
    protected_group=np.zeros(len(p),bool);np.logical_or.at(protected_group,inverse,protected)
    # Derive leg cores from original triangles below the inspection plane.
    domains=source_leg_domains(p,tri,inverse,selection['sides'],args.component_crop)
    labels=np.zeros(len(p),dtype=np.uint8);cores={}
    for label,side in [(1,'Left'),(2,'Right')]:
        selected=domains[side]
        labels[selected]=label;core=selected&(p[:,1]<args.core_below)&~protected_group
        ankle=np.asarray(meta['jointPositions'][side+'Foot']);knee=np.asarray(meta['jointPositions'][side+'Leg']);
        shin=smooth((p[:,1]-(ankle[1]-.04))/.16);thigh=smooth((p[:,1]-(knee[1]-.08))/.16)
        foot=1-shin;leg=shin*(1-thigh);upper=shin*thigh;sole=selected&(p[:,1]<=.01);foot[sole]=1;leg[sole]=0;upper[sole]=0
        dense[core]=0;dense[core,names[side+'Foot']]=foot[core];dense[core,names[side+'Leg']]=leg[core];dense[core,names[side+'UpLeg']]=upper[core]
        cores[side]={'sourceVertices':int(selected[inverse].sum()),'hardSourceVertices':int(core[inverse].sum()),'bounds':[p[selected].min(0).tolist(),p[selected].max(0).tolist()]}
    upper_boundary=1.66 if args.whole_body else .95
    fixed=(p[:,1]>=upper_boundary)|protected_group|((labels>0)&(p[:,1]<args.core_below));free=~fixed
    stiffness,mass,operator=source_fem_laplacian(p,tri);adj=stiffness.copy();adj.setdiag(0);adj.eliminate_zeros()
    count,cc=connected_components(adj[free][:,free],directed=False);touches=np.asarray(abs(adj[free][:,fixed]).sum(1)).ravel()>0;anchored=np.zeros(count,bool);np.logical_or.at(anchored,cc,touches)
    free_indices=np.flatnonzero(free);free[free_indices[~anchored[cc]]]=False;fixed=~free
    lower_names=['Hips']+[side+part for side in ['Left','Right']for part in ['UpLeg','Leg','Foot','ToeBase']]
    if args.all_fields:lower_names=joint_names.copy()
    lower_ids=np.asarray([names[name]for name in lower_names],dtype=np.int64);other_ids=np.asarray([i for i in range(len(joint_names))if i not in lower_ids],dtype=np.int64)
    matrix=stiffness[free][:,free].tocsr();rhs=-stiffness[free][:,fixed]@dense[fixed][:,lower_ids]
    if args.screen_metres:
        screen=mass[free]/args.screen_metres**2
        matrix=matrix+diags(screen);rhs=rhs+screen[:,None]*dense[free][:,lower_ids]
    print(json.dumps({'freeGroups':int(free.sum()),'protectedSourceVertices':int(protected.sum()),'cores':cores}),flush=True)
    import pyamg
    hierarchy=pyamg.smoothed_aggregation_solver(matrix,symmetry='symmetric',max_levels=12,max_coarse=500,coarse_solver='splu')
    solved,details=solve_support_fields(matrix,rhs,dense[free][:,lower_ids],lower_names,hierarchy.aspreconditioner(cycle='V'),nonnegative=True,nonnegative_method=args.nonnegative_method)
    assert np.isfinite(solved).all() and solved.min()>-1e-4;solved=np.maximum(solved,0)
    remaining=1-dense[free][:,other_ids].sum(1);total=solved.sum(1);assert remaining.min()>-1e-6 and np.all(total[remaining>1e-12]>0)
    solved=np.divide(solved,total[:,None],out=np.zeros_like(solved),where=total[:,None]>0)*np.maximum(remaining,0)[:,None]
    dense[np.ix_(np.flatnonzero(free),lower_ids)]=solved
    top,amount,discarded=sparsify_four_influences(dense);changed=(free|((labels>0)&(p[:,1]<args.core_below)))&~protected_group
    result_ids=ids.copy();result_weights=weights.copy();selected=changed[inverse];result_ids[selected]=top[inverse[selected]];result_weights[selected]=amount[inverse[selected]]
    assert np.array_equal(result_ids[protected],ids[protected]) and np.array_equal(result_weights[protected],weights[protected]);assert np.isfinite(result_weights).all() and result_weights.min()>=0 and np.max(np.abs(result_weights.sum(1)-1))<1e-5
    result_ids.astype('<u2').tofile(args.output/'result-ids.bin');result_weights.astype('<f4').tofile(args.output/'result-weights.bin');protected.astype('u1').tofile(args.output/'protected.bin');labels[inverse].tofile(args.output/'leg-core-domain.bin')
    report={'hero':hero,'base':str(args.base),'input':meta['input'],'inputSha256':meta['inputSha256'],'source':meta['source'],'sourceSha256':meta['sourceSha256'],'componentCropMetres':args.component_crop,'coreBelowMetres':args.core_below,
        'cores':cores,'protectedSourceVertices':int(protected.sum()),'changedSourceVertices':int(selected.sum()),'freeGroups':int(free.sum()),'operator':operator,'lowerFields':lower_names,'nonLowerFieldsRetainedBeforeProjection':not args.all_fields,'nonnegativeMethod':args.nonnegative_method,'wholeBody':args.whole_body,'upperBoundaryMetres':upper_boundary,'screenMetres':args.screen_metres,'solves':details,'maximumDiscardedInfluence':float(discarded.max()),'elapsedSeconds':time.monotonic()-started,
        'inputHashes':{name:digest(args.base/name)for name in ['positions.bin','triangles.bin','source-welds.u32bin','ids.bin','weights.bin','input.json','selection.json']},
        'outputHashes':{name:digest(args.output/name)for name in ['result-ids.bin','result-weights.bin','protected.bin','leg-core-domain.bin']},'accepted':False,'activated':False,
        'scope':'Source-connected lower leg cores, anatomical Foot/Leg/UpLeg targets and bounded FEM continuation to unchanged waist. Original geometry/UV/images/bones/clips unchanged. Floor, all-mesh, volume, collision, animation and visual checks remain required.'}
    (args.output/'solve.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'seconds':report['elapsedSeconds'],'changed':report['changedSourceVertices'],'accepted':False}),flush=True)


if __name__=='__main__':main()
