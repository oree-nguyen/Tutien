#!/usr/bin/env python3
"""Sequential official-Space jobs with per-stage checkpoints and honest review gates."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone, timedelta
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("tencent_pipeline", Path(__file__).parents[1] / "tencent_3d_pipeline.py")
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
ROOT = p.ROOT
BANK = ROOT / "assets/tencent"


def stamp():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def auth_present():
    from huggingface_hub import get_token
    return bool(os.environ.get('HF_TOKEN') or os.environ.get('HUGGING_FACE_HUB_TOKEN') or get_token())


class Deferred(RuntimeError):
    def __init__(self, message, seconds=60):
        super().__init__(message)
        self.seconds = seconds


def retry_delay(error, attempt):
    """No retries for schema, access or input errors. Never evade user quotas."""
    text = str(error).lower()
    reset = re.search(r'(?:try again|retry|reset)[^\d]{0,30}(\d{1,2}):(\d{2}):(\d{2})', text)
    if reset:
        return int(reset[1])*3600 + int(reset[2])*60 + int(reset[3])
    seconds = re.search(r'(?:retry.after|try again in|retry in)\s*[:=]?\s*(\d+)\s*(?:s|sec)', text)
    if seconds:
        return int(seconds[1])
    if any(x in text for x in ['401', '403 forbidden', 'unauthorized', 'api changed', 'additional parameters', 'does not expose']):
        return None
    if any(x in text for x in ['daily quota', 'gpu quota', 'quota exceeded', 'not enough gpu', 'sign in']):
        return 3600
    if any(x in text for x in ['429', 'queue is full', 'queue full', 'too many requests', '503', '502', 'timed out', 'timeout', 'connection reset', "'nameerror'"]):
        return min(10 * (2 ** (attempt-1)), 60)
    return None


def retry(operation, journal, stage, attempts=4, max_wait=60, sleep=time.sleep):
    for attempt in range(1, attempts+1):
        entry = {'stage':stage,'attempt':attempt,'startedAt':stamp()}
        journal.setdefault('attempts',[]).append(entry)
        p.save_json(journal['_path'], {k:v for k,v in journal.items() if k!='_path'})
        try:
            value=operation()
            entry.update(finishedAt=stamp(),passed=True)
            p.save_json(journal['_path'], {k:v for k,v in journal.items() if k!='_path'})
            return value
        except Deferred as error:
            entry.update(finishedAt=stamp(),passed=False,errorType='Deferred',error=str(error)[:700])
            p.save_json(journal['_path'], {k:v for k,v in journal.items() if k!='_path'})
            raise
        except Exception as error:
            delay=retry_delay(error,attempt)
            entry.update(finishedAt=stamp(),passed=False,errorType=type(error).__name__,error=str(error)[:700],retryAfterSeconds=delay)
            p.save_json(journal['_path'], {k:v for k,v in journal.items() if k!='_path'})
            if delay is None:
                raise
            if delay>max_wait or attempt==attempts:
                raise Deferred(str(error),delay) from error
            sleep(delay)


def candidates(result, suffixes):
    return [f for f in p.collect_paths(result) if f.suffix.lower() in suffixes]


def valid_record(path, suffix, validator=None):
    if not path.is_file():
        return None
    record=json.loads(path.read_text())
    if 'path' not in record or 'sha256' not in record:
        return None
    artifact=Path(record['path'])
    if not artifact.is_absolute():
        artifact=ROOT/artifact
    if not artifact.is_file() or artifact.suffix.lower() not in suffix or digest(artifact)!=record['sha256']:
        return None
    if validator:
        validator(str(artifact))
    return record


def update_queue(asset_id, journal):
    path=BANK/'queue.json'
    queue=json.loads(path.read_text()) if path.exists() else {'version':1,'assets':{}}
    queue['assets'][asset_id]={k:v for k,v in journal.items() if k!='_path'}
    if journal.get('providerBackoff'):
        queue['providerBackoff']=journal['providerBackoff']
    queue['recordedAt']=stamp()
    p.save_json(path,queue)


def _run_asset(asset, until='parts', seed=42, client_factory=p.get_client):
    asset_id=asset['id']
    if not re.fullmatch(r'[A-Za-z0-9_-]+',asset_id):
        raise p.PipelineError('Invalid catalog identifier')
    output=BANK/asset_id
    output.mkdir(parents=True,exist_ok=True)
    path=output/'checkpoint.json'
    journal=json.loads(path.read_text()) if path.exists() else {'asset':asset_id,'stages':{},'attempts':[],'runtimeInstalled':False}
    journal['_path']=path
    journal['status']='running'
    journal['provider']='modelscope-or-private-gpu' if p.providers.active() else 'huggingface'
    journal.pop('nextRetryAt',None)
    clients={}
    def client(role):
        if role not in clients:
            clients[role]=retry(lambda:client_factory(role,output/'downloads'),journal,role+'-connect')
        return clients[role]
    try:
        queue_path=BANK/'queue.json'
        queue=json.loads(queue_path.read_text()) if queue_path.exists() else {}
        provider=queue.get('providerBackoff',{})
        auth=auth_present() if not p.providers.active() else False
        if not p.providers.active() and provider.get('nextRetryAt') and datetime.fromisoformat(provider['nextRetryAt'])>datetime.now(timezone.utc):
            recorded_auth=provider.get('authPresent',provider.get('authEnvironmentPresent',False))
            if not (auth and not recorded_auth):
                journal.update(status='deferred',nextRetryAt=provider['nextRetryAt'],error='Shared ZeroGPU quota backoff: no new GPU job submitted')
                return journal
            journal['quotaPrerequisiteChanged']='Authentication environment presence changed; actual provider response must revalidate quota'
        concept=valid_record(output/'concept.json',{'.webp','.png','.jpg','.jpeg'})
        if not concept:
            result=retry(lambda:p.call(client('concept'),'/infer',{'prompt':asset['prompt'],'seed':seed,'randomize_seed':False,'width':1024,'height':1024,'num_inference_steps':4}),journal,'concept')
            images=candidates(result,{'.webp','.png','.jpg','.jpeg'})
            if len(images)!=1:
                raise p.PipelineError('Expected one actual concept image')
            image=output/('concept'+images[0].suffix.lower())
            shutil.copy2(images[0],image)
            from PIL import Image
            with Image.open(image) as decoded:
                decoded.verify()
            concept={'asset':asset_id,'space':p.SPACES['concept'],'endpoint':'/infer','seed':seed,'prompt':asset['prompt'],'path':str(image.relative_to(ROOT)),'sha256':digest(image),'status':'awaiting-concept-review','generatedAt':stamp()}
            p.save_json(output/'concept.json',concept)
        journal['stages']['concept']={'path':concept['path'],'sha256':concept['sha256']}
        review=concept.get('review',{})
        approved=review.get('sha256')==concept['sha256'] and bool(review.get('reviewer')) and review.get('approvedForMesh') is True
        if until=='concept' or not approved:
            journal['status']=('concept-rejected' if concept.get('status')=='concept-rejected' else 'awaiting-concept-review') if not approved else 'concept-reviewed'
            return journal
        draft=output/'projected_mesh.glb'
        draft_receipt=output/'projected_mesh.projection.json'
        if draft.is_file() and draft_receipt.is_file():
            receipt=json.loads(draft_receipt.read_text())
            if receipt.get('imageSha256')==concept['sha256'] and receipt.get('outputSha256')==digest(draft):
                p.inspect_glb(str(draft))
                journal['status']='awaiting-projection-art-and-part-review'
                return journal
        shape=valid_record(output/'mesh.json',{'.glb'},p.inspect_glb)
        if not shape:
            from gradio_client import handle_file
            image=ROOT/concept['path']
            parameters={'image':handle_file(str(image)),'steps':30,'octree_resolution':256,'check_box_rembg':True,'seed':seed,'randomize_seed':False}
            result=retry(lambda:p.call(client('shape'),'/generation_all',parameters),journal,'mesh')
            textured=[]
            for candidate in candidates(result,{'.glb'}):
                try:
                    textured.append((candidate,p.inspect_glb(str(candidate))))
                except (p.PipelineError,KeyError,ValueError):
                    continue
            raw_candidates=candidates(result,{'.glb'})
            if not textured and len(raw_candidates)==1 and p.providers.active():
                projected=Path(p.providers.project_existing(raw_candidates[0],parameters['image'],output/'downloads'))
                textured=[(projected,p.inspect_glb(str(projected)))]
            if len(textured)!=1:
                raise p.PipelineError('Expected exactly one textured GLB, not the white shape output')
            projection = textured[0][0].with_suffix('.projection.json')
            if projection.is_file():
                draft = output/'projected_mesh.glb'
                shutil.copy2(textured[0][0],draft)
                shutil.copy2(projection,output/'projected_mesh.projection.json')
                journal['stages']['projectionDraft']={'path':str(draft.relative_to(ROOT)), 'sha256':digest(draft), 'generatedPBR':False}
                journal['status']='awaiting-projection-art-and-part-review'
                return journal
            if getattr(client('shape'),'provider',None)=='private-hunyuan21' and 'metallicRoughness' not in textured[0][1]['textureChannels']:
                raise p.PipelineError('Private PBR worker returned no embedded metallic/roughness texture')
            mesh=output/'textured_mesh.glb'
            shutil.copy2(textured[0][0],mesh)
            shape={'asset':asset_id,'space':p.SPACES['shape'] if not p.providers.active() else getattr(client('shape'),'provider','modelscope'),'endpoint':'/generation_all','path':str(mesh.relative_to(ROOT)),'sha256':digest(mesh),'inputSha256':concept['sha256'],'validation':p.inspect_glb(str(mesh)),'generatedAt':stamp()}
            p.save_json(output/'mesh.json',shape)
        if shape.get('inputSha256')!=concept['sha256']:
            raise p.PipelineError('Mesh checkpoint belongs to a different concept')
        journal['stages']['mesh']={'path':shape['path'],'sha256':shape['sha256']}
        if until=='mesh':
            journal['status']='mesh-awaiting-parts'
            return journal
        part_path=output/'parts.json'
        parts=json.loads(part_path.read_text()) if part_path.exists() else None
        files_ok=parts and parts.get('sourceSha256')==shape['sha256'] and all((ROOT/f['path']).is_file() and digest(ROOT/f['path'])==f['sha256'] for f in parts.get('files',[])) and len(parts.get('files',[]))>=3
        if not files_ok:
            from gradio_client import handle_file
            upload=handle_file(str(ROOT/shape['path']))
            result=retry(lambda:p.call(client('parts'),'/segment',{'mesh_path':upload,'postprocess':True,'postprocess_threshold':.95,'seed':seed}),journal,'segment')
            labels=candidates(result,{'.npy'})
            meshes=candidates(result,{'.glb'})
            if len(labels)!=1 or len(meshes)!=1:
                raise p.PipelineError('P3-SAM must return an actual mesh and face labels')
            parts={'asset':asset_id,'sourceSha256':shape['sha256'],'files':[],'status':'segmented-awaiting-xpart','generatedAt':stamp()}
            for src,name in [(labels[0],'face_id.npy'),(meshes[0],'segment_mesh.glb')]:
                dst=output/name;shutil.copy2(src,dst)
                parts['files'].append({'path':str(dst.relative_to(ROOT)),'sha256':digest(dst)})
            p.save_json(part_path,parts)
            # Re-segment after process restart: server-side session state is not durable.
            result=retry(lambda:p.call(client('parts'),'/generate',{'mesh_path':upload,'seed':seed}),journal,'xpart')
            outputs=candidates(result,{'.glb'})
            if not outputs:
                raise p.PipelineError('X-Part produced no downloadable decomposition')
            for i,src in enumerate(outputs):
                dst=output/f'xpart-{i}.glb';shutil.copy2(src,dst)
                parts['files'].append({'path':str(dst.relative_to(ROOT)),'sha256':digest(dst),'referenceOnly':True})
            parts['status']='awaiting-semantic-part-review'
            p.save_json(part_path,parts)
        journal['stages']['parts']={'path':str(part_path.relative_to(ROOT)),'sourceSha256':shape['sha256']}
        journal['status']='awaiting-semantic-part-review'
    except Deferred as error:
        journal.update(status='deferred',error=str(error)[:700],nextRetryAt=(datetime.now(timezone.utc)+timedelta(seconds=error.seconds)).isoformat())
        if 'quota' in str(error).lower():
            journal['providerBackoff']={'provider':'Hugging Face ZeroGPU','nextRetryAt':journal['nextRetryAt'],
                'authPresent':auth_present(),
                'reason':str(error)[:700],'scope':'Conservatively pause all new official-Space GPU jobs; do not evade account/IP quotas'}
    except Exception as error:
        journal.update(status='blocked',errorType=type(error).__name__,error=str(error)[:700])
    finally:
        clean={k:v for k,v in journal.items() if k!='_path'}
        p.save_json(path,clean)
        update_queue(asset_id,clean)
    return journal


def run_asset(asset, until='parts', seed=42, client_factory=p.get_client):
    import fcntl
    BANK.mkdir(parents=True,exist_ok=True)
    with (BANK/'.worker.lock').open('a') as lock:
        try:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise p.PipelineError('Another Tencent worker is active; GPU jobs must remain sequential') from error
        return _run_asset(asset,until,seed,client_factory)


def checkpoint_commit(asset_id):
    staged=subprocess.check_output(['git','diff','--cached','--name-only'],cwd=ROOT,text=True).strip()
    if staged:
        raise p.PipelineError('Commit checkpoint only with a clean index; preserve other staged work')
    subprocess.run(['git','add','--',f'assets/tencent/{asset_id}','assets/tencent/queue.json'],cwd=ROOT,check=True)
    if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:
        subprocess.run(['git','commit','-m',f'Checkpoint Tencent asset {asset_id}'],cwd=ROOT,check=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset',action='append',help='Exact catalog IDs, repeatable; defaults to catalog order')
    parser.add_argument('--until',choices=['concept','mesh','parts'],default='parts')
    parser.add_argument('--seed',type=int,default=42)
    parser.add_argument('--max-assets',type=int,default=1)
    parser.add_argument('--commit',action='store_true')
    args=parser.parse_args()
    if args.max_assets<1:
        parser.error('--max-assets must be positive')
    catalog=json.loads((BANK/'catalog.json').read_text())
    ids=set(args.asset or [])
    if ids-{a['id'] for a in catalog['assets']}:
        parser.error('Unknown catalog asset')
    assets=[a for a in catalog['assets'] if not ids or a['id'] in ids]
    for asset in assets[:args.max_assets]:
        saved=BANK/asset['id']/'checkpoint.json'
        if saved.exists():
            current=json.loads(saved.read_text())
            auth=auth_present()
            provider=current.get('providerBackoff',{})
            recorded_auth=provider.get('authPresent',provider.get('authEnvironmentPresent',auth))
            if not p.providers.active() and current.get('nextRetryAt') and datetime.fromisoformat(current['nextRetryAt'])>datetime.now(timezone.utc) and not (auth and not recorded_auth):
                print(json.dumps({'asset':asset['id'],'status':'deferred','nextRetryAt':current['nextRetryAt']}),flush=True)
                return 2
        result=run_asset(asset,args.until,args.seed)
        result.pop('_path',None)
        print(json.dumps(result,ensure_ascii=False),flush=True)
        if args.commit:
            checkpoint_commit(asset['id'])
        if result['status'] in ['deferred','blocked']:
            return 2
        # Review images/part labels before spending more quota or installing meshes.
        if result['status'].startswith('awaiting-') or result['status']=='concept-rejected':
            return 3
    return 0


if __name__=='__main__':
    raise SystemExit(main())
