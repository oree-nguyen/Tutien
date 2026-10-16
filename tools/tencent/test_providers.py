"""Offline transport contracts; mocks are not remote generation evidence."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import httpx
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).parent))
import providers
import hunyuan3d_2_1_remote_server as deploy
spec=importlib.util.spec_from_file_location('pipeline_provider_test',Path(__file__).parents[1]/'tencent_3d_pipeline.py')
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class ProviderTests(unittest.TestCase):
    def test_default_has_no_hf_fallback_or_token_forwarding(self):
        with patch.dict(os.environ,{},clear=True):
            self.assertTrue(providers.active())
            with self.assertRaisesRegex(RuntimeError,'MODELSCOPE_SHAPE_URL missing'):
                providers.get_client('shape',Path('/tmp'))
    def test_reject_insecure_or_credential_endpoint(self):
        for value in ['http://worker.example.com','https://a:b@worker.example.com','https://worker.example.com?token=x']:
            with self.assertRaises(ValueError):providers.https_url(value)
    def test_modelscope_endpoint_must_be_modelscope(self):
        with patch.dict(os.environ,{'MODELSCOPE_SHAPE_URL':'https://other.example.com'}):
            with self.assertRaisesRegex(ValueError,'ModelScope Studio'):providers.get_client('shape',Path('/tmp'))
    def test_real_http_contract_and_non_gradio_request(self):
        requests=[]
        def handler(request):
            requests.append(request)
            self.assertNotIn('authorization',request.headers)
            if request.url.path=='/health':return httpx.Response(200,json={'status':'healthy'})
            if request.url.path=='/openapi.json':return httpx.Response(200,json={'paths':{'/generate':{}},'components':{'schemas':{'GenerationRequest':{'properties':{'num_inference_steps':{'maximum':20}}}}}})
            payload=json.loads(request.content)
            self.assertTrue(payload['texture']);self.assertEqual(payload['num_inference_steps'],20)
            self.assertEqual(payload['image'],'dGVzdC1pbWFnZQ==')
            return httpx.Response(200,content=b'glTFtransport-fixture-only')
        factory=httpx.Client
        with tempfile.TemporaryDirectory() as tmp, patch.object(httpx,'Client',side_effect=lambda **kwargs:factory(transport=httpx.MockTransport(handler),**kwargs)):
            image=Path(tmp)/'concept.png';image.write_bytes(b'test-image')
            client=providers.RemoteClient('https://private.example.com',Path(tmp))
            result=client.submit(api_name='/generation_all',image={'path':str(image)},steps=30).result(timeout=5)
            self.assertEqual(Path(result).read_bytes(),b'glTFtransport-fixture-only')
        self.assertEqual([r.url.path for r in requests],['/health','/openapi.json','/generate'])
    def test_gpu_check_rejects_t4_and_a10_default(self):
        for memory in ['15360\n','23028\n']:
            with patch.object(deploy.shutil,'which',return_value='/usr/bin/nvidia-smi'),patch.object(deploy.subprocess,'check_output',return_value=memory):
                with self.assertRaisesRegex(RuntimeError,'29 GiB'):deploy.gpu_memory()
    def test_gpu_check_accepts_a100(self):
        with patch.object(deploy.shutil,'which',return_value='/usr/bin/nvidia-smi'),patch.object(deploy.subprocess,'check_output',return_value='40960\n'):
            self.assertEqual(deploy.gpu_memory(),40960)
    def test_pinned_patch_is_idempotent_and_rejects_unknown_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'source.py';path.write_text('original\n')
            deploy.replace_once(path,'original','patched');deploy.replace_once(path,'original','patched')
            self.assertEqual(path.read_text(),'patched\n')
            with self.assertRaisesRegex(RuntimeError,'contract changed'):deploy.replace_once(path,'different','replacement')
    def test_missing_texture_endpoint_routes_shape_projection(self):
        class Studio:
            provider='modelscope';pipeline_output=Path('/tmp')
            def view_api(self,**kwargs):return {'named_endpoints':{'/shape_generation':{}}}
        with patch.object(providers,'project_fallback',return_value='draft.glb') as fallback:
            self.assertEqual(p.call(Studio(),'/generation_all',{'image':'fixture'}),'draft.glb')
            self.assertEqual(fallback.call_count,1)
    def test_nameerror_falls_back_once_but_quota_does_not(self):
        class Job:
            def __init__(self,message):self.message=message
            def result(self,**kwargs):raise RuntimeError(self.message)
            def cancel(self):pass
        class Studio:
            provider='modelscope';pipeline_output=Path('/tmp')
            def __init__(self,message):self.message=message
            def view_api(self,**kwargs):return {'named_endpoints':{'/generation_all':{'parameters':[]},'/shape_generation':{}}}
            def submit(self,**kwargs):return Job(self.message)
        with patch.dict(os.environ,{'HUNYUAN_PROVIDER':'modelscope'}),patch.object(providers,'project_fallback',return_value='draft.glb') as fallback:
            self.assertEqual(p.call(Studio('NameError texgen_worker'),'/generation_all',{}),'draft.glb')
            with self.assertRaisesRegex(RuntimeError,'quota'):p.call(Studio('quota exceeded'),'/generation_all',{})
            self.assertEqual(fallback.call_count,1)

if __name__=='__main__':unittest.main(verbosity=2)
