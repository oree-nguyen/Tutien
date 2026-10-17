import{loadImageTexture}from'./texture-image.js';
import * as THREE from 'three';
import {barkAssetUrls} from './h01-bark-assets.js';
import {vineGeometryUrl,vineGeometryLayout} from './h01-vine-assets.js';
import {barkGpuAssetUrls} from './h01-bark-gpu-assets.js';
import {getGpuTextureLoader} from './gpu-textures.js';
let authoredVines;
export function installOrganicVineData(buffer){authoredVines={};for(const [part,attributes] of Object.entries(vineGeometryLayout)){authoredVines[part]={};for(const [key,range] of Object.entries(attributes))authoredVines[part][key]=range.type==='uint16'?new Uint16Array(buffer,range.offset,range.bytes/2):new Float32Array(buffer,range.offset,range.bytes/4);}}
export const H01_ENTRANCE={duration:4.2,grip:3.05,impact:3.55,phases:[[0,1.05],[.75,1.85],[1.85,2.65],[2.45,3.25],[3.25,4.2]]};
export function smoothWindow(a,b,t){const x=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);}
export function entranceFrame(t,target={}){
 t=Math.max(0,t);
 return Object.assign(target,{time:t,visible:t>=.75,emerge:smoothWindow(.75,1.28,t),open:smoothWindow(.70,1.05,t),
  morph:smoothWindow(1.85,2.65,t),staff:smoothWindow(2.10,2.55,t),
  crouch:1-smoothWindow(2.45,2.95,t),reach:smoothWindow(2.70,3.05,t),gripped:t>=3.05,
  plant:smoothWindow(3.38,3.55,t),impact:t>=3.55,complete:t>=4.2,
  shake:t>=3.55&&t<3.77?Math.sin((t-3.55)*100)*.035*(1-(t-3.55)/.22):0});
}
/** Opaque, UV-unwrapped organic tubes. Growth follows arc length, not a flattened billboard. */
export function organicVineGeometry(roots=false){
 const data=roots?authoredVines.roots:authoredVines.vines;
 const geometry=new THREE.BufferGeometry();
 for(const [name,key,size] of [['position','position',3],['normal','normal',3],['uv','uv',2],['vineAlong','along',1],['vineOpenSide','side',1]])geometry.setAttribute(name,new THREE.BufferAttribute(data[key],size));
 geometry.setIndex(new THREE.BufferAttribute(data.index,1));geometry.computeBoundingSphere();return geometry;
}

let bakedBark, barkLoading;
export function prepareH01EntranceAssets(){
 if(!barkLoading)barkLoading=Promise.all([
  authoredVines?Promise.resolve():fetch(vineGeometryUrl).then(response=>{if(!response.ok)throw Error('Vine geometry HTTP '+response.status);return response.arrayBuffer();}).then(installOrganicVineData),
  Promise.all(['albedo','normal','roughness'].map(async(key,i)=>{
   const gpu=getGpuTextureLoader();let texture;
   try{texture=await (gpu?gpu.loadAsync(barkGpuAssetUrls[key]):loadImageTexture(barkAssetUrls[key]));}
   catch{texture=await loadImageTexture(barkAssetUrls[key]);}
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.anisotropy=4;return texture;
  }))
 ]).then(([,maps])=>{bakedBark=maps;return maps;}).catch(error=>{barkLoading=null;throw error;});
 return barkLoading;
}
function barkMaps(){if(!bakedBark)throw Error('Entrance PBR assets are not ready');return bakedBark;}
function vineMaterial(roots=false){
 const [map,normalMap,roughnessMap]=barkMaps();
 const material=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,roughness:.88,metalness:0,normalScale:new THREE.Vector2(.65,.65)});
 const uniforms={uTime:{value:0},uGrow:{value:0},uOpen:{value:0},uMorph:{value:0},uOpacity:{value:1}};
 material.uniforms=uniforms;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute float vineAlong;attribute float vineOpenSide;uniform float uGrow;uniform float uOpen;uniform float uMorph;varying float vVineAlong;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=position;vVineAlong=vineAlong;
   transformed.y=min(position.y,uGrow*2.55);
   ${roots?'':'float front=smoothstep(-.2,.3,position.z);transformed.x+=vineOpenSide*uOpen*front*.42;'}
   vec3 staff=vec3(-.38+position.x*.025,1.45+(vineAlong-.62)*2.0384,.12+position.z*.025);
   ${roots?'':'transformed=mix(transformed,staff,uMorph);'}`);
  shader.fragmentShader='uniform float uGrow;uniform float uMorph;uniform float uOpacity;varying float vVineAlong;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(vVineAlong>uGrow||uOpacity<.02||uMorph>.995)discard;');
 };
 material.customProgramCacheKey=()=>roots?'organic-root-v1':'organic-vine-v1';
 return material;
}
export function createH01EntranceVfx(){
 const root=new THREE.Group();root.name='H01_EntranceVFX';
 const geometry=organicVineGeometry(),vines=new THREE.Mesh(geometry,vineMaterial());vines.frustumCulled=false;root.add(vines);
 const roots=new THREE.Mesh(organicVineGeometry(true),vineMaterial(true));roots.frustumCulled=false;roots.position.set(-.34,0,.18);root.add(roots);
 const rune=new THREE.Mesh(new THREE.RingGeometry(.46,.58,96),new THREE.ShaderMaterial({
 uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform float uTime;uniform float uOpacity;varying vec3 vPosition;void main(){float a=atan(vPosition.y,vPosition.x);float r=length(vPosition.xy);float glyph=step(.5,sin(a*32.+floor(r*100.)*2.));vec3 c=mix(vec3(.17,.89,.54),vec3(1.,.85,.40),glyph);gl_FragColor=vec4(c,uOpacity*.8);}`,transparent:true,forceSinglePass:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
 rune.rotation.x=-Math.PI/2;rune.position.y=.015;root.add(rune);
 const wave=new THREE.Mesh(new THREE.RingGeometry(.91,1,96),new THREE.MeshBasicMaterial({color:0x83ffae,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
 wave.rotation.x=-Math.PI/2;wave.position.set(-.34,.025,.18);root.add(wave);
 const points=[];for(let i=0;i<64;i++)points.push(Math.cos(i*2.39996)*(i%11)/11,((i*37)%64)/64,Math.sin(i*2.39996)*(i%11)/11);
 const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 const leaves=new THREE.Points(leafGeometry,new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uOpacity:{value:1}},
 vertexShader:'uniform float uTime;void main(){vec3 p=position;p.y=mod(p.y+uTime*.4,1.8);p.xz*=.7+uTime*.06;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=5.;}',
 fragmentShader:'uniform float uOpacity;void main(){vec2 p=gl_PointCoord*2.-1.;if(abs(p.x)+abs(p.y)>.9)discard;gl_FragColor=vec4(.35,1.,.60,uOpacity);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));root.add(leaves);
 return {root,vines,roots,rune,wave,leaves};
}
export function updateH01EntranceVfx(vfx,frame){
 const t=frame.time;vfx.root.visible=t<4.2;
 Object.assign(vfx.vines.material.uniforms.uTime,{value:t});
 vfx.vines.material.uniforms.uGrow.value=smoothWindow(.05,1.05,t);
 vfx.vines.material.uniforms.uOpen.value=frame.open;
 vfx.vines.material.uniforms.uMorph.value=frame.morph;
 vfx.rune.material.uniforms.uTime.value=t;vfx.rune.rotation.z=t*.35;
 vfx.rune.scale.setScalar(.6+smoothWindow(0,1,t)*.8);
 vfx.rune.material.uniforms.uOpacity.value=1-smoothWindow(3.8,4.2,t);
 const age=t-3.55;vfx.wave.visible=age>=0&&age<.6;
 vfx.wave.scale.setScalar(Math.max(.001,age*3));vfx.wave.material.opacity=Math.max(0,1-age/.6);
 vfx.roots.visible=age>=0;vfx.roots.material.uniforms.uGrow.value=smoothWindow(3.55,3.9,t);
 vfx.roots.material.uniforms.uOpacity.value=1-smoothWindow(3.85,4.2,t);
 vfx.leaves.material.uniforms.uTime.value=t;vfx.leaves.material.uniforms.uOpacity.value=1-smoothWindow(3.85,4.2,t);
}
export function disposeH01EntranceVfx(vfx){
 const geometries=new Set();vfx.root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material){n.material.dispose();}});
 for(const geometry of geometries)geometry.dispose();vfx.root.removeFromParent();
}
