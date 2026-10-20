import {Matrix3,Quaternion,Vector3} from 'three';

/** Rotate the authored normal with the geometric surface, then undo the exact
 * blended skin linear transform. Source normals and the default pose stay intact. */
export function correctiveNormalDelta(authored, before, after, linear, protectedVertex=false) {
  if(protectedVertex)return [0,0,0];
  if(![...authored,...before,...after,...linear.elements].every(Number.isFinite))throw Error('Nonfinite corrective normal input');
  if(Math.abs(linear.determinant())<1e-8)throw Error('Singular corrective normal skin transform');
  const a=new Vector3(...before),b=new Vector3(...after);
  if(a.lengthSq()<1e-24||b.lengthSq()<1e-24)return [0,0,0];
  a.normalize();b.normalize();
  const rotation=new Quaternion().setFromUnitVectors(a,b),normal=new Vector3(...authored),
    target=normal.clone().applyMatrix3(linear).applyQuaternion(rotation).applyMatrix3(linear.clone().invert());
  return target.sub(normal).toArray();
}

/** Cross products retain original triangle orientation; UV copies accumulate
 * through already validated source weld IDs rather than a nearest-point search. */
export function accumulateSurfaceNormals(indices,positions,groups,output) {
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2],
      ux=positions[b*3]-positions[a*3],uy=positions[b*3+1]-positions[a*3+1],uz=positions[b*3+2]-positions[a*3+2],
      vx=positions[c*3]-positions[a*3],vy=positions[c*3+1]-positions[a*3+1],vz=positions[c*3+2]-positions[a*3+2],
      x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
    if(![x,y,z].every(Number.isFinite))throw Error('Nonfinite corrective triangle');
    for(const v of [a,b,c]){const k=groups[v]*3;output[k]+=x;output[k+1]+=y;output[k+2]+=z;}
  }
}

export function blendedSkinLinear(matrices,ids,weights,vertex) {
  const result=new Matrix3();result.elements.fill(0);
  for(let k=0;k<4;k++)if(weights[vertex*4+k]){
    const m=new Matrix3().setFromMatrix4(matrices[ids[vertex*4+k]]),w=weights[vertex*4+k];
    for(let i=0;i<9;i++)result.elements[i]+=m.elements[i]*w;
  }
  return result;
}
