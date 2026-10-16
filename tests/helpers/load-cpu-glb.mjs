import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
// Preserve compressed geometry/skin/clip data, omitting only browser image decode.
// Actual image embedding and material channels are checked on the original GLB.
export async function loadCpuGlb(path){
 const raw=await readFile(path),length=raw.readUInt32LE(12);
 const json=JSON.parse(raw.subarray(20,20+length).toString());
 delete json.images;delete json.textures;delete json.materials;
 for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
 const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(padded);
 const binary=raw.subarray(20+length),header=Buffer.alloc(20);
 header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+binary.length,8);
 header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const clean=Buffer.concat([header,padded,binary]);
 return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(clean.buffer.slice(clean.byteOffset,clean.byteOffset+clean.byteLength),'');
}
