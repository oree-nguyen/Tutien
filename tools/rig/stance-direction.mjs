import {Quaternion,Vector3,MathUtils} from 'three';

/** Source-asset world frame: +Y up, +Z character-forward, before game yaw. */
export function torsoDirection(quaternion){
 if(!(quaternion instanceof Quaternion)||!quaternion.toArray().every(Number.isFinite)||Math.abs(quaternion.length()-1)>1e-5)throw Error('Invalid torso rotation');
 const up=new Vector3(0,1,0).applyQuaternion(quaternion);
 return{tilt:MathUtils.radToDeg(Math.acos(MathUtils.clamp(up.y,-1,1))),forwardLean:MathUtils.radToDeg(Math.atan2(up.z,up.y)),lateralLean:MathUtils.radToDeg(Math.atan2(up.x,up.y))};
}
export function referenceTorsoValid(quaternion){const m=torsoDirection(quaternion);return m.tilt<=26&&m.forwardLean>=15&&m.forwardLean<=25;}
