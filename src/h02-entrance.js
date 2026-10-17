import * as THREE from 'three';
export const H02_STANDING_HAMMER_Z=-.2334;
export const H02_ENTRANCE=Object.freeze({hammerImpact:.65,heroLaunch:2.15,heroLanding:2.82,grip:3.5,standStart:3.75,standEnd:4.65,stamp:5.1,duration:5.6});
const clamp=THREE.MathUtils.clamp;
export function h02Smooth(a,b,t){const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);}
export function h02EntranceFrame(time,out={}){
 const t=Math.max(0,time),k=H02_ENTRANCE,fall=clamp(t/k.hammerImpact,0,1),flight=clamp((t-k.heroLaunch)/(k.heroLanding-k.heroLaunch),0,1);
 out.time=t;out.hammerFall=fall*fall;out.heroFlight=flight*flight;out.heroVisible=t>=k.heroLaunch;out.landed=t>=k.heroLanding;
 out.crouch=h02Smooth(2.65,k.heroLanding+.02,t)*(1-h02Smooth(k.standStart,k.standEnd,t));out.pickup=h02Smooth(3.15,k.grip,t);out.stand=h02Smooth(k.standStart,k.standEnd,t);
 out.hammerFlip=h02Smooth(3.55,4.45,t);out.gripped=t>=k.grip;out.hammerImpact=t>=k.hammerImpact;out.stamp=t>=k.stamp;out.complete=t>=k.duration;
 out.stampLift=.15*h02Smooth(4.72,4.92,t)*(1-h02Smooth(4.98,k.stamp,t));
 const a=t-k.hammerImpact,b=t-k.stamp;out.shake=(a>=0?.045*Math.exp(-a*11)*Math.sin(a*77):0)+(b>=0?.018*Math.exp(-b*15)*Math.sin(b*85):0);
 return out;
}
function crackGeometry(seed,radius){
 const points=[];let s=seed;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
 for(let spoke=0;spoke<9;spoke++){
  const angle=spoke*Math.PI*2/9+(rand()-.5)*.35;let x=0,z=0;
  for(let j=1;j<=5;j++){
   const distance=radius*j/5,turn=angle+(rand()-.5)*.32,nx=Math.cos(turn)*distance,nz=Math.sin(turn)*distance;
   points.push(x,.026,z,nx,.026,nz);
   if(j>=2&&j<=4){const branch=turn+(rand()>.5?1:-1)*(.4+rand()*.5),len=radius*(.12+rand()*.1);points.push(nx,.026,nz,nx+Math.cos(branch)*len,.026,nz+Math.sin(branch)*len);}
   x=nx;z=nz;
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));return g;
}
function impact(radius,seed){
 const root=new THREE.Group(),cracks=new THREE.LineSegments(crackGeometry(seed,radius),new THREE.LineBasicMaterial({color:0xffba55,transparent:true,opacity:0,depthWrite:false}));cracks.renderOrder=5;root.add(cracks);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.92,1,64),new THREE.MeshBasicMaterial({color:0xffcf83,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;ring.renderOrder=6;root.add(ring);
 const count=32,positions=new Float32Array(count*3),velocities=new Float32Array(count*3);for(let i=0;i<count;i++){const a=i*2.399963,sp=.45+(i%7)*.11;velocities.set([Math.cos(a)*sp,.7+(i%5)*.16,Math.sin(a)*sp],i*3);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('launchVelocity',new THREE.BufferAttribute(velocities,3));
 const material=new THREE.ShaderMaterial({uniforms:{age:{value:-1},strength:{value:radius}},transparent:true,depthWrite:false,vertexShader:'attribute vec3 launchVelocity;uniform float age;uniform float strength;void main(){float t=max(0.,age);vec3 p=launchVelocity*t*strength;p.y=max(.04,p.y-2.5*t*t);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(35./max(1.,-mv.z),1.,8.);}',fragmentShader:'uniform float age;void main(){float d=length(gl_PointCoord-.5);if(d>.5||age<0.||age>1.2)discard;gl_FragColor=vec4(1.,.69,.26,(1.-smoothstep(.35,1.2,age))*(1.-d*2.));}'});
 const sparks=new THREE.Points(geometry,material);sparks.frustumCulled=false;root.add(sparks);
 return{root,cracks,ring,sparks,radius};
}
export function createH02EntranceVfx(){const root=new THREE.Group();root.name='H02_Impact_VFX';const first=impact(1.25,20261017),stamp=impact(.48,20261018);first.root.position.set(0,0,.38);stamp.root.position.set(-.43,0,H02_STANDING_HAMMER_Z);root.add(first.root,stamp.root);return{root,first,stamp};}
export function updateH02EntranceVfx(vfx,t){
 for(const [effect,start]of[[vfx.first,H02_ENTRANCE.hammerImpact],[vfx.stamp,H02_ENTRANCE.stamp]]){
  const age=t-start;effect.root.visible=age>=0;effect.cracks.material.color.set(age<.6?0xffc56c:0x35251c);effect.cracks.material.opacity=age<0?0:age<.6?1:Math.max(.22,.65-(age-.6)*.12);
  effect.ring.visible=age>=0&&age<.65;effect.ring.scale.setScalar(effect.radius*(.2+Math.max(0,age)*3));effect.ring.material.opacity=Math.max(0,1-age/.65)*.6;
  effect.sparks.material.uniforms.age.value=age;effect.sparks.visible=age>=0&&age<1.2;
 }
}
export function disposeH02EntranceVfx(vfx){vfx.root.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});vfx.root.removeFromParent();}
