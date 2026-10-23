"""Continue a hash-checked numerical trial in a NEW directory, retaining history.

This copies numerical state only. No GLB is copied, activated or certified.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('previous', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--iterations', type=int, default=200)
args = parser.parse_args()
for p in [args.previous, args.output]:
    assert re.fullmatch(r'\.local/rig-candidates/[a-z0-9-]+', str(p))
assert args.previous != args.output and not args.output.exists()
assert 1 <= args.iterations <= 2000
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
old = json.loads((args.previous/'solve.json').read_text())
assert old['parameters']['algorithmVersion'] == 3
assert old['parameters']['cutFans'] and old['parameters']['wholeBody']
assert not old['accepted'] and not old['activated']
assert not (args.previous/'receipt.json').exists(), 'Completed exports are immutable'
expected = {**old['stateHashes'], 'result-weights.bin': old['outputWeightsSha256']}
for name,digest in expected.items():
    assert Path(name).name == name and sha(args.previous/name) == digest
args.output.mkdir()
for name in ['solve.json', *expected]:
    shutil.copyfile(args.previous/name, args.output/name)
    assert sha(args.previous/name) == sha(args.output/name)
command = ['python3','tools/rig/pose_weight_fit.py',old['base'],str(args.output),
    '--whole-body','--cut-fans','--archive-state','--resume',
    '--iterations',str(args.iterations),'--ratio',str(old['parameters']['ratio'])]
record = {'previous':str(args.previous),'previousSolveSha256':sha(args.previous/'solve.json'),
    'copiedNumericalFiles':{**expected,'solve.json':sha(args.previous/'solve.json')},
    'command':command,'additionalIterations':args.iterations,
    'accepted':False,'activated':False,'executionComplete':False,
    'scope':'Exact numerical-state continuation in a fresh trial. Previous trial/GLB/assets/history are untouched. Not a skin or animation certificate.'}
file = args.output/'continuation-input.json'
file.write_text(json.dumps(record,indent=2)+'\n')
result = subprocess.run(command,env={**os.environ,'OPENBLAS_NUM_THREADS':'1','OMP_NUM_THREADS':'1'})
record['exitCode'] = result.returncode
record['executionComplete'] = result.returncode == 0
file.write_text(json.dumps(record,indent=2)+'\n')
raise SystemExit(result.returncode)
