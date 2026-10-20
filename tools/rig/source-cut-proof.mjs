import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const defaultRegistry=fileURLToPath(new URL('../../data/rig/garment-patterns/index.json',import.meta.url)),
 oracle=fileURLToPath(new URL('./verify_cut_fans.py',import.meta.url)),hash=b=>createHash('sha256').update(b).digest('hex'),
 bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);

/** A declared boolean cannot authorize a cut. A repository review record binds
 * the exact original source and exact edge list; graph fans are reconstructed.
 */
export async function sourceCutProof(source,metadata,readFile,{registryFile=defaultRegistry}={}){
 const declaration=metadata.cutPattern;if(!declaration)return null;
 const registry=JSON.parse(await fs.readFile(registryFile)),approved=registry.patterns?.find(p=>p.id===declaration.id);
 if(!approved||approved.reviewed!==true||approved.sourceSha256!==source.sha256)throw Error('Source cut pattern is not in the reviewed repository registry');
 if(declaration.accessor!=='_SOURCE_CUT_WELD'||declaration.edges?.sha256!==approved.edgesSha256)throw Error('Source cut map differs from reviewed pattern');
 const edgeBytes=(await readFile(declaration.edges.file,declaration.edges.sha256,true)).bytes;
 if(edgeBytes.length!==approved.edgeCount*8||hash(edgeBytes)!==approved.edgesSha256)throw Error('Invalid reviewed source cut edge count/hash');
 source.cutProofs??=new Map();
 if(source.cutProofs.has(approved.id))return source.cutProofs.get(approved.id);
 if(!source.boundaryProof)throw Error('Original UV source-boundary proof is required before any garment cut');
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'hg-source-cut-'));
 try{
  await fs.writeFile(path.join(temporary,'triangles.u32bin'),bytes(Uint32Array.from(source.primitive.getIndices().getArray())));
  await fs.writeFile(path.join(temporary,'welds.u32bin'),bytes(source.boundaryProof.ids));
  await fs.writeFile(path.join(temporary,'cuts.u32bin'),edgeBytes);
  const output=await new Promise((resolve,reject)=>{
   const child=spawn('python3',[oracle,temporary],{env:{...process.env,OPENBLAS_NUM_THREADS:'1'},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
   child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('exit',code=>code===0?resolve(stdout):reject(Error('Source-cut oracle rejected: '+stderr)));
  });
  const result=await fs.readFile(path.join(temporary,'expected-corners.u32bin'));
  if(result.length!==source.primitive.getIndices().getCount()*4)throw Error('Source-cut oracle omitted source corners');
  const corners=Uint32Array.from(new Uint32Array(result.buffer,result.byteOffset,result.byteLength/4)),
   proof={id:approved.id,sourceSha256:source.sha256,edgesSha256:approved.edgesSha256,edgeCount:approved.edgeCount,corners,method:JSON.parse(output).method};
  source.cutProofs.set(approved.id,proof);return proof;
 }finally{await fs.rm(temporary,{recursive:true,force:true});}
}
