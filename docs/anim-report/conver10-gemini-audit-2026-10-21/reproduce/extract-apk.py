"""Extract only the audited APK's web files, validating its identity first."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('apk', type=Path)
args = parser.parse_args()
root = Path.cwd()
out = root / '.local/audit-apk-ba97bec3'
expected = '52aeeea29c319b5f8b66224ed1c46ae74890254924de2cdcc8d2104ae92b4c7c'
actual = hashlib.sha256(args.apk.read_bytes()).hexdigest()
if actual != expected:
    raise SystemExit('Wrong APK; refusing to compare a different build: ' + actual)
records = []
with zipfile.ZipFile(args.apk) as apk:
    for entry in apk.infolist():
        prefix = 'assets/public/'
        if not entry.filename.startswith(prefix) or entry.is_dir():
            continue
        relative = Path(entry.filename[len(prefix):])
        if relative.is_absolute() or '..' in relative.parts:
            raise SystemExit('Unsafe archive path')
        data = apk.read(entry)
        target = out / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        records.append({'file': str(relative), 'bytes': len(data),
                        'sha256': hashlib.sha256(data).hexdigest()})
print(json.dumps({'apkSha256': actual, 'files': len(records),
                  'bytes': sum(x['bytes'] for x in records),
                  'output': str(out)}, indent=2))
