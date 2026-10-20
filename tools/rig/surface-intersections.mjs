import {BufferGeometry,Float32BufferAttribute,BufferAttribute,Matrix4,Line3,Vector3} from 'three';
import {MeshBVH,CENTER} from 'three-mesh-bvh';

/** Offline source-face crossing diagnostics, not a volume/collision certificate. */
export function sourceSurfaceIntersections({positions,triangles,welds,labels,witnessLimit=200}){
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setIndex(new BufferAttribute(new Uint32Array(triangles),1));
  const bvh=new MeshBVH(geometry,{strategy:CENTER,maxLeafTris:12,indirect:true}),
    line=new Line3(),n1=new Vector3(),n2=new Vector3(),offset=new Vector3(),pairs=[],witnesses=[];
  let tested=0,coplanar=0,touching=0,neighbors=0;
  try{
    bvh.bvhcast(bvh,new Matrix4(),{intersectsTriangles(a,b,i,j){
      const first=bvh.resolveTriangleIndex(i),second=bvh.resolveTriangleIndex(j);
      if(first>=second||(!labels[first]&&!labels[second]))return false;
      for(let k=0;k<3;k++)for(let l=0;l<3;l++)
        if(welds[triangles[first*3+k]]===welds[triangles[second*3+l]]){neighbors++;return false;}
      tested++;a.getNormal(n1);b.getNormal(n2);
      if(n1.lengthSq()<1e-24||n2.lengthSq()<1e-24)return false;
      const planar=Math.abs(n1.dot(n2))>1-1e-10&&Math.abs(offset.subVectors(b.a,a.a).dot(n1))<1e-7;
      if(planar){if(a.intersectsTriangle(b))coplanar++;return false;}
      if(!a.intersectsTriangle(b,line))return false;
      const length=line.distance();if(length<=1e-6){touching++;return false;}
      pairs.push([first,second]);
      if(witnesses.length<witnessLimit)witnesses.push({sourceFaces:[first,second],labels:[labels[first],labels[second]],segmentMetres:length,segment:[line.start.toArray(),line.end.toArray()]});
      return false;
    }});
    pairs.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    return {sourceTrianglePairsTested:tested,excludedSourceNeighborPairs:neighbors,crossingPairs:pairs.length,coplanarOverlapPairs:coplanar,pointTouchPairs:touching,witnesses,pairs,
      accepted:false,scope:'Non-adjacent original source faces involving garment, BVH triangle crossings. Validated source-weld neighbors excluded; coplanar/contact cases separate. No containment, thickness, full-animation or collision acceptance.'};
  }finally{geometry.dispose();}
}
