#!/usr/bin/env python3
"""Catalog reuse plan plus verified aliases. A plan never activates a runtime asset.

Only reviewed variants within the same hero/category may share a base mesh.
Different outfits/weapons need explicit silhouette/material/rig compatibility;
this tool never treats one base GLB as 167 completed assets.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]


def plan(catalog):
    groups={}
    for asset in catalog['assets']:
        category=asset['category']
        if category=='hero':
            base=asset['id'].split('-C')[0]+'-C0'
        elif category=='weapon':
            base=asset['id'].split('-W')[0]+'-W0'
        else:
            base=asset['id']
        groups.setdefault(base,[]).append(asset['id'])
    return {'catalogTargets':len(catalog['assets']),'families':[{'base':base,'members':members,
             'status':'pending-generated-base-and-compatibility-review','runtimeInstalled':False} for base,members in groups.items()],
            'acceptedAliases':{},'note':'Candidates only. Outfit/weapon silhouette changes can require separate geometry.'}


def register(catalog, registry, source, source_id, target_id, review):
    rows={a['id']:a for a in catalog['assets']}
    a,b=rows[source_id],rows[target_id]
    if a['category']!=b['category'] or a.get('hero')!=b.get('hero'):
        raise ValueError('Reuse must preserve hero and asset category')
    digest=hashlib.sha256(source.read_bytes()).hexdigest()
    if (review.get('sourceSha256')!=digest or review.get('sourceId')!=source_id or review.get('targetId')!=target_id
            or not review.get('reviewer') or any(review.get(key) is not True for key in
                 ['silhouetteCompatible','materialsCompatible','rigCompatible','visualReviewPassed'])):
        raise ValueError('Source-bound visual/material/rig compatibility review is required for this exact target')
    spec=importlib.util.spec_from_file_location('reuse_pipeline',ROOT/'tools/tencent_3d_pipeline.py')
    pipeline=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipeline)
    required=list(pipeline.SLOTS[:6]) if a['category']=='hero' else None
    report=pipeline.inspect_glb(str(source),required)
    registry['acceptedAliases'][target_id]={'sourceAssetId':source_id,'sourcePath':str(source),
                                          'sourceSha256':digest,'review':review,'validation':report,
                                          'runtimeInstalled':False}
    return registry

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalog',type=Path,default=ROOT/'assets/tencent/catalog.json')
    parser.add_argument('--output',type=Path,default=ROOT/'assets/tencent/reuse-plan.json')
    parser.add_argument('--source',type=Path);parser.add_argument('--source-id');parser.add_argument('--target-id');parser.add_argument('--review',type=Path)
    args=parser.parse_args();catalog=json.loads(args.catalog.read_text())
    registry=json.loads(args.output.read_text()) if args.output.exists() else plan(catalog)
    if args.source:
        if not all([args.source_id,args.target_id,args.review]):parser.error('source requires source-id, target-id, review')
        registry=register(catalog,registry,args.source,args.source_id,args.target_id,json.loads(args.review.read_text()))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'targets':registry['catalogTargets'],'families':len(registry['families']),'acceptedAliases':len(registry['acceptedAliases'])}))
