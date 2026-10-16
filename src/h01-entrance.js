import * as THREE from 'three';
export const H01_ENTRANCE={duration:4.2,grip:3.05,impact:3.55,phases:[[0,1.05],[.75,1.85],[1.85,2.65],[2.45,3.25],[3.25,4.2]]};
export function smoothWindow(a,b,t){const x=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);}
export function entranceFrame(t){
 t=Math.max(0,t);
 return {time:t,visible:t>=.75,emerge:smoothWindow(.75,1.28,t),open:smoothWindow(.70,1.05,t),
  morph:smoothWindow(1.85,2.65,t),staff:smoothWindow(2.10,2.55,t),
  crouch:1-smoothWindow(2.45,2.95,t),reach:smoothWindow(2.70,3.05,t),gripped:t>=3.05,
  plant:smoothWindow(3.38,3.55,t),impact:t>=3.55,complete:t>=4.2,
  shake:t>=3.55&&t<3.77?Math.sin((t-3.55)*100)*.035*(1-(t-3.55)/.22):0};
}
function ribbonGeometry(){
 const positions=[],along=[],sides=[],lifts=[],parts=[],indices=[];const segments=64,radial=8;
 for(let part=0;part<4;part++)for(let j=0;j<=segments;j++)for(let k=0;k<=radial;k++){
  positions.push(0,0,0);along.push(j/segments);sides.push(Math.cos(k/radial*Math.PI*2));lifts.push(Math.sin(k/radial*Math.PI*2));parts.push(part);
  if(j<segments&&k<radial){const i=(part*(segments+1)+j)*(radial+1)+k;indices.push(i,i+1,i+radial+1,i+1,i+radial+2,i+radial+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('aAlong',new THREE.Float32BufferAttribute(along,1));g.setAttribute('aSide',new THREE.Float32BufferAttribute(sides,1));g.setAttribute('aLift',new THREE.Float32BufferAttribute(lifts,1));g.setAttribute('aPart',new THREE.Float32BufferAttribute(parts,1));g.setIndex(indices);return g;
}

function vineMaterial(roots=false){return new THREE.ShaderMaterial({
 uniforms:{uTime:{value:0},uGrow:{value:0},uOpen:{value:0},uMorph:{value:0},uOpacity:{value:1}},
 vertexShader:`attribute float aAlong;attribute float aSide;attribute float aLift;attribute float aPart;
 uniform float uTime;uniform float uGrow;uniform float uOpen;uniform float uMorph;
 varying vec2 vUv;void main(){float t=aAlong;float a=t*12.56637+aPart*1.570796;
 float radius=.49+.12*sin(t*3.14159);float width=.075*(1.-t*.7);
 vec3 p=vec3(cos(a)*radius,t*2.4,sin(a)*radius);
 float front=smoothstep(-.15,.10,p.z);
 float openSide=sign(cos(aPart*1.570796+.3));
 p.x=mix(p.x,openSide*(.65+abs(cos(a))*.25),uOpen*front);
 p.xz+=vec2(cos(a),sin(a))*aSide*width;
 p.y+=aLift*width; p.y*=uGrow;
 vec3 staff=vec3(-.38+aSide*.014,1.45+(t-.62)*2.0384,.12);
 p=mix(p,staff,uMorph);
 ${roots?'p=vec3(cos(aPart*1.570796+t*1.5)*t*1.4,.02+sin(t*3.14159)*.12,sin(aPart*1.570796+t*1.5)*t*1.4);p.xz+=vec2(cos(a),sin(a))*aSide*.025;p*=uGrow;':''}
 vUv=vec2(t,aSide*.5+.5);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`uniform float uTime;uniform float uMorph;uniform float uOpacity;varying vec2 vUv;
 void main(){float bark=.5+.5*sin(vUv.x*170.+sin(vUv.y*27.)*2.);
 float vein=pow(max(0.,sin(vUv.x*65.-uTime*6.+vUv.y*9.)),16.);
 vec3 color=mix(vec3(.12,.24,.08),vec3(.17,.89,.54),bark*.45+vein*.7);
 color=mix(color,vec3(1.,.85,.40),vein*uMorph);float alpha=(1.-uMorph)*uOpacity;
 if(alpha<.01)discard;gl_FragColor=vec4(color,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,transparent:true,side:THREE.DoubleSide,depthWrite:false});}
export function createH01EntranceVfx(){
 const root=new THREE.Group();root.name='H01_EntranceVFX';
 const geometry=ribbonGeometry(),vines=new THREE.Mesh(geometry,vineMaterial());vines.frustumCulled=false;root.add(vines);
 const roots=new THREE.Mesh(geometry,vineMaterial(true));roots.frustumCulled=false;roots.position.set(-.34,0,.18);root.add(roots);
 const rune=new THREE.Mesh(new THREE.RingGeometry(.46,.58,96),new THREE.ShaderMaterial({
 uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform float uTime;uniform float uOpacity;varying vec3 vPosition;void main(){float a=atan(vPosition.y,vPosition.x);float r=length(vPosition.xy);float glyph=step(.5,sin(a*32.+floor(r*100.)*2.));vec3 c=mix(vec3(.17,.89,.54),vec3(1.,.85,.40),glyph);gl_FragColor=vec4(c,uOpacity*.8);}`,transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
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
 const geometries=new Set();vfx.root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);n.material?.dispose();});
 for(const geometry of geometries)geometry.dispose();vfx.root.removeFromParent();
}
