import test from 'node:test';
import assert from 'node:assert/strict';
import {LobbyEntranceClock} from '../src/lobby-entrance-clock.js';

test('replay waits exactly 7200ms after completion and never overlaps an entrance', () => {
  const clock=new LobbyEntranceClock();let count=0;
  const tick=(now,complete=true)=>clock.tick({now,hero:0,active:true,ready:true,complete},()=>count++);
  tick(0,false);tick(3000);tick(10199);assert.equal(count,0);tick(10200);assert.equal(count,1);
  tick(10201,false);tick(13200);tick(20399);assert.equal(count,1);tick(20400);assert.equal(count,2);
});
test('hero change, loading, hidden view and unloaded model cancel a pending replay', () => {
  for(const change of [{hero:1},{active:false},{ready:false}]) {
    const clock=new LobbyEntranceClock();let count=0;
    const state={now:0,hero:0,active:true,ready:true,complete:true};
    clock.tick(state,()=>count++);clock.tick({...state,now:7100,...change},()=>count++);
    clock.tick({...state,now:7200},()=>count++);assert.equal(count,0);
  }
});
