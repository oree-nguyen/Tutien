"""Read-only plot of the exact packaged motion; reference dots are literal DOCX data.
Run from repository root after extracting assets/public from the audited APK to
.local/audit-apk-ba97bec3. Does not rebuild or change runtime motion.
"""
import csv,json,struct
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
OUT=Path('docs/anim-report/conver10-gemini-audit-2026-10-21')
BASE=Path('.local/audit-apk-ba97bec3/animations/report-entrances')
REF={
'H01':[(46/60,.150),(52/60,.780),(60/60,.520),(65/60,.495),(95/60,.520),(112/60,.652),(125/60,.806),(138/60,.935),(145/60,.960),(3,.960)],
'H02':[(46/60,2.400),(60/60,.540),(65/60,.518),(95/60,.540),(112/60,.680),(128/60,.865),(140/60,.985),(145/60,1.005),(3,1.005)]}
fig,axs=plt.subplots(2,1,figsize=(12,9),layout='constrained')
records=[]
for ax,hero in zip(axs,['H01','H02']):
 raw=(BASE/(hero+'.bin')).read_bytes();magic,version,size=struct.unpack_from('<III',raw);assert magic==0x4d414748 and version==1
 head=json.loads(raw[12:12+size]);start=12+(size+3)//4*4
 def values(rec): return np.frombuffer(raw,dtype='<f4',count=rec['length'],offset=start+rec['offset']*4)
 curve=next(c for c in head['curves'] if c['name']=='Entrance');times=values(curve['times']);track=next(t for t in curve['tracks'] if t['name']=='Hips.position');xyz=values(track['values']).reshape(-1,3);valid=times>=46/60-1e-6
 ax.plot(times[valid],xyz[valid,1],label='APK 2.5.ba97bec3: Hips Y (decoded exact binary)',color='#137d8b',lw=2)
 ax.scatter(*zip(*REF[hero]),label='Gemini DOCX: literal Pelvis height keypoints',color='#c23f38',marker='x',s=60,zorder=4)
 ax.axvspan(1,95/60,color='#dbb546',alpha=.12,label='Crouch / Khung 2')
 ax.axvline(145/60,color='#888',ls=':',lw=1)
 ax.set(title=hero+' — model-space metres, +Y up; reference dots are not an invented spline',xlabel='Time (s)',ylabel='Pelvis / Hips height (m)',xlim=(.75,3.03));ax.grid(alpha=.2);ax.legend(fontsize=8,loc='best')
 for t,y in REF[hero]:
  actual=float(np.interp(t,times,xyz[:,1]));records.append({'hero':hero,'time_seconds':t,'docx_height_metres':y,'apk_height_metres':actual,'signed_difference_metres':actual-y})
fig.savefig(OUT/'hip-height-reference-vs-apk.png',dpi=160)
with (OUT/'hip-height-keypoints.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(records)
print('Wrote plot and',len(records),'literal-reference comparisons')
