export const PHASES=Object.freeze({BOOT:'BOOTING',LOBBY:'LOBBY_HON_THANH',LOADING:'MATCH_LOADING',MATCH:'IN_MATCH',CLEANUP:'MATCH_RESULT_CLEANUP'});
const edges={BOOTING:['LOBBY_HON_THANH'],LOBBY_HON_THANH:['MATCH_LOADING'],MATCH_LOADING:['IN_MATCH','LOBBY_HON_THANH','MATCH_RESULT_CLEANUP'],IN_MATCH:['MATCH_RESULT_CLEANUP'],MATCH_RESULT_CLEANUP:['LOBBY_HON_THANH']};
/** A one-use trusted gesture authorizes only the current asynchronous transition. */
export class GameLifecycleStateMachine{
 constructor(){this.phase=PHASES.BOOT;this.revision=0;this.transitions=[];}
 transition(next){if(!edges[this.phase]?.includes(next))throw Error(`Invalid lifecycle ${this.phase} -> ${next}`);this.transitions.push({from:this.phase,to:next});this.phase=next;return ++this.revision;}
 boot(){return this.transition(PHASES.LOBBY);}
 begin(event){if(event?.isTrusted!==true||this.phase!==PHASES.LOBBY)return null;return this.transition(PHASES.LOADING);}
 valid(token){return this.phase===PHASES.LOADING&&token===this.revision;}
 enter(token){if(!this.valid(token))return false;this.transition(PHASES.MATCH);return true;}
 cancel(){if(this.phase===PHASES.LOADING)this.transition(PHASES.LOBBY);}
 cleanup(){if(this.phase===PHASES.MATCH||this.phase===PHASES.LOADING)this.transition(PHASES.CLEANUP);if(this.phase===PHASES.CLEANUP)this.transition(PHASES.LOBBY);}
}
const staleKeys=['activeMatch','matchState','currentBattle','inMatch','battleSession','combatState','autoStartMatch','pendingMatch','survivalRunState','extractionState','currentScene','gamePhase','activeMatchState','autoResumeBattle'];
/** Only known transient keys are removed. Never sweep unrelated JSON/accounts or the GLB cache. */
export function sanitizeStaleMatchStateOnBoot(local,session){
 for(const store of [local,session])if(store)for(const key of staleKeys){try{store.removeItem(key);}catch{}}
}
