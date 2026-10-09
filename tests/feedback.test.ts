import { test } from "node:test";
import assert from "node:assert/strict";
import { soundChanges } from "../src/lib/sound-signals";
import { soundRecipes } from "../src/lib/audio";
import { summarizePlaystyle } from "../src/lib/playstyle";
import { createRoom, createPlayer, startHand, act, projectRoom } from "../src/lib/poker/engine";
import type { HandResult, Profile } from "../src/lib/types";
const profile: Profile = { id:"self",name:"Self",color:"blue",createdAt:1,preferences:{sound:true,assistant:true,reducedMotion:false} };
function room() { const r=createRoom(profile,"Feedback",{maxPlayers:2,startingStack:1000,smallBlind:10,turnSeconds:90},false,1000); r.players.push(createPlayer({id:"guest",name:"Guest",color:"sage"},1000,false,1000)); return r; }

test("audio stays silent on initial load, room switches, duplicate updates and old reconnect events",()=>{
 const r=room(); startHand(r,2000,"11223344"); const before=structuredClone(projectRoom(r,"self",2001));
 assert.deepEqual(soundChanges(null,before,"self",2001),[]);
 assert.deepEqual(soundChanges(before,before,"self",2001),[]);
 assert.deepEqual(soundChanges({...before,code:"OTHER"},before,"self",2001),[]);
 act(r,r.hand!.actor!,"call",undefined,2500); const next=projectRoom(r,"self",2600);
 assert.ok(soundChanges(before,next,"self",2600).includes("call"));
 assert.ok(soundChanges(before,next,"self",2600).includes(next.hand!.actor === "self" ? "your-turn" : "other-turn"));
 assert.ok(!soundChanges(before,next,"self",20000).includes("call"));
 assert.deepEqual(soundChanges(next,next,"self",2700),[]);
});
test("personal victory is distinct from another player's result, including final session updates",()=>{
 const r=room(); startHand(r,2000,"11223344"); const before=structuredClone(projectRoom(r,"self",2001)); act(r,r.hand!.actor!,"fold",undefined,2500);
 const next=projectRoom(r,"self",2600); const winner=next.hand!.result!.winners[0].id; assert.deepEqual(soundChanges(before,next,winner,2600),["win"]);
 assert.deepEqual(soundChanges(before,next,winner === "self" ? "guest" : "self",2600),["result"]);
});
test("every named sound has a distinct bounded recipe",()=>{
 const recipes=Object.values(soundRecipes); assert.equal(new Set(recipes.map(r=>JSON.stringify(r))).size,recipes.length);
 for(const recipe of recipes) for(const [hz,delay,length,gain=.13] of recipe) { assert.ok(hz>=130&&hz<2000); assert.ok(delay>=0&&delay+length<1.2); assert.ok(gain>0&&gain<=.25); }
});
const fixture = (events: HandResult["events"], cards = [{rank:14,suit:"h"},{rank:10,suit:"d"}] as HandResult["board"]): HandResult => ({number:1,startedAt:1,endedAt:2,pot:100,board:[{rank:2,suit:"s"},{rank:7,suit:"d"},{rank:9,suit:"c"},{rank:14,suit:"s"},{rank:14,suit:"c"}],winners:[],pots:[],events,players:[{id:"self",name:"Self",color:"blue",bot:false,cards,showdown:false,won:0,invested:50,net:-50,hand:"Three of a kind",actions:{raise:2,call:0,check:0,fold:1},assistantUses:0}]});
const event=(id:string,type:string,street:"preflop"|"flop",playerId="self")=>({id,type,street,playerId,at:1,hand:1,message:type});
test("playstyle excludes forced blinds and evaluates bluff proxy at the actual betting street",()=>{
 const hand=fixture([event("a","blind","preflop"),event("b","raise","preflop"),event("c","raise","flop"),event("d","fold","flop")]);
 const s=summarizePlaystyle([hand],"self"); assert.equal(s.vpip.value,100); assert.equal(s.pfr.value,100); assert.equal(s.bluff.value,100); assert.equal(s.continuation.value,100); assert.equal(s.showdown.value,null); assert.equal(s.label,"Finding your style");
 const noDecisions=fixture([event("a","blind","preflop")]); assert.equal(summarizePlaystyle([noDecisions],"self").vpip.value,0);
 const pair=fixture([event("a","raise","flop")],[{rank:9,suit:"h"},{rank:10,suit:"d"}]); assert.equal(summarizePlaystyle([pair],"self").bluff.value,0);
 assert.equal(summarizePlaystyle([hand],"outsider").sample,0);
});
test("3-bet opportunity is counted once on a first decision facing one raise; zero samples remain unknown",()=>{
 const hand=fixture([event("a","raise","preflop","guest"),event("b","raise","preflop"),event("c","raise","preflop")]); const s=summarizePlaystyle([hand],"self"); assert.equal(s.threeBet.sample,1); assert.equal(s.threeBet.value,100); assert.equal(s.continuation.value,null);
 const empty=summarizePlaystyle([],"self"); assert.equal(empty.vpip.value,null); assert.equal(empty.bluff.value,null); assert.equal(empty.sample,0);
});

test("audio unlock waits for the browser, queues only current alerts, and stops scheduled sounds on mute",async()=>{
 const audio=await import("../src/lib/audio");
 let created=0,resumed=0,started=0,stopped=0;
 const parameter={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}};
 const node=()=>({connect(){},disconnect(){},start(){started++;},stop(){stopped++;},frequency:{...parameter},gain:{...parameter},onended:null,type:"",buffer:null});
 class Context {
   state="suspended"; currentTime=0; sampleRate=8000; destination={}; onstatechange:null|(()=>void)=null;
   constructor(){created++;}
   async resume(){resumed++; await Promise.resolve();this.state="running";this.onstatechange?.();}
   createGain(){return node();} createDynamicsCompressor(){return node();} createOscillator(){return node();} createBufferSource(){return node();} createBiquadFilter(){return node();}
   createBuffer(_channels:number,size:number){return {getChannelData:()=>new Float32Array(size)};}
 }
 const prior=Object.getOwnPropertyDescriptor(globalThis,"window");
 Object.defineProperty(globalThis,"window",{configurable:true,value:{AudioContext:Context}});
 try {
   audio.setSoundEnabled(true);
   assert.equal(audio.playSound("your-turn"),false); assert.equal(created,0); assert.equal(audio.audioSnapshot(),"locked");
   const ready=audio.unlockSounds(); assert.equal(created,1); assert.equal(resumed,1);
   await ready; assert.equal(audio.audioSnapshot(),"ready"); assert.equal(started,2);
   assert.equal(audio.playSound("deal"),true); assert.ok(started>2);
   audio.setSoundEnabled(false); assert.ok(stopped>=started); assert.equal(audio.playSound("win"),false);
 } finally { audio.setSoundEnabled(false); if(prior)Object.defineProperty(globalThis,"window",prior);else Reflect.deleteProperty(globalThis,"window"); }
});
