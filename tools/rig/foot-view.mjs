import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const params=new URLSearchParams(location.search),asset=params.get('asset'),hero=params.get('hero');
if(!asset||asset.includes('..')||!asset.startsWith('/'))throw Error('Invalid local source asset');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,900);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.localClippingEnabled=true;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#26323d');const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();scene.add(new T.HemisphereLight(0xffffff,0x596578,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(2,3,4);scene.add(light);
const gltf=await new GLTFLoader().loadAsync(asset),model=gltf.scene;scene.add(model);
const camera=new T.PerspectiveCamera(30,4/3,.001,20),center=new T.Vector3(0,.24,.015),selection=params.get('selection')?await fetch(params.get('selection')).then(r=>r.json()):null;
const originals=new Map();model.traverse(n=>{if(n.isMesh){originals.set(n,n.geometry.index.clone());n.material=n.material.clone();n.material.clippingPlanes=[new T.Plane(new T.Vector3(0,-1,0),.58)];}});
scene.add(new T.GridHelper(1.5,30,0x8496a5,0x455563));
window.footReview={model,renderer,scene,camera,render({view=0,isolated=false,side=null,pose=null}={}){
 model.traverse(n=>{if(n.isBone){if(pose?.rotations?.[n.name])n.quaternion.fromArray(pose.rotations[n.name]);if(pose?.translations?.[n.name])n.position.fromArray(pose.translations[n.name]);}if(n.isMesh){const original=originals.get(n);if(isolated&&selection){const name=n.name,source=n.geometry.getAttribute('_SOURCE_VERTEX')??n.geometry.getAttribute('_source_vertex'),wanted=new Set((side?[selection.sides[side]]:Object.values(selection.sides)).flatMap(s=>s.vertexIds)),indices=[];for(let i=0;i<original.count;i+=3){const vs=[original.getX(i),original.getX(i+1),original.getX(i+2)];if(vs.every(v=>wanted.has(source?source.getX(v):v)))indices.push(...vs);}n.geometry.setIndex(indices);}else n.geometry.setIndex(original.clone());}});
 model.updateMatrixWorld(true);const offsets=[[0,.1,1.8],[-1.8,.12,0],[0,.12,-1.8]];camera.position.copy(center).add(new T.Vector3(...offsets[view]));camera.lookAt(center);renderer.render(scene,camera);document.querySelector('#label').textContent=`${hero} actual source lower surfaces · ${['front','side','back'][view]} · ${isolated?'source-ID boot candidate':'context crop, not anatomical segmentation'} · STAGING`;
}};window.footReview.render();window.ready=true;
