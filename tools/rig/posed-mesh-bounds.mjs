/** Exact used-vertex bounds after skinning. Unused accessor entries do not draw. */
export function posedMeshBounds(positions,used,sourceIds){
 if(positions.length!==used.length*3||(sourceIds&&sourceIds.length!==used.length))throw Error('Posed bound layout mismatch');
 const minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity];let count=0,minimumYVertex=null;
 for(let i=0;i<used.length;i++)if(used[i]){
  count++;
  for(let k=0;k<3;k++){
   const value=positions[i*3+k];if(!Number.isFinite(value))throw Error('Nonfinite used posed vertex '+i);
   if(value<minimum[k]){minimum[k]=value;if(k===1)minimumYVertex={vertex:i,sourceVertex:sourceIds?sourceIds[i]:null,position:Array.from(positions.subarray(i*3,i*3+3))};}
   maximum[k]=Math.max(maximum[k],value);
  }
 }
 return count?{usedVertices:count,minimum,maximum,minimumYVertex,scope:'All rendered source surfaces after exact FK skinning; includes garments, not just boot/sole selection. Diagnostic bounds do not waive any phase-specific floor test.'}:null;
}
