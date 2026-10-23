/** Causal diagnostics on the exported surface; never an acceptance shortcut. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { Vector3, Quaternion } from "three";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { threeRig, sha256 } from "./animation-payload.mjs";
import { createRuntimeSurfaces, measureRuntimeSurface } from "./runtime-surface.mjs";
import { sourceHandDomains } from "./source-hand-domains.mjs";
import { handStrain } from "./hand-strain.mjs";

const [candidate, posePath, output] = process.argv.slice(2);
assert(candidate?.startsWith(".local/rig-candidates/") && posePath && output);
await assert.rejects(fs.access(output), { code: "ENOENT" });
const asset = candidate + "/H01-C0-rigged.glb";
const bytes = await fs.readFile(asset), solveBytes = await fs.readFile(candidate + "/solve.json");
const solve = JSON.parse(solveBytes), receipt = JSON.parse(await fs.readFile(candidate + "/receipt.json"));
assert.equal(sha256(bytes), receipt.sha256);
assert.equal(sha256(solveBytes), receipt.solveSha256);
const metadata = await fs.readFile(solve.input + "/input.json");
assert.equal(sha256(metadata), solve.inputMetadataSha256);
const meta = JSON.parse(metadata), poseBytes = await fs.readFile(posePath), pose = JSON.parse(poseBytes);
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes), rig = threeRig(doc);
const surface = createRuntimeSurfaces(doc, rig.root).find(s => s.name === meta.mesh && s.primitiveIndex === meta.primitive);
assert(surface);
const touched = await fs.readFile(candidate + "/touched.u8bin");
assert.equal(sha256(touched), solve.files["touched.u8bin"]);
const fans = surface.primitive.getAttribute("_SOURCE_CUT_WELD").getArray();
const domains = sourceHandDomains(fans, surface.index, touched, solve.hands);
const bind = surface.joints.map(n => ({n, p: n.position.clone(), q: n.quaternion.clone()}));
assert.deepEqual(Object.keys(pose.rotations).sort(), bind.map(r => r.n.name).sort());
const restore = () => {
  for (const {n,p,q} of bind) { n.position.copy(p); n.quaternion.copy(q); }
};
const fingerprints = [];
function row(v) {
  return { vertex:v, sourceFan:fans[v], position:Array.from(surface.positions.subarray(v*3,v*3+3)),
    influences:Array.from({length:4},(_,k)=>({joint:surface.joints[surface.ids[v*4+k]].name,weight:surface.weights[v*4+k]})) };
}
function measure(label, changed) {
  rig.root.updateWorldMatrix(true,true);
  measureRuntimeSurface(surface);
  fingerprints.push({label, changed, hands:domains.map(({side,mask})=>{
    const m=handStrain({primitive:surface.primitive,mask,position:i=>new Vector3().fromArray(surface.posed,i*3)});
    return {side,...m,witness:m.worst ? [row(m.worst.a),row(m.worst.b)] : []};
  })});
}
restore(); measure("source-bind",[]);
const jointFrames = [];
for(const {n,q} of bind.filter(r=>/Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.test(r.n.name))){
  const target=new Quaternion(...pose.rotations[n.name]);
  jointFrames.push({name:n.name,parent:n.parent.name,bindWorld:new Vector3().setFromMatrixPosition(n.matrixWorld).toArray(),
    deltaDegrees:q.angleTo(target)*180/Math.PI,localTranslation:n.position.toArray()});
}
for(const side of ["Left","Right"]){
  for(const finger of ["Thumb","Index","Middle","Ring","Pinky"]){
    restore(); const changed=[];
    for(let segment=1;segment<=3;segment++){
      const name=side+"Hand"+finger+segment;
      rig.root.getObjectByName(name).quaternion.fromArray(pose.rotations[name]); changed.push(name);
    }
    measure(side+finger,changed);
  }
}
restore();
const changed=[];
for(const {n} of bind) if(/Hand(Thumb|Index|Middle|Ring|Pinky)[123]$/.test(n.name)){
  n.quaternion.fromArray(pose.rotations[n.name]); changed.push(n.name);
}
measure("all-fingers-on-bind-body",changed);
restore();
for(const [name,q] of Object.entries(pose.rotations)) rig.root.getObjectByName(name).quaternion.fromArray(q);
for(const [name,p] of Object.entries(pose.translations??{})) rig.root.getObjectByName(name).position.fromArray(p);
measure("complete-original-diagnostic-pose",Object.keys(pose.rotations));
const report={asset,assetSha256:sha256(bytes),solveSha256:sha256(solveBytes),posePath,poseSha256:sha256(poseBytes),
  accepted:false,activated:false,scope:"Single-finger counterfactuals, same exported native LBS, hash-bound original hand domains. Does not replace the original full diagnostic pose, production timeline, contacts or clothing gates.",jointFrames,fingerprints};
await fs.writeFile(output,JSON.stringify(report,null,2)+"\n");
console.log(fingerprints.map(r=>({label:r.label,hands:r.hands.map(h=>({side:h.side,p999:h.p999,max:h.maximum,min:h.minimum,minArea:h.areaRatios.minimum}))})));
