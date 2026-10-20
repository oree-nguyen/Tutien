/** Additional exact-source boot measurements; never waives whole-mesh failure. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {AnimationMixer,LoopOnce} from 'three';
import {threeRig,sha256} from './animation-payload.mjs';
import {sourceFootContact} from './source-foot-contact.mjs';

const hero=process.env.HERO??'H01',input=process.env.RIG_FILE,output=process.env.FK_REPORT_DIR,
 selectionFile=process.env.FOOT_SELECTION??`.local/rig-candidates/foot-source/${hero}/selection.json`;
assert(input&&output);const bytes=await fs.readFile(input),selectionBytes=await fs.readFile(selectionFile),selection=JSON.parse(selectionBytes);
assert.equal(selection.hero,hero);assert.equal(sha256(await fs.readFile(selection.source)),selection.sourceSha256);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.readBinary(bytes),source=await io.read(selection.source),sourcePosition=source.getRoot().listNodes().find(n=>n.getMesh()).getMesh().listPrimitives()[0].getAttribute('POSITION'),
 wanted=new Set(Object.values(selection.sides).flatMap(s=>s.vertexIds));
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
 const position=p.getAttribute('POSITION'),ids=p.getAttribute('_SOURCE_VERTEX');if(!ids)assert.equal(position.getCount(),sourcePosition.getCount(),'Unmapped primitive cannot establish source boot identity');
 for(let v=0;v<position.getCount();v++){const id=ids?ids.getScalar(v):v;if(wanted.has(id))assert.deepEqual(position.getElement(v,[]),sourcePosition.getElement(id,[]),'Source boot geometry changed');}
}
const rig=threeRig(doc),feet=sourceFootContact(doc,rig.root,{sourceSelection:selection}),
 frames=JSON.parse(await fs.readFile(output+'/'+hero+'-frames.json')),spec=JSON.parse(await fs.readFile(`data/hero-entrance/${hero}.json`));assert.equal(frames.outputSha256,sha256(bytes));
const mixer=new AnimationMixer(rig.root),samples=[],failures=[],metrics={maximumPenetration:0,maximumPlantedGap:0,maximumFlatSoleVerticalError:0},land=spec.events.find(e=>e.type==='land').time;
for(const name of ['Entrance','IDLE_HOLD']){
 const clip=rig.clips.find(c=>c.name===name);assert(clip);mixer.stopAllAction();const action=mixer.clipAction(clip);action.reset().setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
 for(let n=0;n<=Math.round(clip.duration*60);n++){
  const time=Math.min(n/60,clip.duration),frame=frames.frames.find(f=>f.clip===name&&Math.abs(f.time-time)<1e-5);assert(frame);
  action.time=time;mixer.update(0);rig.root.updateMatrixWorld(true);const measure=feet.measure();
  if(name==='Entrance'&&(time<land-1e-7||!frame.visible))continue;
  for(const side of ['Left','Right']){
   const m=measure[side],contact=frame.footContacts[side],flat=contact.planted&&contact.anchorJoint.endsWith('Foot');
   metrics.maximumPenetration=Math.max(metrics.maximumPenetration,-m.minimumY);
   if(contact.planted)metrics.maximumPlantedGap=Math.max(metrics.maximumPlantedGap,m.minimumY);
   if(flat)metrics.maximumFlatSoleVerticalError=Math.max(metrics.maximumFlatSoleVerticalError,m.soleMaximumVerticalError);
   if(m.minimumY<-.005||(contact.planted&&m.minimumY>.005)||(flat&&m.soleMaximumVerticalError>.005))failures.push({clip:name,time,side,contact,...m});
  }
  samples.push({clip:name,time,feet:measure});
 }
}
mixer.stopAllAction();mixer.uncacheRoot(rig.root);
const result={hero,input,sha256:sha256(bytes),selection:selectionFile,selectionSha256:sha256(selectionBytes),sourceSha256:selection.sourceSha256,
 scope:'Every graph-selected boot vertex from actual GLB AnimationMixer playback at60Hz after landing, including swing. Additional narrow5mm check, not whole-body/garment/contact approval.',
 accepted:false,activated:false,sourceBootPositionsPreserved:true,bootFloorCriteriaPassed:failures.length===0,samples:samples.length,metrics,failures,visuallyVerified:false};
await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,hero+'-boot-fk-validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,failures:undefined}));
if(!result.bootFloorCriteriaPassed)process.exitCode=1;
