"""Staging boot supports from audited original graph components, never a whole box."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from source_garment_graph import sparsify_four_influences

d=Path(sys.argv[1]);meta=json.loads((d/'input.json').read_text());audit=json.loads((d/'lower-components.json').read_text())
assert audit['cropHeight']==.22 and audit['sourceSha256']==meta['sourceSha256']
p=np.fromfile(d/'positions.bin',dtype='<f4').reshape(-1,3);t=np.fromfile(d/'triangles.bin',dtype='<u4').reshape(-1,3)
labels=np.fromfile(d/'lower-components.u32bin',dtype='<u4');ids=np.fromfile(d/'ids.bin',dtype='<u2').reshape(-1,4);weights=np.fromfile(d/'weights.bin',dtype='<f4').reshape(-1,4)
result_ids=ids.copy();result_weights=weights.copy();mask=np.zeros(len(p),dtype='u1');sides={}
smooth=lambda x: np.clip(x,0,1)**2*(3-2*np.clip(x,0,1))
for side,sign in [('Left',1),('Right',-1)]:
    components=[c for c in audit['components'] if c['soleCandidateVertices']>100 and c['bounds'][0][0]*sign>0 and c['bounds'][1][0]*sign>0]
    assert len(components)==1,(side,components)
    component=components[0];selected=labels==component['component'];vertices=np.flatnonzero(selected)
    # Preserve the upper boundary exactly and blend through real connected boot
    # vertices. The source graph, contextual texture and isolated source-ID views
    # determine the domain; height only parameterizes this first support trial.
    alpha=1-smooth((p[vertices,1]-.08)/(.22-.08))
    toe=smooth((p[vertices,2]-.035)/(.13-.035))*.7
    dense=np.zeros((len(vertices),len(meta['joints'])))
    for k in range(4):dense[np.arange(len(vertices)),ids[vertices,k]]+=weights[vertices,k]*(1-alpha)
    dense[:,meta['joints'].index(side+'Foot')]+=alpha*(1-toe)
    dense[:,meta['joints'].index(side+'ToeBase')]+=alpha*toe
    new_ids,new_weights,_=sparsify_four_influences(dense)
    active=alpha>1e-12
    result_ids[vertices[active]]=new_ids[active];result_weights[vertices[active]]=new_weights[active]
    mask[vertices[active]]=1
    faces=np.flatnonzero(np.all(selected[t],axis=1))
    # Exact bottom source patch; a 10mm crop also includes sidewall thickness.
    sole=vertices[p[vertices,1]<=.003]
    sides[side]={'component':component['component'],'vertexIds':vertices.tolist(),'sourceFaceIds':faces.tolist(),'soleVertexIds':sole.tolist(),'vertices':len(vertices),'faces':len(faces),'soleVertices':len(sole),'bounds':component['bounds']}
result_ids.astype('<u2').tofile(d/'result-ids.bin');result_weights.astype('<f4').tofile(d/'result-weights.bin');mask.tofile(d/'patch-mask.bin')
selection={'hero':meta['hero'],'source':meta['source'],'sourceSha256':meta['sourceSha256'],'parentRig':meta['input'],'parentRigSha256':meta['inputSha256'],'method':'Opposite-boundary welded actual source graph components containing the visible left/right boots and underside patches; 220mm crop only establishes a bounded transition domain. Context and isolated texture views must be reviewed. Not a whole lower-height box.','visuallyVerified':False,'supportTrial':{'coreBelowMetres':.08,'smoothReturnToParentAtMetres':.22,'targetSupports':['respective Foot','respective ToeBase'],'parentShinTransitionRetained':True,'fourInfluenceProjection':'continuous subtract-fifth','accepted':False},'changedVertices':int(mask.sum()),'sides':sides,'files':{f:{'sha256':hashlib.sha256((d/f).read_bytes()).hexdigest(),'bytes':(d/f).stat().st_size} for f in ['result-ids.bin','result-weights.bin','patch-mask.bin']}}
(d/'selection.json').write_text(json.dumps(selection,separators=(',',':'))+'\n')
print(json.dumps({'hero':meta['hero'],'changedVertices':int(mask.sum()),'sides':{s:{k:v for k,v in r.items() if k not in ['vertexIds','sourceFaceIds','soleVertexIds']} for s,r in sides.items()}},indent=2))
