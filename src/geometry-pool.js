import * as THREE from 'three';
const entries=new Map();
export const geometryPoolMetrics={created:0,reused:0};
/** Shared immutable numeric-parameter scenery meshes. Deforming geometry stays private. */
export function pooledGeometry(type,...parameters){
 const key=type+':'+JSON.stringify(parameters);
 let geometry=entries.get(key);
 if(geometry){geometryPoolMetrics.reused++;return geometry;}
 geometry=new THREE[type](...parameters);geometry.userData.sharedArt=true;geometryPoolMetrics.created++;
 entries.set(key,geometry);return geometry;
}
export function geometryPoolSize(){return entries.size;}
