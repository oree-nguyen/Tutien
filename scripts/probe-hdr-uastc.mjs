import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const executable=process.env.KTX_CLI??'/workspace/ktx-tools/KTX-Software-4.4.2-Linux-x86_64/bin/ktx';
const info=JSON.parse(await fs.readFile('public/art/studio/ibl.json'));
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'hg-hdr-probe-'));
try{
 const args=['create','--raw','--width',String(info.width),'--height',String(info.height),'--format','R16G16B16A16_SFLOAT','--encode','uastc','public/art/studio/ibl-rgba16f.bin',path.join(folder,'ibl.ktx2')];
 const result=spawnSync(executable,args,{encoding:'utf8'});process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
 process.exitCode=result.status??1;
}finally{await fs.rm(folder,{recursive:true,force:true});}
