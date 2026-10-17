"""Bake deterministic bark PBR pixels offline, never during Android startup."""
from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[2]/'public/art/h01-bark';root.mkdir(parents=True,exist_ok=True)
y,x=np.mgrid[:1024,:1024]
def height(x,y):return np.sin(x*.11+np.sin(y*.018)*3)+.42*np.sin(x*.39+np.sin(y*.041)*2)+.2*np.sin(x*.93+y*.13)
h=height(x,y);grain=np.sin(x*73.13+y*91.7)*np.sin(x*13.9-y*3.1);moss=np.maximum(0,np.sin(x*.017+y*.009)-.35)
albedo=np.stack([57+h*10+grain*7-moss*12,55+h*9+grain*7+moss*19,28+h*6+grain*5],axis=-1)
dx=(height(x+1,y)-height(x-1,y))*.8;dy=(height(x,y+1)-height(x,y-1))*.8
length=np.sqrt(dx*dx+dy*dy+1);normal=np.stack([128-dx/length*127,128-dy/length*127,128+127/length],axis=-1)
rough=np.repeat((195+h*12)[:,:,None],3,axis=2)
for name,data in [('albedo',albedo),('normal',normal),('roughness',rough)]:Image.fromarray(np.clip(np.rint(data),0,255).astype('uint8')).save(root/(name+'.webp'),lossless=True)
print('Baked 3 PBR maps at',root)
