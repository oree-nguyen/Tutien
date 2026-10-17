const actorFields=['realm','id','kind','hero','team','x','z','dir','alive','extracted','hp','mp','branch','skin','costume','rings','bones','cooldowns','downedUntil','tier','species','mutant','boss','name','stealthUntil','untargetableUntil','visionReducedUntil','reveals'];
function actorPacket(actor,match){const result={};for(const key of actorFields)if(actor[key]!==undefined)result[key]=actor[key];result.maxHp=match.getStats(actor).hp;result.realm=actor.realm??0;
 if(actor.companion)result.companion={x:actor.companion.x,z:actor.companion.z};
 if(actor.channel)result.channel={gate:{...actor.channel.gate},mode:actor.channel.mode,elapsed:actor.channel.elapsed,total:actor.channel.total};return result;}
/** Rendering receives visible data, never a second simulation or a whole serialized match. */
export function packRenderMatch(match){
 if(!match?.player)return null;const player=match.player,actors=[];
 for(const actor of match.actors){if(actor!==player&&(!actor.alive||actor.extracted||(actor.x-player.x)**2+(actor.z-player.z)**2>1600||(match.visible&&!match.visible(player,actor))))continue;actors.push(actorPacket(actor,match));}
 const owner=actor=>({id:actor.id,hero:actor.hero,realm:actor.realm??0});
 return {time:match.time,playerId:player.id,actors,gates:match.gates.map(g=>({...g})),bushes:match.bushes,obstacles:match.obstacles,
  zones:match.zones.filter(z=>(z.realm??z.owner.realm??0)===(player.realm??0)).map(z=>({id:z.id,delayed:z.delayed,k:z.k,sk:{radius:z.sk.radius},point:{...z.point},end:z.end,realm:z.realm??z.owner.realm??0,owner:owner(z.owner)})),
  effects:match.effects.filter(e=>(e.realm??0)===(player.realm??0)&&(e.x-player.x)**2+(e.z-player.z)**2<3025).map(e=>({...e})),
  projectiles:match.projectiles.filter(p=>(p.x-player.x)**2+(p.z-player.z)**2<2025).map(p=>({id:p.id,x:p.x,z:p.z,dir:{...p.dir},realm:p.realm??p.owner.realm??0,owner:owner(p.owner)})),
  drops:match.drops.filter(d=>(d.x-player.x)**2+(d.z-player.z)**2<1600).map(d=>({id:d.id,x:d.x,z:d.z,realm:d.realm??0}))};
}
export function hydrateRenderMatch(packet){
 if(!packet)return null;packet.player=packet.actors.find(a=>a.id===packet.playerId);
 packet.getStats=actor=>({hp:actor.maxHp??actor.hp});packet.visible=()=>true;return packet;
}
