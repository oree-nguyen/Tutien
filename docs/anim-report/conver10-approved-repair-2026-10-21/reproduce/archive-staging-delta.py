"""Lossless local rejected-model cache archive; never a runtime asset pipeline.

Equal-length trial models share their embedded source images. XOR against a
retained hash-locked local parent, gzip that delta, verify restored SHA before
removing the redundant trial copy. Source/public/APK files are never removed.
"""
import argparse,gzip,hashlib,json
from pathlib import Path
import numpy as np

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode',choices=['archive','restore'])
parser.add_argument('directory',type=Path)
parser.add_argument('--parent',type=Path)
a=parser.parse_args()
root=Path('.local/rig-candidates').resolve();folder=a.directory.resolve()
assert root in folder.parents
file=folder/'H01-C0-rigged.glb';receipt=folder/'model-archive.json';packed=folder/'rejected-model.glb.xor.gz'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
chunk=4*1024*1024
if a.mode=='archive':
    assert a.parent and root in a.parent.resolve().parents and file.resolve()!=a.parent.resolve()
    assert file.is_file() and not receipt.exists() and not packed.exists()
    assert file.stat().st_size==a.parent.stat().st_size
    proof=json.loads((folder/'receipt.json').read_text());expected=sha(file)
    assert proof['sha256']==expected and proof['accepted'] is False and proof['activated'] is False
    original=file.stat().st_size;parent_hash=sha(a.parent)
    with file.open('rb')as source,a.parent.open('rb')as parent,gzip.open(packed,'wb',compresslevel=6)as out:
        while raw:=source.read(chunk):
            base=parent.read(len(raw));assert len(base)==len(raw)
            out.write(np.bitwise_xor(np.frombuffer(raw,np.uint8),np.frombuffer(base,np.uint8)).tobytes())
    restored=hashlib.sha256();count=0
    with a.parent.open('rb')as parent,gzip.open(packed,'rb')as delta:
        while raw:=delta.read(chunk):
            base=parent.read(len(raw));assert len(base)==len(raw)
            restored.update(np.bitwise_xor(np.frombuffer(raw,np.uint8),np.frombuffer(base,np.uint8)).tobytes());count+=len(raw)
    assert count==original and restored.hexdigest()==expected and sha(a.parent)==parent_hash
    record={'format':'gzip-xor-parent','scope':'Lossless archive of rejected local trial only; source images/models and runtime/APK untouched. Restore before replaying this candidate.','model':str(a.directory/'H01-C0-rigged.glb'),'sha256':expected,'bytes':original,'parent':str(a.parent),'parentSha256':parent_hash,'archive':str(a.directory/packed.name),'archiveSha256':sha(packed),'archiveBytes':packed.stat().st_size,'restore':'python3 '+str(Path(__file__))+' restore '+str(a.directory),'restorationVerified':True,'accepted':False,'activated':False}
    receipt.write_text(json.dumps(record,indent=2)+'\n');file.unlink()
    print(json.dumps({'candidate':str(a.directory),'savedBytes':original-packed.stat().st_size,'verifiedRestoredSha256':expected}))
else:
    assert not file.exists()
    record=json.loads(receipt.read_text());parent=Path(record['parent'])
    assert record['format']=='gzip-xor-parent' and sha(parent)==record['parentSha256'] and sha(packed)==record['archiveSha256']
    digest=hashlib.sha256();count=0
    with parent.open('rb')as base,gzip.open(packed,'rb')as delta,file.open('xb')as out:
        while raw:=delta.read(chunk):
            p=base.read(len(raw));assert len(p)==len(raw)
            value=np.bitwise_xor(np.frombuffer(raw,np.uint8),np.frombuffer(p,np.uint8)).tobytes();out.write(value);digest.update(value);count+=len(value)
    assert count==record['bytes'] and digest.hexdigest()==record['sha256']
    print(json.dumps({'restored':str(file),'sha256':digest.hexdigest()}))
