"""Download a user-authorized public Hunyuan share, without logging signed URLs."""
import argparse
import hashlib
import json
import urllib.request
from pathlib import Path


def fetch(share_id,output):
    request=urllib.request.Request('https://3d.hunyuan.tencent.com/api/3d/share/'+share_id,
        headers={'User-Agent':'Mozilla/5.0','Referer':'https://3d.hunyuan.tencent.com/share?shareId='+share_id})
    with urllib.request.urlopen(request,timeout=60) as response:
        data=json.load(response)
    candidates=[]
    def walk(value):
        if isinstance(value,dict):
            for key,item in value.items():
                if isinstance(item,str) and item.startswith('https://') and '.glb' in item.lower():
                    candidates.append((10*('texture' in key.lower() or 'texture' in item.lower())+('pbr' in item.lower()),item))
                walk(item)
        elif isinstance(value,str) and value.lstrip().startswith(('{','[')):
            try:walk(json.loads(value))
            except json.JSONDecodeError:pass
        elif isinstance(value,list):
            for item in value:walk(item)
    walk(data)
    if not candidates:raise RuntimeError('Share has no downloadable GLB; check the public share in a browser')
    _,url=max(candidates,key=lambda pair:pair[0])
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    temp=output.with_suffix('.partial')
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=180) as response,temp.open('wb') as target:
        while chunk:=response.read(1024*1024):target.write(chunk)
    raw=temp.read_bytes()
    if raw[:4]!=b'glTF':temp.unlink();raise RuntimeError('Download is not a GLB')
    temp.replace(output)
    receipt={'shareId':share_id,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'source':'Tencent Hunyuan public user share'}
    output.with_suffix('.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--share-id',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args();fetch(args.share_id,args.output)
