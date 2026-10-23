#!/usr/bin/env python3
"""Report exact-pixel differences, including failures. Never equate click tests with visual approval."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
ref=root/'docs/requests/lobby-ui-v25/reference'
shots=root/'docs/ui-lobby-v25'
names=['home','character','heroes','friends','profile','pass','quests']
report={'viewport':[1376,768],'metric':'Mean absolute RGB error on 0–255 scale; exact pixel fraction; no inferred visual similarity percentage','screens':[],'static_regions':[]}
for n,name in enumerate(names,1):
    path=shots/f'H{n}-{name}-1376x768.png'
    if not path.exists(): raise SystemExit(f'Missing actual screenshot: {path}')
    a=np.array(Image.open(path).convert('RGB'),dtype=np.int16)
    b=np.array(Image.open(ref/f'image{n+1}.jpeg').convert('RGB'),dtype=np.int16)
    delta=np.abs(a-b)
    report['screens'].append({'screen':f'H{n}','actual':path.name,'reference':f'image{n+1}.jpeg','meanAbsoluteRGBError':round(float(delta.mean()),4),'exactPixelFraction':round(float((delta.max(axis=2)==0).mean()),6),'pixelIdentical':bool((delta==0).all())})
# Interior static artwork is compared at original scale, independent of live text/3D.
a=np.array(Image.open(shots/'H1-home-1376x768.png').convert('RGB'),dtype=np.int16)
b=np.array(Image.open(ref/'image2.jpeg').convert('RGB'),dtype=np.int16)
for name,x,y,w,h,ax in [('shop',35,200,175,40,35),('pass',35,369,175,40,35),('bottom-nav',30,697,670,36,30),('start',1030,682,305,46,1030)]:
    delta=np.abs(a[y:y+h,ax:ax+w]-b[y:y+h,x:x+w])
    report['static_regions'].append({'name':name,'bounds':[x,y,w,h],'meanAbsoluteRGBError':round(float(delta.mean()),4),'exactPixelFraction':round(float((delta.max(axis=2)==0).mean()),6)})
report['acceptance100Percent']=all(row['pixelIdentical'] for row in report['screens'])
report['remainingDifferences']=['Live 3D models, entrance/idle poses, lighting and scenery differ from painted references.','Actual account balances, rank, items and selected supports intentionally use real game state.','Season pass, social and quest services have no authoritative live data; their inactive previews cannot reproduce the sample account.','Reconstructed scalable frames, type, icons and panel details still have pixel differences.']
(shots/'visual-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
