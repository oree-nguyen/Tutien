"""CIE76 on sRGB screenshot pixels, D65; object-mask excludes background/UI."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image
folder=Path(sys.argv[1]); rows=[]
def lab(rgb):
 c=rgb.astype(np.float64)/255
 c=np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
 xyz=c@np.array([[.4124564,.2126729,.0193339],[.3575761,.7151522,.1191920],[.1804375,.0721750,.9503041]])
 xyz=xyz/np.array([.95047,1,1.08883]);d=6/29
 f=np.where(xyz>d**3,np.cbrt(xyz),xyz/(3*d*d)+4/29)
 return np.stack([116*f[...,1]-16,500*(f[...,0]-f[...,1]),200*(f[...,1]-f[...,2])],axis=-1)
for maskpath in sorted(folder.glob('*-mask.png')):
 prefix=maskpath.name.removesuffix('-mask.png');mask=np.array(Image.open(maskpath).convert('RGBA'));valid=(mask[...,3]>254)&np.all(mask[...,:3]>250,axis=-1)
 a=np.array(Image.open(folder/(prefix+'-reference.png')).convert('RGB'));b=np.array(Image.open(folder/(prefix+'-game.png')).convert('RGB'));delta=np.linalg.norm(lab(a)-lab(b),axis=-1)
 if valid.sum()<100:raise RuntimeError('Empty comparison mask: '+prefix)
 rows.append({'case':prefix,'pixels':int(valid.sum()),'meanDeltaE76':float(delta[valid].mean()),'p95DeltaE76':float(np.percentile(delta[valid],95)),'maxDeltaE76':float(delta[valid].max())})
(folder/'deltae.json').write_text(json.dumps({'metric':'CIE76, sRGB -> linear -> XYZ D65 -> Lab; opaque object-mask only; no background/UI','scope':'Cloud SwiftShader, not Android','rows':rows},indent=2)+'\n');print(json.dumps(rows,indent=2))
