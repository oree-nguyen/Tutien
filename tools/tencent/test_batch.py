"""Queue contracts use temporary abstract fixtures and fake jobs, never remote proof."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.dont_write_bytecode=True

def load(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
b=load('tencent_batch_test','batch.py')
fixtures=load('tencent_fixture_test','test_pipeline.py')

class QueueTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='tencent-queue-contract-')
        self.root=Path(self.temp.name)
        self.bank=self.root/'assets/tencent';self.bank.mkdir(parents=True)
        self.paths=fixtures.fixture(self.root)
        self.old_root,self.old_bank=b.ROOT,b.BANK
        b.ROOT,b.BANK=self.root,self.bank
        self.asset={'id':'TEST','prompt':'Abstract local fixture, not an AI game asset'}
        self.out=self.bank/'TEST';self.out.mkdir()

    def tearDown(self):
        b.ROOT,b.BANK=self.old_root,self.old_bank
        self.temp.cleanup()

    def journal(self):
        return {'_path':self.out/'journal.json','attempts':[]}

    def concept(self,approved=False):
        from PIL import Image
        path=self.out/'concept.png';Image.new('RGB',(2,2),(0,120,70)).save(path)
        record={'path':str(path.relative_to(self.root)),'sha256':b.digest(path)}
        if approved:record['review']={'reviewer':'Unit fixture only','sha256':record['sha256'],'approvedForMesh':True}
        b.p.save_json(self.out/'concept.json',record)
        return record

    def test_transient_queue_retries_with_exponential_backoff_and_journal(self):
        calls=[];waits=[]
        def operation():
            calls.append(1)
            if len(calls)<3:raise RuntimeError('429 queue is full')
            return 'actual-result'
        journal=self.journal()
        self.assertEqual(b.retry(operation,journal,'mesh',sleep=waits.append),'actual-result')
        self.assertEqual(waits,[10,20]);self.assertEqual(len(journal['attempts']),3)
        self.assertTrue(json.loads((self.out/'journal.json').read_text())['attempts'][-1]['passed'])

    def test_access_error_does_not_loop_or_sleep(self):
        waits=[];calls=[]
        def operation():calls.append(1);raise RuntimeError('403 Forbidden')
        with self.assertRaises(RuntimeError):b.retry(operation,self.journal(),'connect',sleep=waits.append)
        self.assertEqual(len(calls),1);self.assertEqual(waits,[])

    def test_daily_quota_defers_without_evading_limit(self):
        waits=[]
        def operation():raise RuntimeError('GPU quota exceeded. Try again in 04:12:30')
        with self.assertRaises(b.Deferred) as result:b.retry(operation,self.journal(),'mesh',sleep=waits.append)
        self.assertEqual(result.exception.seconds,15150);self.assertEqual(waits,[])

    def test_nested_deferral_is_not_retried_as_another_job(self):
        waits=[];calls=[]
        def operation():calls.append(1);raise b.Deferred('queue is full',120)
        with self.assertRaises(b.Deferred):b.retry(operation,self.journal(),'mesh',sleep=waits.append)
        self.assertEqual(len(calls),1);self.assertEqual(waits,[])

    def test_cached_concept_waits_for_review_without_remote_submission(self):
        self.concept()
        def forbidden(*args):raise AssertionError('No inference before concept review')
        result=b.run_asset(self.asset,client_factory=forbidden)
        self.assertEqual(result['status'],'awaiting-concept-review')
        self.assertEqual(result['attempts'],[])
        self.assertFalse(result['runtimeInstalled'])

    def test_shared_quota_stops_another_asset_before_any_remote_call(self):
        b.p.save_json(self.bank/'queue.json',{'assets':{},'providerBackoff':{'nextRetryAt':'2099-01-01T00:00:00+00:00','authEnvironmentPresent':False}})
        def forbidden(*args):raise AssertionError('Shared quota must block all new GPU requests')
        with patch.object(b,'auth_present',return_value=False):
            result=b.run_asset(self.asset,client_factory=forbidden)
        self.assertEqual(result['status'],'deferred')
        self.assertEqual(result['attempts'],[])

    def test_single_worker_lock_rejects_parallel_generation(self):
        import fcntl
        with (self.bank/'.worker.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            with self.assertRaisesRegex(b.p.PipelineError,'Another Tencent worker'):
                b.run_asset(self.asset)

    def test_signing_out_cannot_evade_recorded_authenticated_quota(self):
        b.p.save_json(self.bank/'queue.json',{'assets':{},'providerBackoff':{'nextRetryAt':'2099-01-01T00:00:00+00:00','authPresent':True}})
        def forbidden(*args):raise AssertionError('Signing out must not evade quota')
        with patch.object(b,'auth_present',return_value=False):
            result=b.run_asset(self.asset,client_factory=forbidden)
        self.assertEqual(result['status'],'deferred')

    def test_completed_mesh_is_resumed_without_new_job(self):
        concept=self.concept(approved=True)
        target=self.out/'textured_mesh.glb';target.write_bytes(self.paths[0].read_bytes())
        record={'path':str(target.relative_to(self.root)),'sha256':b.digest(target),'inputSha256':concept['sha256']}
        b.p.save_json(self.out/'mesh.json',record)
        def forbidden(*args):raise AssertionError('Do not resubmit a completed mesh')
        result=b.run_asset(self.asset,until='mesh',client_factory=forbidden)
        self.assertEqual(result['status'],'mesh-awaiting-parts')
        self.assertEqual(result['stages']['mesh']['sha256'],record['sha256'])

    def test_wrong_concept_hash_blocks_cached_mesh(self):
        self.concept(approved=True)
        target=self.out/'textured_mesh.glb';target.write_bytes(self.paths[0].read_bytes())
        b.p.save_json(self.out/'mesh.json',{'path':str(target.relative_to(self.root)),'sha256':b.digest(target),'inputSha256':'0'*64})
        result=b.run_asset(self.asset,until='mesh',client_factory=lambda *_:None)
        self.assertEqual(result['status'],'blocked')
        self.assertIn('different concept',result['error'])

    def test_successful_mock_job_saves_real_fixture_bytes_and_actual_parameters(self):
        concept=self.concept(approved=True);calls=[]
        def fake_call(client,endpoint,parameters):
            calls.append((endpoint,parameters));return str(self.paths[0])
        with patch.object(b.p,'call',fake_call):
            result=b.run_asset(self.asset,until='mesh',client_factory=lambda *_:object())
        self.assertEqual(result['status'],'mesh-awaiting-parts')
        self.assertEqual(calls[0][0],'/generation_all')
        self.assertEqual(calls[0][1]['steps'],30)
        self.assertFalse(calls[0][1]['randomize_seed'])
        mesh=json.loads((self.out/'mesh.json').read_text())
        self.assertEqual(mesh['inputSha256'],concept['sha256'])
        self.assertEqual(mesh['sha256'],b.digest(self.paths[0]))
        # These files live only in TemporaryDirectory; never publish this fixture.

if __name__=='__main__':unittest.main(verbosity=2)
