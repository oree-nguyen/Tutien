import {Matrix4,Vector3} from "three";
/** Static real source vertices in asset coordinates, including every mesh instance.
 * This measures weapon/platform contact only, not character or finger contact. */
export function weaponFloor(doc,pivot){
 const points=[];
 for(const node of doc.getRoot().listNodes())if(node.getMesh()){
  const matrix=new Matrix4().fromArray(node.getWorldMatrix());
  for(const primitive of node.getMesh().listPrimitives()){
   const attribute=primitive.getAttribute("POSITION");
   for(let i=0;i<attribute.getCount();i++)points.push(new Vector3(...attribute.getElement(i,[])).applyMatrix4(matrix).sub(new Vector3(...pivot)));
  }
 }
 if(!points.length)throw Error("Weapon floor check has no actual source vertices");
 const cache=new Map();
 const minimum=q=>{const key=q.toArray().map(v=>v.toFixed(6)).join(",");if(cache.has(key))return cache.get(key);let low=Infinity;for(const p of points)low=Math.min(low,p.clone().applyQuaternion(q).y);cache.set(key,low);return low;};
 return {minimum,vertices:points.length};
}
