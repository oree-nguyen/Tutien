import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {ReferencePose} from './reference-pose.mjs';
import {alignSourceHead} from './upright-head.mjs';
import {sha256} from './animation-payload.mjs';

const [input,output]=process.argv.slice(2);assert(input&&output&&input!==output);
const bytes=await fs.readFile(input),data=JSON.parse(bytes),hero=data.hero;assert(['H01','H02'].includes(hero));
const rigFile=`assets/rigged/${hero}-C0-rigged.glb`,rigBytes=await fs.readFile(rigFile),doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(rigBytes),
 frames=JSON.parse(await fs.readFile('data/rig/bind-frames.json')).heroes[hero].joints,limits=JSON.parse(await fs.readFile('data/rig/joint-limits.json')),pose=new ReferencePose(doc,frames,limits),bindHead=pose.rotation(pose.nodes.get('Head'));
for(const[name,q]of Object.entries(data.rotations)){assert(pose.nodes.has(name)&&q.length===4&&q.every(Number.isFinite)&&Math.abs(Math.hypot(...q)-1)<1e-5);pose.nodes.get(name).setRotation(q);}
for(const[name,t]of Object.entries(data.translations??{})){assert(name==='Hips'&&t.length===3&&t.every(Number.isFinite));pose.nodes.get(name).setTranslation(t);}
const before=pose.rotation(pose.nodes.get('Head')).angleTo(bindHead)*180/Math.PI,result=alignSourceHead(pose,bindHead);
assert(!result.violations.length&&result.sourceHeadOrientationErrorDegrees<1e-5,'Neck constraints prevent source head alignment');
const out={...data,rotations:{...data.rotations,Neck:pose.nodes.get('Neck').getRotation()},headAlignment:{input,inputSha256:sha256(bytes),rigFile,rigSha256:sha256(rigBytes),beforeDegrees:before,...result,scope:'Neck-only source head orientation; no feet/palm/torso changes and no whole-mesh acceptance inferred'}};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out.headAlignment));
