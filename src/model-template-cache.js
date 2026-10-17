// Template resources belong to the cache; live actor clones retain a lease.
export class ModelTemplateCache{
 constructor({maxUnused=4,dispose=()=>{}}={}){this.maxUnused=maxUnused;this.dispose=dispose;this.entries=new Map();this.owners=new WeakMap();this.clock=0;}
 has(url){return this.entries.has(url);}
 load(url,create,owner){
  let entry=this.entries.get(url);
  if(!entry){
   entry={refs:0,used:++this.clock,ready:false,value:null};
   this.entries.set(url,entry);
   entry.promise=Promise.resolve().then(create).then(value=>{entry.value=value;entry.ready=true;this.trim();return value;},error=>{if(this.entries.get(url)===entry)this.entries.delete(url);throw error;});
  }
  entry.used=++this.clock;
  if(owner){let leases=this.owners.get(owner);if(!leases){leases=new Set();this.owners.set(owner,leases);}if(!leases.has(entry)){leases.add(entry);entry.refs++;}}
  return entry.promise;
 }
 release(owner){const leases=this.owners.get(owner);if(!leases)return;for(const e of leases)e.refs--;this.owners.delete(owner);this.trim();}
 trim(){
  const unused=[...this.entries].filter(([,e])=>e.ready&&e.refs===0).sort((a,b)=>a[1].used-b[1].used);
  while(unused.length>this.maxUnused){const [url,e]=unused.shift();this.entries.delete(url);this.dispose(e.value);}
 }
 inspect(){return {templates:this.entries.size,referenced:[...this.entries.values()].filter(e=>e.refs>0).length,leases:[...this.entries.values()].reduce((s,e)=>s+e.refs,0)};}
}
