#!/usr/bin/env python3
"""Offline filename/GLB intake. No network, MCP, inference or anatomical guessing."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import struct
import sys
ROOT=Path(__file__).resolve().parents[1]
SLOTS=['HonCot_Dau','HonCot_Than','HonCot_TayTrai','HonCot_TayPhai','HonCot_ChanTrai','HonCot_ChanPhai']


def inspect(path):
    raw=path.read_bytes()
    if len(raw)<20 or struct.unpack_from('<4sII',raw)!=(b'glTF',2,len(raw)):
        raise ValueError('Invalid GLB 2.0 header or file length')
    offset=12;document=None;binary=None
    while offset<len(raw):
        if offset+8>len(raw):raise ValueError('Truncated chunk')
        size,kind=struct.unpack_from('<I4s',raw,offset);offset+=8
        if size%4 or offset+size>len(raw):raise ValueError('Invalid chunk alignment/length')
        chunk=raw[offset:offset+size];offset+=size
        if kind==b'JSON' and document is None:document=json.loads(chunk)
        elif kind==b'BIN\0' and binary is None:binary=chunk
        else:raise ValueError('Unexpected/duplicate GLB chunk')
    if not document or binary is None:raise ValueError('Missing embedded JSON/BIN')
    if document.get('asset',{}).get('version')!='2.0':raise ValueError('Not glTF 2.0')
    buffers=document.get('buffers',[])
    if len(buffers)!=1 or buffers[0].get('uri') or buffers[0].get('byteLength',0)>len(binary):raise ValueError('Require one valid embedded BIN')
    images=document.get('images',[])
    if not images:raise ValueError('No embedded texture images')
    for image in images:
        if image.get('uri') or 'bufferView' not in image:raise ValueError('Export textures embedded in GLB')
        view=document['bufferViews'][image['bufferView']];start=view.get('byteOffset',0);end=start+view['byteLength']
        if start<0 or end>len(binary):raise ValueError('Image extends beyond BIN')
        data=binary[start:end]
        if not(data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8\xff') or data.startswith(b'\xabKTX 20\xbb\r\n\x1a\n')):
            raise ValueError('Unrecognized embedded image signature')
    meshes=document.get('meshes',[]);primitives=[p for m in meshes for p in m.get('primitives',[])]
    if not primitives:raise ValueError('No mesh primitives')
    channels=set()
    for primitive in primitives:
        attributes=primitive.get('attributes',{})
        if 'POSITION' not in attributes or 'TEXCOORD_0' not in attributes:
            raise ValueError('Position/UV0 missing; compressed exports need separate offline decode before inspection')
        for key in ['POSITION','TEXCOORD_0']:
            accessor=document['accessors'][attributes[key]]
            if accessor.get('count',0)<=0:raise ValueError('Empty position/UV accessor')
        material=document.get('materials',[])[primitive['material']]
        pbr=material.get('pbrMetallicRoughness',{})
        if 'baseColorTexture' not in pbr:raise ValueError('Material has no albedo image')
        for key,info in [('albedo',pbr.get('baseColorTexture')),('metallicRoughness',pbr.get('metallicRoughnessTexture')),('normal',material.get('normalTexture')),('emissive',material.get('emissiveTexture'))]:
            if info:
                texture=document['textures'][info['index']]
                if 'source' not in texture or texture['source']>=len(images):raise ValueError('Texture references missing image')
                channels.add(key)
    nodes=[n.get('name','') for n in document.get('nodes',[])]
    return {'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'meshes':len(meshes),'images':len(images),'textureChannels':sorted(channels),'nodes':nodes,'anatomicalNodesPresent':[s for s in SLOTS if s in nodes],'anatomicalCutApproved':False,'scope':'Offline structural intake only; no decoded image/UV quality, rig, anatomy or runtime acceptance'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',type=Path,default=ROOT/'assets/base_models')
    parser.add_argument('--manifest',type=Path,default=ROOT/'Prompt_Asset/asset_manifest.json')
    parser.add_argument('--output',type=Path,default=ROOT/'.local/manual-assets/intake.json')
    parser.add_argument('--require',action='append',default=[],help='Require one exact asset ID; repeatable')
    args=parser.parse_args();manifest=json.loads(args.manifest.read_text());assets=manifest['assets']
    names={a['filename']:a for a in assets};ids={a['id'] for a in assets}
    if set(args.require)-ids:parser.error('Unknown required asset ID')
    report={'recordedAt':datetime.now(timezone.utc).isoformat(),'workflow':'manual-offline-no-MCP','found':[],'unknownFiles':[],'pendingIds':[],'runtimeInstalled':False}
    found=set()
    for path in sorted(args.directory.glob('*.glb')):
        asset=names.get(path.name)
        if asset is None:report['unknownFiles'].append(path.name);continue
        found.add(asset['id']);row={'id':asset['id'],'filename':path.name,'category':asset['category']}
        try:row.update(inspect(path),structuralIntakePassed=True)
        except Exception as error:row.update(structuralIntakePassed=False,errorType=type(error).__name__,error=str(error))
        report['found'].append(row)
    report['pendingIds']=[a['id'] for a in assets if a['id'] not in found]
    report['missingRequiredIds']=sorted(set(args.require)-found)
    report['validPresentCount']=sum(r['structuralIntakePassed'] for r in report['found'])
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'found':len(found),'structurallyValid':report['validPresentCount'],'pending':len(report['pendingIds']),'unknownFiles':len(report['unknownFiles']),'missingRequiredIds':report['missingRequiredIds'],'report':str(args.output)},ensure_ascii=False))
    return 2 if report['missingRequiredIds'] or report['unknownFiles'] or any(not r['structuralIntakePassed'] for r in report['found']) else 0

if __name__=='__main__':sys.exit(main())
