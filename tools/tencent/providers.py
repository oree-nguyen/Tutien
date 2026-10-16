"""ModelScope Gradio and private Tencent HTTP adapters; no implicit HF routing."""
from __future__ import annotations
import base64
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
import httpx


def https_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Endpoint must be an HTTPS origin without credentials/query/fragment')
    return value.rstrip('/')


def active():
    return os.environ.get('HUNYUAN_PROVIDER', 'modelscope') != 'huggingface'


class RemoteJob:
    def __init__(self, operation):
        self.executor = ThreadPoolExecutor(max_workers=1)
        self.future = self.executor.submit(operation)
    def result(self, timeout=None):
        try:
            return self.future.result(timeout=timeout)
        finally:
            self.executor.shutdown(wait=False)
    def cancel(self):
        self.future.cancel()
        self.executor.shutdown(wait=False)


class RemoteClient:
    """Official api_server.py JSON/base64 contract, verified from upstream source."""
    provider = 'private-hunyuan21'
    def __init__(self, url, output):
        self.url = https_url(url)
        self.output = Path(output)
        self.output.mkdir(parents=True, exist_ok=True)
        with httpx.Client(timeout=30, follow_redirects=False) as client:
            response = client.get(self.url + '/health')
            response.raise_for_status()
            if response.json().get('status') != 'healthy':
                raise RuntimeError('Remote Tencent worker is not healthy')
            schema = client.get(self.url + '/openapi.json')
            schema.raise_for_status()
            self.openapi = schema.json()
        if '/generate' not in self.openapi.get('paths', {}):
            raise RuntimeError('Remote is not the supported Tencent /generate API')
    def view_api(self, **kwargs):
        names = ['image', 'steps', 'octree_resolution', 'check_box_rembg', 'seed', 'randomize_seed']
        return {'named_endpoints': {'/generation_all': {'parameters': [
            {'parameter_name': name, 'parameter_has_default': name != 'image'} for name in names]}}}
    def submit(self, api_name, **values):
        if api_name != '/generation_all':
            raise ValueError('Remote worker exposes shape/PBR only; configure a ModelScope Part Studio separately')
        return RemoteJob(lambda: self.generate(values))
    def generate(self, values):
        image = values['image']
        path = Path(image['path'] if isinstance(image, dict) else image)
        properties = self.openapi['components']['schemas']['GenerationRequest']['properties']
        maximum = properties.get('num_inference_steps', {}).get('maximum', 20)
        payload = {'image': base64.b64encode(path.read_bytes()).decode(), 'texture': True,
                   'seed': int(values.get('seed', 42)),
                   'octree_resolution': int(values.get('octree_resolution', 256)),
                   'num_inference_steps': min(int(values.get('steps', 20)), int(maximum)),
                   'remove_background': values.get('check_box_rembg', True)}
        target = self.output / 'remote-textured.glb'
        temporary = target.with_suffix('.partial')
        try:
            with httpx.Client(timeout=httpx.Timeout(3600, connect=30), follow_redirects=False) as client:
                with client.stream('POST', self.url + '/generate', json=payload) as response:
                    response.raise_for_status()
                    with temporary.open('wb') as stream:
                        for chunk in response.iter_bytes():
                            stream.write(chunk)
            with temporary.open('rb') as stream:
                magic = stream.read(4)
            if magic != b'glTF':
                raise RuntimeError('Remote returned non-GLB output')
            temporary.replace(target)
            return str(target)
        finally:
            temporary.unlink(missing_ok=True)


def get_client(role, output):
    remote = os.environ.get('HUNYUAN_REMOTE_URL')
    if role == 'shape' and remote:
        return RemoteClient(remote, output)
    variable = {'shape': 'MODELSCOPE_SHAPE_URL', 'parts': 'MODELSCOPE_PART_URL',
                'concept': 'MODELSCOPE_CONCEPT_URL'}[role]
    url = os.environ.get(variable)
    if not url:
        raise RuntimeError(f'{variable} missing: a ModelScope weights repository is not a GPU Studio API; '
                           'run tools/tencent/modelscope_probe.py to inspect availability, or deploy the GPU notebook')
    url = https_url(url)
    host = urlsplit(url).hostname
    if not any(host == suffix or host.endswith('.' + suffix) for suffix in ['ms.show', 'ms.fun', 'modelscope.cn']):
        raise ValueError(f'{variable} must refer to a ModelScope Studio HTTPS host')
    from gradio_client import Client
    client = Client(url, verbose=False, analytics_enabled=False, download_files=str(output),
                    httpx_kwargs={'timeout': 30}, token=False)
    client.provider = 'modelscope'
    client.pipeline_output = Path(output)
    return client


def project_fallback(client, values, output):
    """Request actual shape, then bake a labelled projection draft, never fake PBR."""
    schema = client.view_api(print_info=False, return_format='dict')
    definition = schema.get('named_endpoints', {}).get('/shape_generation')
    if definition is None:
        raise RuntimeError('ModelScope Studio does not expose /shape_generation')
    parameters = definition.get('parameters', [])
    names = {parameter['parameter_name'] for parameter in parameters}
    if not {'image', 'steps', 'octree_resolution'}.issubset(names):
        raise RuntimeError('Shape fallback API changed: image/steps/octree_resolution contract missing')
    forwarded = {name: value for name, value in values.items() if name in names}
    missing = [parameter['parameter_name'] for parameter in parameters
               if not parameter.get('parameter_has_default', False) and parameter['parameter_name'] not in forwarded]
    if missing:
        raise RuntimeError('Shape fallback requires additional parameters: ' + ', '.join(missing))
    shape = client.submit(api_name='/shape_generation', **forwarded).result(timeout=900)
    def paths(value):
        if isinstance(value, str) and len(value) < 4096:
            path = Path(value)
            try:
                if path.is_file() and path.suffix.lower() == '.glb':
                    return [path]
            except OSError:
                pass
        if isinstance(value, (list, tuple)):
            return [path for item in value for path in paths(item)]
        if isinstance(value, dict):
            return [path for key in ['value', 'path', 'name'] if key in value for path in paths(value[key])]
        return []
    candidates = list(dict.fromkeys(paths(shape)))
    if len(candidates) != 1:
        raise RuntimeError('Shape fallback did not return exactly one real GLB')
    return project_existing(candidates[0], values['image'], output)


def project_existing(source, image, output, front=None):
    import subprocess
    image_path = Path(image['path'] if isinstance(image, dict) else image)
    target = Path(output) / 'concept-projected.glb'
    front = front or os.environ.get('HUNYUAN_PROJECTION_FRONT')
    if front not in ['-Y', '+Y', '-Z', '+Z']:
        raise RuntimeError('Shape generated, but HUNYUAN_PROJECTION_FRONT must specify reviewed Blender front (-Y/+Y/-Z/+Z) before projection')
    subprocess.run(['blender', '--background', '--factory-startup', '--python',
                    str(Path(__file__).with_name('blender_project_texture.py')), '--',
                    '--source', str(source), '--image', str(image_path), '--output', str(target),
                    '--front=' + front], check=True, stdout=__import__('sys').stderr)
    return str(target)
