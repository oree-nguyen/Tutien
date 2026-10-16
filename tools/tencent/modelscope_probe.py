#!/usr/bin/env python3
"""Probe real repository/Studio metadata, then configured inference APIs."""
import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import sys
import urllib.request
from datetime import datetime, timezone
sys.path.insert(0, str(Path(__file__).parent))
import providers


def probe():
    report = {'recordedAt': datetime.now(timezone.utc).isoformat(),
              'sdk': importlib.metadata.version('modelscope'), 'repositories': [], 'inference': {},
              'remoteUrlPresent': bool(os.environ.get('HUNYUAN_REMOTE_URL')), 'runtimeInstalled': False}
    for kind in ['models', 'studios']:
        for repo in ['Tencent-Hunyuan/Hunyuan3D-2.1', 'Tencent-Hunyuan/Hunyuan3D-Part', 'tencent/Hunyuan3D-2']:
            row = {'kind': kind, 'id': repo}
            try:
                with urllib.request.urlopen('https://modelscope.cn/api/v1/' + kind + '/' + repo, timeout=20) as response:
                    data = json.load(response)
                detail = data.get('Data') or {}
                row.update(code=data.get('Code'), accessible=detail.get('IsAccessible'),
                           demoAvailable=detail.get('DemoAvailable'), supportApiInference=detail.get('SupportApiInference'), studios=detail.get('Studios'),
                           note='Metadata access does not establish inference/GPU availability')
            except Exception as error:
                row.update(errorType=type(error).__name__, error=str(error)[:300])
            report['repositories'].append(row)
    for role in ['shape', 'parts', 'concept']:
        try:
            client = providers.get_client(role, Path('.local/tencent-3d/modelscope-downloads'))
            report['inference'][role] = {'connected': True, 'provider': client.provider,
                                        'endpoints': list(client.view_api(print_info=False, return_format='dict')['named_endpoints'])}
        except Exception as error:
            report['inference'][role] = {'connected': False, 'errorType': type(error).__name__, 'error': str(error)[:500]}
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='.local/tencent-3d/modelscope-probe.json')
    args = parser.parse_args()
    report = probe()
    target = Path(args.output); target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(0 if all(v['connected'] for v in report['inference'].values()) else 2)
