#!/usr/bin/env python3
"""Deploy official Tencent 2.1 using ModelScope weights, never HF downloads.

Run on a CUDA Linux host with >=29 GiB VRAM. This is an installer, not a CPU
implementation. Upstream loads shape and paint simultaneously; --low_vram_mode
only clears caches after inference, so it cannot make a T4 fit both models.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import shlex
import sysconfig
import subprocess
import sys
import time
import urllib.request

UPSTREAM = 'https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1.git'
REVISION = '82920d643c0dc2f7bfd7255f45f62d386edfe60c'


def run(args, cwd=None, env=None):
    subprocess.run([str(v) for v in args], cwd=cwd, env=env, check=True)


def gpu_memory():
    if not shutil.which('nvidia-smi'):
        raise RuntimeError('CUDA NVIDIA GPU unavailable. Select a GPU runtime; no GPU can be allocated from this script.')
    values = subprocess.check_output(['nvidia-smi', '--query-gpu=memory.total', '--format=csv,noheader,nounits'], text=True)
    sizes = [int(v.strip()) for v in values.splitlines() if v.strip()]
    if not sizes or sizes[0] < 29 * 1024:
        raise RuntimeError(f'GPU 0 has {sizes[0] if sizes else 0} MiB. Official combined shape/PBR worker needs ~29 GiB; '
                           'T4 16 GB and A10 24 GB cannot run this default worker. Use a >=32 GB GPU, preferably A100 40 GB+.')
    return sizes[0]


def replace_once(path, old, new):
    text = path.read_text()
    if old not in text:
        if new in text:
            return
        raise RuntimeError(f'Pinned upstream contract changed: {path.name}')
    path.write_text(text.replace(old, new, 1))


def python_environment(root):
    """Use Tencent's tested Python version even when Colab's kernel is newer."""
    if sys.version_info[:2] != (3, 10):
        run([sys.executable, '-m', 'pip', 'install', 'uv==0.8.22'])
        venv = root / 'python310'
        if not (venv / 'bin/python').exists():
            run([sys.executable, '-m', 'uv', 'venv', '--python', '3.10', '--seed', venv])
        run([venv / 'bin/python', Path(__file__).resolve(), '--root', root])
        return False
    os.environ['PATH'] = str(Path(sys.executable).parent) + os.pathsep + os.environ.get('PATH', '')
    return True


def install(root):
    gpu_memory()
    if not shutil.which('nvcc'):
        raise RuntimeError('CUDA compiler nvcc is required for custom_rasterizer and DifferentiableRenderer')
    root.mkdir(parents=True, exist_ok=True)
    repo = root / 'Hunyuan3D-2.1'
    if not (repo / '.git').exists():
        run(['git', 'clone', '--filter=blob:none', '--no-checkout', UPSTREAM, repo])
        run(['git', 'checkout', REVISION], cwd=repo)
    actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
    if actual != REVISION:
        raise RuntimeError('Existing source checkout is not the pinned Tencent revision; use a separate --root')
    pip = [sys.executable, '-m', 'pip', 'install']
    run(pip + ['torch==2.5.1', 'torchvision==0.20.1', 'torchaudio==2.5.1', '--index-url', 'https://download.pytorch.org/whl/cu124'])
    run(pip + ['-r', 'requirements.txt'], cwd=repo)
    run(pip + ['modelscope==1.40.2'], cwd=repo)
    run(pip + ['--no-build-isolation', '-e', '.'], cwd=repo / 'hy3dpaint/custom_rasterizer')
    includes = shlex.split(subprocess.check_output([sys.executable, '-m', 'pybind11', '--includes'], text=True))
    extension = 'mesh_inpaint_processor' + sysconfig.get_config_var('EXT_SUFFIX')
    run(['c++', '-O3', '-Wall', '-shared', '-std=c++11', '-fPIC', *includes,
         'mesh_inpaint_processor.cpp', '-o', extension], cwd=repo / 'hy3dpaint/DifferentiableRenderer')
    from modelscope import snapshot_download
    weights = Path(snapshot_download('Tencent-Hunyuan/Hunyuan3D-2.1', cache_dir=str(root / 'weights')))
    dino = Path(snapshot_download('facebook/dinov2-giant', cache_dir=str(root / 'weights')))
    for path in [weights / 'hunyuan3d-dit-v2-1', weights / 'hunyuan3d-paintpbr-v2-1', dino]:
        if not path.is_dir():
            raise RuntimeError(f'ModelScope snapshot is missing required weights directory: {path.name}')
    ckpt = repo / 'hy3dpaint/ckpt/RealESRGAN_x4plus.pth'
    ckpt.parent.mkdir(parents=True, exist_ok=True)
    if not ckpt.exists():
        urllib.request.urlretrieve('https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth', ckpt)
    replace_once(repo / 'model_worker.py',
                 'image = image.convert("RGBA")\n        if image.mode == "RGB":\n            image = self.rembg(image)',
                 'image = image.convert("RGBA")\n        if params.get("remove_background", True):\n            image = self.rembg(image)')
    replace_once(repo / 'model_worker.py', 'mesh = self.pipeline(image=image)[0]',
                 'mesh = self.pipeline(image=image, num_inference_steps=params.get("num_inference_steps", 20), '
                 'guidance_scale=params.get("guidance_scale", 5.0), octree_resolution=params.get("octree_resolution", 256), '
                 'num_chunks=params.get("num_chunks", 8000), generator=torch.Generator(device=self.device).manual_seed(params.get("seed", 42)))[0]')
    replace_once(repo / 'model_worker.py', 'conf = Hunyuan3DPaintConfig(max_num_view, resolution)',
                 'conf = Hunyuan3DPaintConfig(max_num_view, resolution)\n'
                 f'        conf.multiview_pretrained_path = {str(weights)!r}\n'
                 f'        conf.dino_ckpt_path = {str(dino)!r}')
    # Official paint helper unconditionally calls HF snapshot_download, even for
    # local paths. Replace only this exact, pinned block with a local-path guard.
    helper = repo / 'hy3dpaint/utils/multiview_utils.py'
    old = '''model_path = huggingface_hub.snapshot_download(
            repo_id=config.multiview_pretrained_path,
            allow_patterns=["hunyuan3d-paintpbr-v2-1/*"],
        )'''
    new = '''model_path = config.multiview_pretrained_path
        if not os.path.isdir(model_path):
            raise RuntimeError("ModelScope local paint snapshot is required; HF fallback is disabled")'''
    replace_once(helper, old, new)
    receipt = {'upstream': UPSTREAM, 'revision': REVISION, 'weightsProvider': 'modelscope.cn',
               'shapeWeights': str(weights), 'dinoWeights': str(dino),
               'setupCompleted': True, 'inferenceValidated': False}
    (root / 'deployment.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return repo, weights


def cloudflared(root):
    if shutil.which('cloudflared'):
        return Path(shutil.which('cloudflared'))
    if platform.machine() not in ['x86_64', 'amd64']:
        raise RuntimeError('Install the official cloudflared binary for this architecture')
    request = urllib.request.Request('https://api.github.com/repos/cloudflare/cloudflared/releases/latest',
                                     headers={'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        release = json.load(response)
    asset = next(a for a in release['assets'] if a['name'] == 'cloudflared-linux-amd64')
    digest = asset.get('digest', '')
    if not digest.startswith('sha256:'):
        raise RuntimeError('Official release does not provide a SHA256 digest; install cloudflared through the official package repository')
    target = root / 'cloudflared'
    urllib.request.urlretrieve(asset['browser_download_url'], target)
    if hashlib.sha256(target.read_bytes()).hexdigest() != digest.split(':')[1]:
        target.unlink()
        raise RuntimeError('cloudflared release checksum mismatch')
    target.chmod(0o755)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('/content/hunyuan21') if Path('/content').exists() else Path.home() / '.cache/hunyuan21')
    parser.add_argument('--check', action='store_true', help='Check actual GPU prerequisites without installing/downloading weights')
    args = parser.parse_args()
    if args.check:
        print(json.dumps({'gpu0MiB': gpu_memory(), 'nvccAvailable': bool(shutil.which('nvcc'))}))
        return
    gpu_memory()
    if not python_environment(args.root.resolve()):
        return
    repo, weights = install(args.root.resolve())
    tunnel_binary = cloudflared(args.root.resolve())
    env = dict(os.environ, HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
    worker = subprocess.Popen([sys.executable, 'api_server.py', '--host', '127.0.0.1', '--port', '8081',
                               '--model_path', str(weights), '--limit-model-concurrency', '1'], cwd=repo, env=env)
    tunnel = None
    try:
        ready = False
        for attempt in range(600):
            if worker.poll() is not None:
                raise RuntimeError('Tencent worker exited; inspect initialization/extension/weights errors above')
            try:
                with urllib.request.urlopen('http://127.0.0.1:8081/health', timeout=2) as response:
                    ready = json.load(response).get('status') == 'healthy'
            except OSError:
                pass
            if ready:
                break
            time.sleep(2)
        if not ready:
            raise RuntimeError('Tencent worker did not become healthy within 20 minutes')
        print('Tencent worker healthy. Copy the HTTPS trycloudflare URL below into HUNYUAN_REMOTE_URL.', flush=True)
        tunnel = subprocess.Popen([str(tunnel_binary), 'tunnel', '--url', 'http://127.0.0.1:8081', '--no-autoupdate'])
        while worker.poll() is None and tunnel.poll() is None:
            time.sleep(1)
        raise RuntimeError('Worker or tunnel exited; notebook session must remain running')
    finally:
        if tunnel is not None:
            tunnel.terminate()
        worker.terminate()
        worker.wait(timeout=30)

if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f'DEPLOYMENT BLOCKED: {error}', file=sys.stderr)
        sys.exit(2)
