import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {Bone,Group,Matrix4,Vector3,PropertyBinding} from 'three';

await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const files=[
 ['H01','source','public/models/hunyuan-original/H01-C0-source.glb'],
 ['H02','source','public/models/hunyuan-original/H02-C0-source.glb'],
 ['H01','rigged-high','public/models/h01-c0/h01-c0-high.glb'],
 ['H02','rigged-high','public/models/h02-body/h02-body-high.glb'],
];
const fingers=['Thumb','Index','Middle','Ring','Pinky'];
const sides=['Left','Right'];
const v=a=>new Vector3().fromArray(a);
const jointEnd=name=>{
 for(const [part,end] of [['Shoulder','Arm'],['Arm','ForeArm'],['ForeArm','Hand'],['UpLeg','Leg'],['Leg','Foot'],['Foot','ToeBase'],['Hand','HandMiddle1']])
  for(const side of sides)if(name===side+part)return side+end;
 const m=name.match(/^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([12])$/);
 return m?m[1]+'Hand'+m[2]+(Number(m[3])+1):null;
};
const segmentDistance=(p,a,b)=>{const d=b.clone().sub(a);return p.distanceTo(a.clone().addScaledVector(d,Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/Math.max(1e-12,d.lengthSq())))));};

async function audit(hero,kind,file){
 const bytes=await fs.readFile(file),doc=await io.read(file),root=doc.getRoot();
 const joints=[...new Set(root.listSkins().flatMap(s=>s.listJoints()))];
 const positions=new Map(joints.map(j=>[j.getName(),v(j.getWorldTranslation())]));
 const out={hero,kind,file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
  skins:root.listSkins().length,jointCount:joints.length,vertices:0,triangles:0,
  joints:joints.map(j=>({name:j.getName(),parent:j.getParentNode()?.getName()??null,translation:j.getTranslation(),rotation:j.getRotation(),scale:j.getScale(),worldTranslation:j.getWorldTranslation()})),
  nonuniformOrNegativeScales:[],inverseBindMaxError:0,inverseBindCommonShapeResidual:0,bindShapeMatrices:[],leftRightLengthMismatches:[],secondaryWeightSets:[],
  skinWeightVertices:0,weightSumFailures:0,weightSumMaxError:0,crossSideArmWeightVertices:0,distanceOutliers:[],
  fingerBones:[],clips:[],unboundTracks:0,quaternionSignDiscontinuities:0};
 for(const joint of joints){const s=joint.getScale();if(s.some(x=>x<=0)||Math.max(...s)-Math.min(...s)>.001)out.nonuniformOrNegativeScales.push({name:joint.getName(),scale:s});}
 for(const skin of root.listSkins()){
  const matrices=skin.getInverseBindMatrices(),entry=[];
  if(!matrices){out.inverseBindMaxError=null;continue;}
  let commonShape;
  for(const [i,joint] of skin.listJoints().entries()){
   const stored=matrices.getElement(i,entry),expected=new Matrix4().fromArray(joint.getWorldMatrix()).invert().elements;
   out.inverseBindMaxError=Math.max(out.inverseBindMaxError,...stored.map((x,k)=>Math.abs(x-expected[k])));
   const shape=new Matrix4().fromArray(joint.getWorldMatrix()).multiply(new Matrix4().fromArray(stored)).elements;
   commonShape??=[...shape];
   out.inverseBindCommonShapeResidual=Math.max(out.inverseBindCommonShapeResidual,...shape.map((x,k)=>Math.abs(x-commonShape[k])));
  }
  out.bindShapeMatrices.push(commonShape);
 }
 for(const [name,pos] of positions){
  if(!name.startsWith('Left'))continue;
  const end=jointEnd(name),other='Right'+name.slice(4),otherEnd=end&&'Right'+end.slice(4);
  if(!end||!positions.has(end)||!positions.has(other)||!positions.has(otherEnd))continue;
  const left=pos.distanceTo(positions.get(end)),right=positions.get(other).distanceTo(positions.get(otherEnd)),fraction=Math.abs(left-right)/Math.max(left,right,1e-12);
  if(fraction>.03)out.leftRightLengthMismatches.push({bone:name.slice(4),left,right,fraction});
 }
 const influenceCounts=new Map(joints.map(j=>[j,0])),distanceSamples=new Map();
 for(const node of root.listNodes()){
  if(!node.getMesh())continue;
  for(const primitive of node.getMesh().listPrimitives()){
   const p=primitive.getAttribute('POSITION'),weights=primitive.getAttribute('WEIGHTS_0'),indices=primitive.getAttribute('JOINTS_0');
   out.vertices+=p.getCount();out.triangles+=(primitive.getIndices()?.getCount()??p.getCount())/3;
   if(primitive.getAttribute('JOINTS_1')||primitive.getAttribute('WEIGHTS_1'))out.secondaryWeightSets.push({mesh:node.getMesh().getName(),semantics:primitive.listSemantics()});
   if(!node.getSkin()||!weights||!indices)continue;
   const skinJoints=node.getSkin().listJoints(),w=[],j=[],point=[],world=new Matrix4().fromArray(node.getWorldMatrix());
   for(let i=0;i<p.getCount();i++){
    weights.getElement(i,w);indices.getElement(i,j);p.getElement(i,point);
    const sum=w.reduce((a,b)=>a+b,0),err=Math.abs(sum-1);out.skinWeightVertices++;out.weightSumMaxError=Math.max(out.weightSumMaxError,err);if(err>1e-3)out.weightSumFailures++;
    let max=-1,dominant;
    for(let k=0;k<w.length;k++){if(w[k]>1e-6)influenceCounts.set(skinJoints[j[k]],(influenceCounts.get(skinJoints[j[k]])??0)+1);if(w[k]>max){max=w[k];dominant=skinJoints[j[k]];}}
    if(!dominant)continue;
    const name=dominant.getName(),vertex=v(point).applyMatrix4(world),end=positions.get(jointEnd(name)),start=positions.get(name);
    if(end&&start){const d=segmentDistance(vertex,start,end),samples=distanceSamples.get(name)??[];samples.push(d);distanceSamples.set(name,samples);}
    if(/^(Left|Right)(Hand|Arm|ForeArm)/.test(name)){
     const side=name.startsWith('Left')?'Left':'Right',opposite=side==='Left'?'Right':'Left';
     if(w.some((weight,k)=>weight>.05&&skinJoints[j[k]]?.getName().startsWith(opposite)))out.crossSideArmWeightVertices++;
    }
   }
  }
 }
 for(const [bone,ds] of distanceSamples){const mean=ds.reduce((a,b)=>a+b,0)/ds.length;out.distanceOutliers.push({bone,meanRadius:mean,vertices:ds.length,outliers:ds.filter(d=>d>2.5*mean).length});}
 for(const side of sides)for(const finger of fingers)for(let i=1;i<=3;i++){
  const name=side+'Hand'+finger+i,joint=joints.find(j=>j.getName()===name);
  out.fingerBones.push({name,present:!!joint,weightedVertices:joint?influenceCounts.get(joint):null});
 }
 const scene=new Group(),map=new Map(root.listNodes().map(node=>{const bone=new Bone();bone.name=PropertyBinding.sanitizeNodeName(node.getName());return[node,bone];}));
 for(const [node,bone] of map){const parent=map.get(node.getParentNode());(parent??scene).add(bone);}
 const cleanNames=new Set();out.sanitizedNameCollisions=[];
 for(const joint of joints){const name=PropertyBinding.sanitizeNodeName(joint.getName());if(cleanNames.has(name))out.sanitizedNameCollisions.push(name);cleanNames.add(name);}
 for(const clip of root.listAnimations()){
  const entry={name:clip.getName(),tracks:[],missingJointTracks:[],unbound:0,scaleTracks:0,nonRootTranslations:0,negativeQuaternionPairs:0};
  const covered=new Set();
  for(const channel of clip.listChannels()){
   const target=channel.getTargetNode(),name=PropertyBinding.sanitizeNodeName(target.getName()),path=channel.getTargetPath(),property=path==='rotation'?'quaternion':path==='translation'?'position':path;
   const binding=new PropertyBinding(scene,name+'.'+property);binding.bind();
   const bound=binding.node===map.get(target);if(!bound){entry.unbound++;out.unboundTracks++;}covered.add(target);
   const sampler=channel.getSampler(),values=sampler.getOutput(),q=[];let negative=0;
   if(path==='rotation'&&sampler.getInterpolation()!=='CUBICSPLINE')for(let i=1;i<values.getCount();i++){const prev=values.getElement(i-1,[]);values.getElement(i,q);if(q.reduce((a,x,k)=>a+x*prev[k],0)<0)negative++;}
   entry.negativeQuaternionPairs+=negative;out.quaternionSignDiscontinuities+=negative;
   if(path==='scale')entry.scaleTracks++;if(path==='translation'&&!['Hips','Root'].includes(target.getName()))entry.nonRootTranslations++;
   entry.tracks.push({target:target.getName(),sanitized:name,path,bound,keys:sampler.getInput().getCount(),interpolation:sampler.getInterpolation(),negativeQuaternionPairs:negative});
   binding.unbind();
  }
  entry.missingJointTracks=joints.filter(j=>!covered.has(j)).map(j=>j.getName());out.clips.push(entry);
 }
 out.requiresRigForVisibleSource=kind==='source'&&out.jointCount===0;
 if(!joints.length){out.inverseBindMaxError=null;out.inverseBindCommonShapeResidual=null;out.weightSumMaxError=null;out.weightSumFailures=null;out.crossSideArmWeightVertices=null;}
 out.limitations=['Binding check reconstructs sanitized Three.js object names from glTF; live mixer state is not measured here.',
  'Distance >2.5 mean radius is a heuristic flag, not proof of bad weights.',
  'Finger mesh separation, mirrored nearest-vertex weight symmetry, dynamic mesh strain, palm orientation and grip contact require the later geometric/visual checks; not certified by bone presence.'];
 return out;
}
const reports=[];
for(const spec of files){const r=await audit(...spec);reports.push(r);console.log(JSON.stringify({hero:r.hero,kind:r.kind,joints:r.jointCount,vertices:r.vertices,triangles:r.triangles,fingerBones:r.fingerBones.filter(f=>f.present).length,unweightedFingerBones:r.fingerBones.filter(f=>f.present&&!f.weightedVertices).map(f=>f.name),unboundTracks:r.unboundTracks,weightSumFailures:r.weightSumFailures,ibmError:r.inverseBindMaxError}));}
await fs.mkdir('docs/rig-audit',{recursive:true});
const evidence=[];
for(const file of ['src/manual-hero.js','src/manual-h02.js','src/h01-ik.js','src/world.js','src/main.js']){
 const lines=(await fs.readFile(file,'utf8')).split('\n');
 for(const [i,line] of lines.entries())if(/syncTencentPreview|sourceBody=cloneTencentSource|stopAllAction|uncacheRoot|skeleton\.pose\(|const handFrame|leftFrame=|poseRightHand\(|previewHero\s*=|HUNYUAN · RIG/.test(line))evidence.push({file,line:i+1,code:line.trim()});
}
const metadata={recordedAt:new Date().toISOString(),sourceCommit:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),blender:spawnSync('blender',['--version'],{encoding:'utf8'}).stdout.split('\n')[0],reports,evidence};
await fs.writeFile('docs/rig-audit/baseline.json',JSON.stringify(metadata,null,2)+'\n');
const rows=reports.map(r=>`| ${r.hero} ${r.kind} | ${r.triangles.toLocaleString('en-US')} | ${r.skins} | ${r.jointCount} | ${r.fingerBones.filter(f=>f.present).length} | ${r.fingerBones.filter(f=>f.present&&f.weightedVertices>0).length} | ${r.clips.length} |`).join('\n');
const rigRows=reports.filter(r=>r.jointCount).map(r=>`| ${r.hero} | ${r.nonuniformOrNegativeScales.length} | ${r.inverseBindMaxError.toExponential(4)} | ${r.inverseBindCommonShapeResidual.toExponential(4)} | ${r.weightSumFailures}/${r.skinWeightVertices} | ${r.weightSumMaxError.toExponential(4)} | ${r.crossSideArmWeightVertices} | ${r.quaternionSignDiscontinuities} |`).join('\n');
const clips=reports.filter(r=>r.jointCount).flatMap(r=>r.clips.map(c=>`| ${r.hero} | ${c.name} | ${c.tracks.length} | ${c.unbound} | ${c.missingJointTracks.length} | ${c.scaleTracks} | ${c.nonRootTranslations} | ${c.negativeQuaternionPairs} |`)).join('\n');
const fingersMissing=reports.filter(r=>r.jointCount).map(r=>`- ${r.hero}: ${r.fingerBones.filter(f=>!f.weightedVertices).map(f=>f.name).join(', ')||'mọi xương ngón đều có đỉnh được gán trọng số.'}`).join('\n');
const references=evidence.map(e=>`- [${e.file}:${e.line}](../${e.file}#L${e.line}) — \`${e.code.replaceAll('`','').slice(0,220)}\``).join('\n');
await fs.writeFile('docs/RIG-AUDIT.md',`# H01/H02 — audit trước khi dựng lại animation\n\nĐo lúc ${metadata.recordedAt}; nguồn ${metadata.sourceCommit}; ${metadata.blender}. Chạy lại: \`node tools/rig-audit.mjs\`. Đây là audit cấu trúc offline trên cloud, không phải kiểm chứng Android hoặc chứng nhận pose.\n\n## Kết luận và điểm dừng A5\n\nLỗi E1 được xác nhận trực tiếp: sảnh che mesh có skin sau entrance và bật bản source tĩnh. Hai bản source có 0 skin, 0 joint và 0 clip; chúng không thể mang pose/khép ngón bằng AnimationMixer. Đây là hậu quả của giải pháp đưa GLB nguyên gốc vào sảnh ở commit 55737be. Cần gắn rig và trọng số lên mesh nguyên gốc, giữ UV/texture 4096 và toàn bộ tam giác, thay vì chuyển sang mesh tĩnh sau entrance. Chưa sửa runtime hoặc asset.\n\n[Prompt mục A5](requests/H01-H02-ENTRANCE-PROMPT-2.md) yêu cầu dừng khi cần quyết định lớn như rig lại; mục B2-V4 cũng yêu cầu dừng khi thiếu xương ngón. Vì bản source chưa có skeleton và bản rig H02 có 8 xương ngón không tác động đỉnh nào, audit dừng tại đây để người dùng duyệt phương án gắn rig/weight cho mesh full-resolution. Chưa đi qua giai đoạn B/C hoặc tự công nhận khung lòng bàn tay.\n\n## Mesh thật đang được dùng\n\n| Asset | Tam giác | Skin | Joint | Xương ngón /30 | Xương ngón có weight | Clip |\n|---|---:|---:|---:|---:|---:|---:|\n${rows}\n\nSHA-256, toàn bộ joint/phân cấp/TRS bind, track, key count và vertex counts nằm trong [baseline.json](rig-audit/baseline.json). Không ghi đè GLB nguồn.\n\n## Rig/weights\n\n| Rig | Scale không đều/âm | IBM so inverse(world) | Residual bind-shape chung | Lỗi tổng weight / đỉnh skin | Sai số weight lớn nhất | Đỉnh tay lẫn nhãn joint trái/phải | Cặp quaternion dot<0 |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${rigRows}\n\nIBM không bằng inverse(bind world) thuần vì dữ liệu chứa biến đổi bind-shape chung. Residual cột kế kiểm tra jointWorld × IBM có cùng ma trận giữa mọi joint; chỉ riêng sai số inverse(world) lớn không đủ kết luận skin hỏng. Chưa sửa IBM. Cột lẫn trái/phải chỉ đếm weight có nhãn joint đối diện với joint chủ đạo, chưa kiểm chứng joint đó đúng bên không gian của mesh. Trọng số kiểm tra trực tiếp bộ WEIGHTS_0/JOINTS_0; danh sách JOINTS_1 và sai lệch chiều dài xương hai bên nằm trong JSON. Heuristic khoảng cách >2,5 lần bán kính trung bình được ghi cho từng xương, chưa coi là bằng chứng phải sửa skin.\n\n${fingersMissing}\n\nSự hiện diện xương không chứng minh hình học từng ngón tách rời hoặc trục gập đúng. Các mục đó cần ảnh ba góc và thử mở–nắm ở giai đoạn B sau khi duyệt rig.\n\n## Track sau sanitize (kiểm tra cấu trúc PropertyBinding)\n\n| Rig | Clip | Track | Không gắn | Joint thiếu track | Scale track | Translation ngoài Hips/Root | dot<0 |\n|---|---|---:|---:|---:|---:|---:|---:|\n${clips}\n\nCác track rotation của glTF là quaternion; tên được sanitize bằng Three.js PropertyBinding rồi bind vào cấu trúc Object3D tái tạo. Đây là phép kiểm tra binding tĩnh, chưa phải capture trạng thái mixer thật. Với source tĩnh không có track, số 0 không phải kết quả pass animation.\n\n## Bằng chứng code và giả thuyết\n\n- Xác nhận: chuyển sang body source tĩnh sau entrance gây A-pose; vũ khí source đi theo driver rig ẩn nên không còn tiếp xúc bàn tay của body đang thấy.\n- Xác nhận: khung tay ở h01-ik.js được tạo từ vector hằng; chưa suy ra pháp tuyến lòng bàn tay từ hình học như prompt mới. Không công nhận nắm đúng lòng bàn tay.\n- Bác bỏ trong phạm vi track tĩnh: sanitize không gây track unbound trên hai rig đã kiểm tra. Không thấy lời gọi skeleton.pose() trong các module đã quét.\n- stopAllAction/uncacheRoot có trong đường phát lại/teardown; chưa đủ bằng chứng chúng gây triệu chứng E1 đang thấy.\n- H02 vẫn mặc định điều khiển tay phải qua poseRightHand, trái với prompt mới gripHand=left.\n- Nhãn thử nghiệm xuất trực tiếp từ UI sảnh; chưa được giới hạn ở debug.\n- E2–E7/E9 chưa có số đo động để kết luận mức vi phạm; không nhận là đã sửa.\n\n${references}\n\n## Phần chưa hoàn thành do điểm dừng\n\nA3 mixer/pose runtime, A4 sai số tiếp xúc mỗi frame, symmetry nearest-vertex, mesh strain, chuẩn rig A6–A9, B hand frames và ảnh V4, C–F cùng test:anim chưa thực hiện. Hai ảnh mannequin được người dùng gửi trong chat: H02 chống tay phải/cầm búa tay trái; H01 chống tay phải rồi nắm trượng tay phải; hướng trái/phải theo nhân vật. Chưa có bản PNG đính kèm ở filesystem để chép vào docs/anim-ref; không tạo ảnh tham chiếu giả.\n\nKết quả kiểm tra riêng nằm trong [validation.json](rig-audit/validation.json): npm test pass 129/129; verify:master bị chặn 0/37 và giữ nguyên các ngưỡng.\n\nChưa build APK mới vì audit không sửa runtime; APK hiện có vẫn là bản trước, chưa chứa sửa animation theo prompt này. Chưa kiểm chứng trên thiết bị.\n`);
