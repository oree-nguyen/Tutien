import {Matrix4,Vector3} from "three";

/** Lower-foot source vertices, selected geometrically in the unchanged bind mesh.
 * Every selected vertex is skinned from its original four influences. These
 * automatic regions are diagnostic; a visual semantic-foot approval is separate.
 */
export function sourceFootContact(doc,root,{height=.15,sourceSelection=null}={}) {
  const sides={Left:[],Right:[]},joints=new Map(),selected=sourceSelection?Object.fromEntries(['Left','Right'].map(side=>[side,{vertices:new Set(sourceSelection.sides[side].vertexIds),sole:new Set(sourceSelection.sides[side].soleVertexIds),seen:new Set()}])):null;
  if(selected)for(const side of ['Left','Right']){const s=selected[side];if(!s.vertices.size||!s.sole.size||[...s.sole].some(id=>!s.vertices.has(id)))throw Error('Invalid source boot selection: '+side);}
  for(const[nodeIndex,node]of doc.getRoot().listNodes().entries()) {
    if(!node.getMesh()||!node.getSkin())continue;
    const skin=node.getSkin(),bones=skin.listJoints(),ibm=skin.getInverseBindMatrices(),
      matrices=bones.map((bone,i)=>{
        const key=bone.getName();
        if(!joints.has(key))joints.set(key,{bone:root.getObjectByName(key),inverseBind:new Matrix4().fromArray(ibm.getElement(i,[])),matrix:new Matrix4()});
        return joints.get(key);
      });
    for(const[primitiveIndex,p]of node.getMesh().listPrimitives().entries()) {
      const position=p.getAttribute("POSITION"),ids=p.getAttribute("JOINTS_0"),weights=p.getAttribute("WEIGHTS_0"),
        transform=new Matrix4().fromArray(node.getWorldMatrix()),sourceIds=p.getAttribute('_SOURCE_VERTEX');
      for(let vertex=0;vertex<position.getCount();vertex++) {
        const original=new Vector3(...position.getElement(vertex,[])),bind=original.clone().applyMatrix4(transform);
        const id=sourceIds?sourceIds.getScalar(vertex):vertex;
        if(!selected&&(bind.y>height||Math.abs(bind.x)<.04))continue;
        const side=selected?['Left','Right'].find(s=>selected[s].vertices.has(id)):(bind.x>0?'Left':'Right');if(!side)continue;
        if(selected)selected[side].seen.add(id);
        const influences=ids.getElement(vertex,[]),amounts=weights.getElement(vertex,[]);
        sides[side].push({nodeIndex,primitiveIndex,vertex,bind:bind.toArray(),position:original,
          sole:selected?selected[side].sole.has(id):bind.y<=.01,influences:amounts.flatMap((weight,k)=>weight?[{joint:matrices[influences[k]],weight}]:[])});
      }
    }
  }
  for(const side of Object.keys(sides))if(!sides[side].length)throw Error("No actual source lower-foot vertices: "+side);
  if(selected)for(const side of ['Left','Right'])if(selected[side].seen.size!==selected[side].vertices.size)throw Error('Missing mapped source boot vertices: '+side);
  const point=new Vector3(),value=new Vector3();
  return {
    selection:{method:selected?'Exact graph-selected source boot IDs, including upper boot surfaces; independent source hash and visual review remain caller obligations. No spatial lower-body box or cloth exclusion changes the original whole-mesh gate.':"Automatic lower-source region: every unchanged source vertex with bind world y <= 150 mm and abs(x) >= 40 mm, includes residual cloth; side follows character x sign. Separate bind-bottom subset y <= 10 mm is provisional, not a certified semantic sole.",visuallyVerified:false,
      sides:Object.fromEntries(Object.entries(sides).map(([side,rows])=>[side,{vertices:rows.length,soleVertices:rows.filter(v=>v.sole).length,
        sourceIds:rows.map(({nodeIndex,primitiveIndex,vertex})=>[nodeIndex,primitiveIndex,vertex])}]))},
    measure(){
      for(const joint of joints.values())joint.matrix.copy(joint.bone.matrixWorld).multiply(joint.inverseBind);
      return Object.fromEntries(Object.entries(sides).map(([side,rows])=>{
        let minimumY=Infinity,soleMinimumY=Infinity,soleMaximumY=-Infinity,soleMaximumVerticalError=0,minimumSource,soleMinimumSource;
        for(const row of rows){
          point.set(0,0,0);
          for(const{joint,weight}of row.influences)point.addScaledVector(value.copy(row.position).applyMatrix4(joint.matrix),weight);
          if(point.y<minimumY){minimumY=point.y;minimumSource=[row.nodeIndex,row.primitiveIndex,row.vertex];}
          if(row.sole){
            if(point.y<soleMinimumY){soleMinimumY=point.y;soleMinimumSource=[row.nodeIndex,row.primitiveIndex,row.vertex];}
            soleMaximumY=Math.max(soleMaximumY,point.y);soleMaximumVerticalError=Math.max(soleMaximumVerticalError,Math.abs(point.y-row.bind[1]));
          }
        }
        return[side,{lowerSourceMinimumY:minimumY,minimumY,soleMinimumY,soleMaximumY,soleMaximumVerticalError,minimumSource,soleMinimumSource}];
      }));
    },
  };
}

/** Restart the anchor after a real swing or change of supporting source joint.
 * A contact label never overrides the independently measured mesh-floor result.
 */
export function updatePlantedContact(previous,contact,point) {
  if(!contact?.planted)return {state:null,slide:0};
  const state=previous?.joint===contact.anchorJoint?previous:{joint:contact.anchorJoint,point:point.clone()};
  return {state,slide:Math.hypot(point.x-state.point.x,point.z-state.point.z)};
}
