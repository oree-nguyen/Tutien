"""Compile explicit sleeve/lower-robe source cuts, retaining every source corner.

Only the two lower sleeve/robe interfaces are opened. All other original edge
adjacencies remain sewn. Output is an unapproved staging pattern, not a waiver
of the existing all-source seam check or an activation certificate.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np


def corner_components(triangles,weld,cut_edges):
    """Independent face-corner fans after deleting only listed edge adjacencies."""
    t=weld[triangles];n=len(weld)
    local=np.arange(t.size,dtype=np.uint32).reshape(-1,3)
    a=np.concatenate([local[:,0],local[:,1],local[:,2]])
    b=np.concatenate([local[:,1],local[:,2],local[:,0]])
    ta,tb=t.ravel()[a],t.ravel()[b]
    low=np.minimum(ta,tb);high=np.maximum(ta,tb);valid=low!=high
    key=low.astype(np.uint64)*np.uint64(n)+high
    order=np.argsort(key[valid],kind='stable');ordered=np.flatnonzero(valid)[order]
    sorted_key=key[ordered]
    start=np.r_[0,np.flatnonzero(sorted_key[1:]!=sorted_key[:-1])+1]
    count=np.diff(np.r_[start,len(ordered)])
    if np.any(count>2):raise ValueError('Nonmanifold welded source edges require an explicit local repair')
    pairs=start[count==2];first,second=ordered[pairs],ordered[pairs+1]
    if not ((ta[first]==tb[second])&(tb[first]==ta[second])).all():raise ValueError('Inconsistent source edge winding')
    cuts=np.asarray(cut_edges,dtype=np.uint32).reshape(-1,2)
    cut_keys=np.sort(cuts[:,0].astype(np.uint64)*np.uint64(n)+cuts[:,1])
    if len(np.unique(cut_keys))!=len(cut_keys):raise ValueError('Duplicate cut edge')
    known=np.isin(cut_keys,sorted_key[pairs])
    if not known.all():raise ValueError('Cut does not identify an actual two-face source edge')
    keep=~np.isin(key[first],cut_keys);first,second=first[keep],second[keep]
    left=np.r_[np.where(ta[first]==low[first],a[first],b[first]),np.where(ta[first]==high[first],a[first],b[first])]
    right=np.r_[np.where(ta[second]==low[second],a[second],b[second]),np.where(ta[second]==high[second],a[second],b[second])]
    parent=np.arange(t.size,dtype=np.uint32)
    for iteration in range(64):
        x,y=parent[left],parent[right];hi=np.maximum(x,y);lo=np.minimum(x,y)
        np.minimum.at(parent,hi,lo)
        for _ in range(3):parent=parent[parent]
        if np.array_equal(parent[left],parent[right]):break
    else:raise RuntimeError('Source corner fan union did not converge')
    return parent.reshape(-1,3),{'sourceFaces':len(triangles),'sourceCorners':t.size,'pairedEdges':len(pairs),'cutEdges':len(cuts),'fanUnionIterations':iteration+1,'unpairedNonzeroEdges':int((count==1).sum())}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('base',type=Path);parser.add_argument('output',type=Path);args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    source=args.base;raw=source.parent/'semantic-garment-v6'
    p=np.fromfile(raw/'positions.bin','<f4').reshape(-1,3);tri=np.fromfile(raw/'triangles.bin','<u4').reshape(-1,3);weld=np.fromfile(raw/'source-welds.u32bin','<u4')
    labels=np.fromfile(raw/'face-labels.bin','u1').copy()
    for side,label in [('left',1),('right',2)]:labels[np.fromfile(source/f'lining-{side}.u32bin','<u4')]=label
    t=weld[tri];edge=np.sort(np.concatenate([t[:,[0,1]],t[:,[1,2]],t[:,[2,0]]]),axis=1)
    face=np.tile(np.arange(len(t)),3);good=edge[:,0]!=edge[:,1];edge,face=edge[good],face[good]
    keys=edge[:,0].astype(np.uint64)*np.uint64(len(weld))+edge[:,1];order=np.argsort(keys,kind='stable');edge,face,keys=edge[order],face[order],keys[order]
    start=np.r_[0,np.flatnonzero(keys[1:]!=keys[:-1])+1];counts=np.diff(np.r_[start,len(keys)])
    pair=start[counts==2];la,lb=labels[face[pair]],labels[face[pair+1]]
    selected=((la==1)&(lb==4))|((la==4)&(lb==1))|((la==2)&(lb==5))|((la==5)&(lb==2))
    selected=pair[selected];cuts=edge[selected];centres=p[cuts].mean(1)
    assert len(cuts)>0 and len(cuts)<2500
    assert (np.abs(centres[:,0])>.16).all() and (np.abs(centres[:,0])<.37).all()
    assert (centres[:,1]>.60).all() and (centres[:,1]<.95).all()
    assert (np.abs(centres[:,2])<.15).all()
    protected=np.fromfile(raw/'protected.bin','u1');assert not protected[cuts].any()
    corners,diagnostic=corner_components(tri,weld,cuts)
    cuts.astype('<u4').tofile(args.output/'cut-edges.u32bin');corners.astype('<u4').tofile(args.output/'corner-components.u32bin')
    labels.tofile(args.output/'face-roles.u8bin')
    report={'parentRig':str(source/'H01-C0-rigged.glb'),'parentRigSha256':hashlib.sha256((source/'H01-C0-rigged.glb').read_bytes()).hexdigest(),
        'sourceSha256':json.loads((source/'receipt.json').read_text())['sourceSha256'],
        'operation':'Separate only sleeve-to-lower-robe interfaces on original source edges. Upper shoulder, wrist and waist-to-torso interfaces stay sewn.',
        'diagnostics':diagnostic,'bounds':[centres.min(0).tolist(),centres.max(0).tolist()],
        'leftEdges':int((centres[:,0]>0).sum()),'rightEdges':int((centres[:,0]<0).sum()),
        'files':{name:{'sha256':hashlib.sha256((args.output/name).read_bytes()).hexdigest(),'bytes':(args.output/name).stat().st_size} for name in ['cut-edges.u32bin','corner-components.u32bin','face-roles.u8bin']},
        'patternApproved':False,'accepted':False,'activated':False,
        'scope':'Exact source-edge pattern proposal. No geometry removed/generated, no texture change, no exemption in current seam verifier. Requires isolated boundary and deformed mesh review.'}
    (args.output/'cut-plan.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))


if __name__=='__main__':main()
