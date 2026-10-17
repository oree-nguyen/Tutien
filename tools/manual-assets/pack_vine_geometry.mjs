import fs from'node:fs/promises';
const data=JSON.parse(await fs.readFile('tools/manual-assets/generated/h01-organic-vines.json'));const parts=[],layout={};let offset=0;
for(const name of ['vines','roots']){layout[name]={};for(const [key,values]of Object.entries(data[name])){const array=key==='index'?new Uint16Array(values):new Float32Array(values);const bytes=Buffer.from(array.buffer);layout[name][key]={offset,bytes:bytes.length,type:key==='index'?'uint16':'float32'};parts.push(bytes);offset+=bytes.length;}}
await fs.mkdir('public/models/h01-vines',{recursive:true});await fs.writeFile('public/models/h01-vines/geometry.bin',Buffer.concat(parts));
await fs.writeFile('src/h01-vine-assets.js','export const vineGeometryUrl="/models/h01-vines/geometry.bin";\nexport const vineGeometryLayout='+JSON.stringify(layout)+';\n');console.log('Packed organic geometry',offset,'bytes');
