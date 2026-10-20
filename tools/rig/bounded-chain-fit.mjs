import {Quaternion,Vector3,MathUtils} from 'three';

const axes=['flex','lateral','twist'];
const q=a=>new Quaternion(...a);

function linearSolve(matrix,rhs){
  const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
  for(let k=0;k<n;k++){
    let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
    if(Math.abs(a[pivot][k])<1e-18)return null;
    [a[k],a[pivot]]=[a[pivot],a[k]];
    const divisor=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=divisor;
    for(let i=0;i<n;i++)if(i!==k){const scale=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=scale*a[k][j];}
  }
  return a.map(row=>row[n]);
}

/** Build-time bounded fit in the same anatomical coordinates as the validator.
 * The analytic hinge solve supplies seeds, not hard constraints on elbow flex.
 * Parent transforms and bind lengths remain fixed. There is no runtime IK. */
export function fitBoundedChain(pose,names,{target,orientation,pole,seeds,endLimits,flexRange,previousRotations}){
  const nodes=names.map(n=>pose.nodes.get(n)),root=pose.position(nodes[0]),
    parent=pose.rotation(nodes[0].getParentNode()),
    offsets=nodes.slice(1).map(n=>new Vector3(...pose.bind.get(n).position)),
    frames=nodes.map(n=>pose.frames[n.getName()]),
    limits=nodes.map((n,i)=>i===2&&endLimits?endLimits:pose.limits[frames[i].type]),
    bounds=limits.flatMap((l,i)=>axes.map(axis=>i===1&&axis==='flex'&&flexRange?flexRange:l[axis])),
    active=bounds.flatMap(([a,b],i)=>b>a?[i]:[]),
    clamp=values=>values.map((v,i)=>MathUtils.clamp(v,...bounds[i])),
    encode=rotations=>clamp(rotations.flatMap((r,i)=>{const a=pose.angles(nodes[i],r);return axes.map(axis=>a[axis]);})),
    rotation=(values,i)=>{
      const f=q(frames[i].canonicalLocal),swing=new Vector3(MathUtils.degToRad(values[i*3]),0,MathUtils.degToRad(values[i*3+1]*(frames[i].lateralSign??1))),a=swing.length();
      return q(pose.bind.get(nodes[i]).rotation).multiply(f).multiply(new Quaternion().setFromAxisAngle(a?swing.divideScalar(a):new Vector3(1,0,0),a))
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),MathUtils.degToRad(values[i*3+2]*(frames[i].twistSign??1)))).multiply(f.invert()).normalize();
    },
    evaluate=values=>{
      const rotations=nodes.map((_,i)=>rotation(values,i)),upper=parent.clone().multiply(rotations[0]),middle=upper.clone().multiply(rotations[1]),
        elbow=root.clone().add(offsets[0].clone().applyQuaternion(upper)),position=elbow.clone().add(offsets[1].clone().applyQuaternion(middle)),
        end=middle.clone().multiply(rotations[2]),delta=orientation?orientation.clone().multiply(end.clone().invert()).normalize():new Quaternion();
      if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
      const vector=new Vector3(delta.x,delta.y,delta.z),length=vector.length();
      if(length>1e-12)vector.multiplyScalar(2*Math.atan2(length,delta.w)/length);
      const error=position.clone().sub(target),residual=[...error.multiplyScalar(20).toArray(),...vector.multiplyScalar(2).toArray()],contactCost=residual.reduce((s,v)=>s+v*v,0);
      if(previousRotations)for(let i=0;i<rotations.length;i++){
        const change=rotations[i].clone().multiply(previousRotations[i].clone().invert());if(change.w<0)change.set(-change.x,-change.y,-change.z,-change.w);
        const a=new Vector3(change.x,change.y,change.z),len=a.length();
        if(len>1e-12)a.multiplyScalar(2*Math.atan2(len,change.w)/len);
        residual.push(...a.multiplyScalar(.015).toArray());
      }
      return{rotations,position,elbow,residual,contactCost,objective:residual.reduce((s,v)=>s+v*v,0)};
    };
  let best;
  for(const seed of seeds){
    const start=encode(seed);let values=start,measurement=evaluate(values),lambda=1e-3;
    for(let iteration=0;iteration<90;iteration++){
      const jacobian=active.map(j=>{
        const shifted=values.slice(),step=values[j]+.01<=bounds[j][1]?.01:-.01;shifted[j]+=step;
        const r=evaluate(shifted).residual;return r.map((v,i)=>(v-measurement.residual[i])/step);
      }),matrix=active.map((_,i)=>active.map((_,j)=>jacobian[i].reduce((s,v,k)=>s+v*jacobian[j][k],0)+(i===j?lambda:0))),
        rhs=jacobian.map(column=>-column.reduce((s,v,k)=>s+v*measurement.residual[k],0)),step=linearSolve(matrix,rhs);
      if(!step)break;
      const scale=Math.min(1,12/Math.max(1e-12,...step.map(Math.abs))),trial=clamp(values.map((v,j)=>v+(active.includes(j)?step[active.indexOf(j)]*scale:0))),candidate=evaluate(trial);
      if(candidate.objective<measurement.objective){
        const gain=measurement.objective-candidate.objective;values=trial;measurement=candidate;lambda=Math.max(1e-10,lambda*.35);
        if(candidate.objective<1e-14||gain<1e-15)break;
      }else{lambda*=6;if(lambda>1e9)break;}
    }
    const poleError=pole?measurement.elbow.distanceToSquared(pole):0,
      cost=measurement.objective+poleError*1e-10;
    if(!best||cost<best.cost)best={...measurement,cost,values};
  }
  return best;
}
