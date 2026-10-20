import {Quaternion} from 'three';
import {clampJoint} from '../../src/rig/joint-limits.js';

/** Restore the source's world-space head orientation through the real neck only.
 * A joint-limit clamp may prevent exact alignment; report that residual honestly.
 */
export function alignSourceHead(pose,bindHeadWorld){
 const neck=pose.nodes.get('Neck'),head=pose.nodes.get('Head');
 if(head.getParentNode()!==neck)throw Error('Unsupported source head hierarchy');
 const frame=pose.frames.Neck,desired=pose.rotation(neck.getParentNode()).invert().multiply(bindHeadWorld).multiply(new Quaternion(...head.getRotation()).invert()).normalize();
 clampJoint(desired,new Quaternion(...pose.bind.get(neck).rotation),new Quaternion(...frame.canonicalLocal),pose.limits[frame.type],frame);
 neck.setRotation(desired.toArray());
 return{sourceHeadOrientationErrorDegrees:pose.rotation(head).angleTo(bindHeadWorld)*180/Math.PI,neckAngles:pose.angles(neck),violations:pose.inspect(neck)};
}
