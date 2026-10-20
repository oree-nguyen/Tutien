import assert from 'node:assert/strict';
import {ShapeUtils,Vector2,Vector3} from 'three';
const key=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);

/** Keep every original cut corner, including corners Earcut omits as collinear.
 * Independent directed boundary checks reject incomplete or crossed disks.
 */
export function triangulateCut(points,{method='projected',posedPoints,maxEdgeRatio,forbiddenTriangles=new Set()}={}){
 assert(['projected','minimum-area'].includes(method));
 assert(forbiddenTriangles instanceof Set);assert(method==='minimum-area'||!forbiddenTriangles.size,'Collision exclusions require the constrained disk solver');
 if(posedPoints){assert.equal(method,'minimum-area');assert.equal(posedPoints.length,points.length);assert(Number.isFinite(maxEdgeRatio)&&maxEdgeRatio>0);}
 assert(points.length>=3&&points.every(p=>p.toArray().every(Number.isFinite)));
 const normal=new Vector3();for(let i=0;i<points.length;i++)normal.add(new Vector3().crossVectors(points[i],points[(i+1)%points.length]));
 assert(normal.length()>1e-10,'Degenerate garment cut cross-section');normal.normalize();
 const tangent=points[1].clone().sub(points[0]).projectOnPlane(normal).normalize(),bitangent=normal.clone().cross(tangent).normalize();assert(tangent.length()>.99);
 const contour=points.map(p=>{const v=p.clone().sub(points[0]);return new Vector2(v.dot(tangent),v.dot(bitangent));}),triangles=method==='projected'?ShapeUtils.triangulateShape(contour,[]):minimumAreaDisk(points,posedPoints,maxEdgeRatio,forbiddenTriangles);
 assert(triangles.length,'No closure triangulation');
 const signed=triangles.reduce((sum,[a,b,c])=>sum+new Vector3().subVectors(points[b],points[a]).cross(new Vector3().subVectors(points[c],points[a])).dot(normal),0);
 if(signed<0)for(const t of triangles)[t[1],t[2]]=[t[2],t[1]];
 function edges(){const result=new Map();for(const[tIndex,t]of triangles.entries())for(let k=0;k<3;k++){
  const a=t[k],b=t[(k+1)%3],pairs=result.get(key(a,b))??[];pairs.push({a,b,tIndex,third:t[(k+2)%3]});result.set(key(a,b),pairs);
 }return result;}
 for(let pass=0;pass<points.length;pass++){
  const boundary=[...edges().values()].filter(p=>p.length===1).map(p=>p[0]),skip=boundary.find(({a,b})=>(a+1)%points.length!==b);
  if(!skip)break;
  const {a,b,tIndex,third}=skip,sequence=[a];for(let at=(a+1)%points.length;at!==b;at=(at+1)%points.length)sequence.push(at);sequence.push(b);
  const used=new Set(triangles.flat());assert(sequence.slice(1,-1).every(v=>!used.has(v)),'Projected boundary crosses or skips an already used source corner');
  const fan=sequence.slice(0,-1).map((v,i)=>[v,sequence[i+1],third]);triangles.splice(tIndex,1,...fan);
 }
 assert.equal(triangles.length,points.length-2,'Incomplete source-corner disk');let boundaryCount=0;
 for(const pairs of edges().values()){
  if(pairs.length===2)assert(pairs[0].a===pairs[1].b&&pairs[0].b===pairs[1].a,'Inconsistent closure interior winding');
  else{assert.equal(pairs.length,1);assert.equal((pairs[0].a+1)%points.length,pairs[0].b,'Missing or reversed source boundary');boundaryCount++;}
 }assert.equal(boundaryCount,points.length);
 for(const[a,b,c]of triangles)assert(new Vector3().subVectors(points[b],points[a]).cross(new Vector3().subVectors(points[c],points[a])).length()>1e-12,'Degenerate closure triangle');
 return{triangles,normal};
}

/** Global polygon-disk dynamic program on actual 3D source corners. This avoids
 * flattening a folded cross-section into a self-overlapping 2D outline. Actual
 * geometric intersections still require a separate surface audit.
 */
function minimumAreaDisk(points,posedPoints,maxEdgeRatio,forbiddenTriangles){
 const n=points.length,cost=new Float64Array(n*n).fill(Infinity),split=new Int32Array(n*n).fill(-1);
 const allowed=posedPoints?new Uint8Array(n*n):null;
 if(allowed)for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  const length=points[i].distanceTo(points[j]);allowed[i*n+j]=length>1e-12&&posedPoints[i].distanceTo(posedPoints[j])/length<=maxEdgeRatio;
 }
 for(let i=0;i<n;i++){cost[i*n+i]=0;if(i+1<n)cost[i*n+i+1]=0;}
 for(let span=2;span<n;span++)for(let i=0;i+span<n;i++){
  const j=i+span,a=points[i],c=points[j],cx=c.x-a.x,cy=c.y-a.y,cz=c.z-a.z;
  for(let k=i+1;k<j;k++){
   if(forbiddenTriangles.has(i+':'+k+':'+j))continue;
   if(allowed&&(!allowed[i*n+k]||!allowed[k*n+j]||!allowed[i*n+j]))continue;
   const b=points[k],bx=b.x-a.x,by=b.y-a.y,bz=b.z-a.z,
    area=Math.hypot(by*cz-bz*cy,bz*cx-bx*cz,bx*cy-by*cx);if(area<=1e-12)continue;
   const perimeter=a.distanceToSquared(b)+b.distanceToSquared(c)+c.distanceToSquared(a),value=cost[i*n+k]+cost[k*n+j]+area+perimeter*1e-9;
   if(value<cost[i*n+j]){cost[i*n+j]=value;split[i*n+j]=k;}
  }
 }
 assert(Number.isFinite(cost[n-1]),'No nondegenerate source-corner disk');const triangles=[];
 function visit(i,j){if(j-i<2)return;const k=split[i*n+j];assert(k>i&&k<j);triangles.push([i,k,j]);visit(i,k);visit(k,j);}
 visit(0,n-1);return triangles;
}
