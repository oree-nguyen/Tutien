import * as THREE from 'three';
import { loadManualAsset,releaseManualAssets } from './manual-asset-cache.js';
const inFlight=new WeakSet();
export function cloneHunyuanStaff(gltf){
 const source=gltf.scene.getObjectByName('Staff_Root');
 if(!source||!source.getObjectByName('Staff_Base_Tip')||!source.getObjectByName('Staff_Head_Core'))throw Error('Hunyuan staff attachment nodes missing');
 const staff=source.clone(true);staff.name='Staff_Root';
 staff.userData={...staff.userData,hunyuanStaff:true,sourceShare:'4fe3cb84-fd7b-48d2-b5f6-3f77abe3e3d6',lengthMeters:2.0384};
 staff.traverse(node=>{if(node.isMesh){node.geometry.userData.sharedArt=true;node.material=node.material.clone();node.material.userData.sharedArt=true;}});
 return staff;
}
export function createHunyuanStaffGroup(detail,skin=0){
 const root=new THREE.Group();root.name='soulWeapon';
 root.userData={weaponType:'hunyuan-moc-tinh-truong',hunyuanStaff:true,status:'pending',detail,skin,metricLength:2.0384};
 // Prefabs stay cold. animateSoulWeapons hydrates only a displayed instance,
 // so a cached procedural template cannot acquire a permanent hidden lease.
 return root;
}

export function hydrateHunyuanStaff(root){
 if(root.userData.disposed||!['pending','loading'].includes(root.userData.status)||inFlight.has(root)||typeof document==='undefined')return;
 inFlight.add(root);
 root.userData.status='loading';
 loadManualAsset('staff-'+root.userData.detail,true,root).then(gltf=>{
  if(root.userData.disposed){releaseManualAssets(root);return;}
  root.add(cloneHunyuanStaff(gltf));root.userData.status='loaded';
 }).catch(error=>{root.userData.status='failed';root.userData.error=error.message;});
}
