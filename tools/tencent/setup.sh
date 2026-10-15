#!/usr/bin/env bash
set -euo pipefail
export PYTHONDONTWRITEBYTECODE=1
cd /workspace/Tutien
if ! command -v blender >/dev/null; then
  sudo apt-get update
  sudo apt-get install -y blender libgl1-mesa-dri
fi
if [ ! -x /workspace/tencent-3d-venv/bin/python ]; then
  python3 -m venv /workspace/tencent-3d-venv
fi
/workspace/tencent-3d-venv/bin/python -m pip install --cache-dir /workspace/.pip-cache -r tools/tencent/requirements.lock
/workspace/tencent-3d-venv/bin/python -m pip check
blender --background --factory-startup --python-expr 'import bpy; print("Blender import available:", bpy.app.version_string)'
/workspace/tencent-3d-venv/bin/python tools/tencent_3d_pipeline.py --help
