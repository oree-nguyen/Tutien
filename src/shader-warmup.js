import{nextPaint}from'./runtime-performance.js';
import{perfEvent}from'./perf-debug.js';
/** Compile and upload one visible material at a time with input/paint opportunities. */
export async function warmSceneMaterials(renderer,root,camera,scene,includeHidden=false){
 const meshes=[],seen=new Set(),textures=new Set(),timings=[];
 root[includeHidden?'traverse':'traverseVisible'](node=>{
  if(!node.isMesh)return;
  for(const material of Array.isArray(node.material)?node.material:[node.material]){
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
   for(const uniform of Object.values(material.uniforms??{}))if(uniform?.value?.isTexture)textures.add(uniform.value);
   const flags=['vertexColors','transparent','alphaTest','flatShading','fog','dithering','clearcoat','transmission','sheen','iridescence','anisotropy'];
   const key=[material.type,material.side,!!node.isSkinnedMesh,!!node.isInstancedMesh,!!node.instanceColor,...flags.map(k=>!!material[k]),...['map','normalMap','roughnessMap','metalnessMap','emissiveMap','bumpMap','envMap','aoMap','alphaMap','clearcoatMap','clearcoatNormalMap'].map(k=>material[k]?(material[k].channel??0):'-'),material.customProgramCacheKey(),material.vertexShader??'',material.fragmentShader??'',JSON.stringify(material.defines??{})].join('|');
   if(!seen.has(key)){seen.add(key);if(!meshes.includes(node))meshes.push(node);}
  }
 });
 // A shared shader program may still reference different images on each mesh.
 // Upload all images, including those skipped by program deduplication.
 let uploadSliceStart=performance.now();
 for(const texture of textures){
  const start=performance.now();renderer.initTexture(texture);
  const timing={kind:'texture',name:texture.name||texture.uuid,ms:performance.now()-start};
  timings.push(timing);perfEvent('warmup:texture',{texture:timing.name,ms:timing.ms});
  if(performance.now()-uploadSliceStart>=4){await nextPaint();uploadSliceStart=performance.now();}
 }
 if(textures.size)await nextPaint();
 for(const mesh of meshes){
  const start=performance.now();
  if(renderer.compileAsync)await renderer.compileAsync(mesh,camera,scene);else renderer.compile(mesh,camera,scene);
  const timing={kind:'program',name:mesh.name||mesh.type,ms:performance.now()-start};timings.push(timing);perfEvent('warmup:program',{mesh:timing.name,ms:timing.ms});await nextPaint();
 }
 return timings;
}
