import{nextPaint}from'./runtime-performance.js';
/** Compile and upload one visible material at a time with input/paint opportunities. */
export async function warmSceneMaterials(renderer,root,camera,scene,includeHidden=false){
 const meshes=[],seen=new Set(),timings=[];
 root[includeHidden?'traverse':'traverseVisible'](node=>{
  if(!node.isMesh)return;
  for(const material of Array.isArray(node.material)?node.material:[node.material]){
   const flags=['vertexColors','transparent','alphaTest','flatShading','fog','dithering','clearcoat','transmission','sheen','iridescence','anisotropy'];
   const key=[material.type,material.side,!!node.isSkinnedMesh,!!node.isInstancedMesh,!!node.instanceColor,...flags.map(k=>!!material[k]),...['map','normalMap','roughnessMap','metalnessMap','emissiveMap','bumpMap','envMap','aoMap','alphaMap','clearcoatMap','clearcoatNormalMap'].map(k=>material[k]?(material[k].channel??0):'-'),material.customProgramCacheKey(),material.vertexShader??'',material.fragmentShader??'',JSON.stringify(material.defines??{})].join('|');
   if(!seen.has(key)){seen.add(key);meshes.push(node);break;}
  }
 });
 for(const mesh of meshes){
  const start=performance.now();
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','bumpMap','envMap'])if(material[key])renderer.initTexture(material[key]);
  if(renderer.compileAsync)await renderer.compileAsync(mesh,camera,scene);else renderer.compile(mesh,camera,scene);
  timings.push({name:mesh.name||mesh.type,ms:performance.now()-start});await nextPaint();
 }
 return timings;
}
