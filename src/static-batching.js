import * as THREE from 'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{nextPaint}from'./runtime-performance.js';
/** Batch only opaque, non-deforming architecture. Original named nodes remain for tooling. */
export async function batchStaticSanctuary(root){
 root.updateMatrixWorld(true);const groups=new Map(),batches=new THREE.Group();batches.name='Sanctuary_StaticBatches';
 root.traverse(node=>{
  const m=node.material;
  if(!node.isMesh||node.isInstancedMesh||!m?.isMeshStandardMaterial||m.transparent||m.vertexColors||Array.isArray(m))return;
  const key=[m.type,m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.clearcoat,m.clearcoatRoughness,m.side,m.normalScale?.toArray().join(','),m.customProgramCacheKey(),...['map','normalMap','roughnessMap','bumpMap','metalnessMap'].map(k=>m[k]?.uuid??'')].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(node);
 });
 let before=0,after=0;
 for(const nodes of groups.values()){
  before+=nodes.length;if(nodes.length<2){after++;continue;}
  const geometries=[];
  for(const [i,node]of nodes.entries()){
   const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
   for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(name))geometry.deleteAttribute(name);
   geometry.applyMatrix4(node.matrixWorld);geometries.push(geometry);if(i%16===15)await nextPaint();
  }
  const merged=mergeGeometries(geometries,false);for(const geometry of geometries)geometry.dispose();
  if(!merged){after+=nodes.length;continue;}
  const mesh=new THREE.Mesh(merged,nodes[0].material);mesh.name='StaticBatch_'+after;mesh.castShadow=mesh.receiveShadow=true;batches.add(mesh);
  for(const node of nodes){node.visible=false;node.userData.batchedStatic=true;}
  after++;await nextPaint();
 }
 root.add(batches);return {opaqueBefore:before,opaqueAfter:after,batchedMeshes:batches.children.length};
}
