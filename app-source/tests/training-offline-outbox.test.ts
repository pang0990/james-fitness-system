import { test } from "node:test";
import assert from "node:assert/strict";
import type { Session } from "../src/lib/training-core/types";
import { MemoryTrainingDatabase } from "../src/lib/training-offline/memory-adapter";
import {
  saveTrainingOffline, readyTrainingCommands, acknowledgeTrainingCommand,
  flushReadyTrainingCommands, markTrainingCommandFailed,
} from "../src/lib/training-offline/protocol";

const ACCOUNT_A="11111111-1111-4111-8111-111111111111";
const ACCOUNT_B="22222222-2222-4222-8222-222222222222";
const NOW="2026-10-22T08:00:00.000Z";
const t0=Date.parse(NOW);
const cid=(digit:number)=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(digit).padStart(12,"0")}`;

function session(name="Synthetic", id="synthetic-1"):Session {
  return {
    id,date:"2026-10-22",name,status:"in_progress",
    createdAt:NOW,cycleCounted:true,
    setDrafts:{"exercise-1": {
      id:"draft-1",weight:"80",reps:"10",type:"working",
      parentId:"",updatedAt:NOW,
    }},
    exercises:[{id:"exercise-1",name:"Barbell Row",sets:[]}],
  };
}
const save = (db:MemoryTrainingDatabase, ownerId:string, commandId:string, payload:Session=session(), now=NOW) =>
  saveTrainingOffline(db,{ownerId,commandId,session:payload,now});
const inspect=(db:MemoryTrainingDatabase, ownerId=ACCOUNT_A, sessionId="synthetic-1")=>
  db.transact(async tx=>({
    snapshot:await tx.getSnapshot(ownerId,sessionId),
    outbox:await tx.listCommands(ownerId),
  }));

test("atomic local save creates one Session and one durable command, strips drafts only from outbound payload",async()=>{
  const db=new MemoryTrainingDatabase();
  const command=await save(db,ACCOUNT_A,cid(1));
  const {snapshot,outbox}=await inspect(db);
  assert.equal(snapshot?.payload.setDrafts?.["exercise-1"]?.weight,"80");
  assert.equal(snapshot?.payload.cycleCounted,true);
  assert.equal(command.session.setDrafts,undefined);
  assert.equal(command.session.cycleCounted,undefined);
  assert.equal(outbox.length,1);
  assert.equal(command.expectedRevision,0);
  assert.equal(command.sequence,1);
  assert.equal(snapshot?.serverRevision,0);
});

test("failed transaction leaves neither a new snapshot nor an outbox command",async()=>{
  const db=new MemoryTrainingDatabase();
  const bad=cid(2);
  await assert.rejects(db.transact(async tx=>{
    await tx.putSnapshot({ownerId:ACCOUNT_A,sessionId:"bad",serverRevision:0,
      localSequence:1,payload:session("bad","bad"),updatedAt:NOW});
    await tx.putCommand({ownerId:ACCOUNT_A,sessionId:"bad",commandId:bad,
      sequence:1,expectedRevision:0,session:session("bad","bad"),
      createdAt:NOW,attempts:0,retryAfter:0,status:"pending"});
    throw Error("disk write aborted");
  }),/disk write aborted/);
  const stored=await inspect(db,ACCOUNT_A,"bad");
  assert.equal(stored.snapshot,undefined);
  assert.deepEqual(stored.outbox,[]);
});

test("same Session queues exact sequential revisions when offline, even with equal timestamp",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(9),session("original"));
  await save(db,ACCOUNT_A,cid(2),session("edited"));
  const first=await readyTrainingCommands(db,ACCOUNT_A,t0);
  assert.equal(first.length,1);
  assert.equal(first[0].commandId,cid(9));
  assert.equal(first[0].expectedRevision,0);
  await acknowledgeTrainingCommand(db,ACCOUNT_A,cid(9),{
    command_id:cid(9),session_id:"synthetic-1",revision:1,outcome:"applied",
  });
  const next=await readyTrainingCommands(db,ACCOUNT_A,t0);
  assert.equal(next[0].commandId,cid(2));
  assert.equal(next[0].expectedRevision,1);
  const before=await inspect(db);
  assert.equal(before.snapshot?.payload.name,"edited");
  assert.equal(before.snapshot?.serverRevision,1);
  await acknowledgeTrainingCommand(db,ACCOUNT_A,cid(2),{
    command_id:cid(2),session_id:"synthetic-1",revision:2,outcome:"applied",
  });
  const after=await inspect(db);
  assert.equal(after.snapshot?.serverRevision,2);
  assert.equal(after.snapshot?.payload.name,"edited");
  assert.deepEqual(after.outbox,[]);
});

test("wrong server receipt cannot silently discard an operation",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(3));
  await assert.rejects(acknowledgeTrainingCommand(db,ACCOUNT_A,cid(3),{
    command_id:cid(3),session_id:"synthetic-1",revision:2,outcome:"applied",
  }),/receipt/);
  assert.equal((await inspect(db)).outbox.length,1);
  assert.equal((await inspect(db)).snapshot?.serverRevision,0);
});

test("temporary network failure backs off and retry sends the same stable command ID",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(4));
  let sent=0;
  const offline=await flushReadyTrainingCommands(db,ACCOUNT_A,t0,()=>true,async()=>{
    sent++;throw Error("disconnected");
  });
  assert.deepEqual(offline,{applied:0,blocked:0,retrying:1});
  assert.equal((await readyTrainingCommands(db,ACCOUNT_A,t0)).length,0);
  assert.equal((await readyTrainingCommands(db,ACCOUNT_A,t0+1000))[0].commandId,cid(4));
  const online=await flushReadyTrainingCommands(db,ACCOUNT_A,t0+1000,()=>true,async command=>{
    sent++;return {command_id:command.commandId,session_id:command.sessionId,
      revision:command.expectedRevision+1,outcome:"applied"};
  });
  assert.equal(online.applied,1);
  assert.equal(sent,2);
  assert.equal((await inspect(db)).outbox.length,0);
});

test("conflict blocks dependent commands and preserves unacknowledged local Session",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(5));
  await save(db,ACCOUNT_A,cid(6),session("new offline value"));
  const conflict=await flushReadyTrainingCommands(db,ACCOUNT_A,t0,()=>true,async()=>{
    throw Object.assign(Error("stale server version"),{code:"40001"});
  });
  assert.equal(conflict.blocked,1);
  assert.deepEqual(await readyTrainingCommands(db,ACCOUNT_A,t0+60_000),[]);
  const state=await inspect(db);
  assert.equal(state.outbox.length,2);
  assert.equal(state.outbox[0].status,"conflict");
  assert.equal(state.snapshot?.payload.name,"new offline value");
  await assert.rejects(save(db,ACCOUNT_A,cid(7)),/Resolve the existing sync conflict/);
});

test("per-account isolation and logout fence prevent a delayed reply from acking queued data",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(7));
  await save(db,ACCOUNT_B,cid(7),session("other identity"));
  assert.equal((await readyTrainingCommands(db,ACCOUNT_B,t0)).length,1);
  assert.equal((await readyTrainingCommands(db,ACCOUNT_A,t0)).length,1);
  let signedIn=true;
  const result=await flushReadyTrainingCommands(db,ACCOUNT_A,t0,()=>signedIn,async cmd=>{
    signedIn=false;return {command_id:cmd.commandId,session_id:cmd.sessionId,
      revision:1,outcome:"applied"};
  });
  assert.equal(result.applied,0);
  assert.equal((await inspect(db,ACCOUNT_A)).outbox.length,1);
  assert.equal((await inspect(db,ACCOUNT_B)).outbox.length,1);
  await assert.rejects(acknowledgeTrainingCommand(db,ACCOUNT_B,cid(7),{
    command_id:cid(7),session_id:"synthetic-1",revision:2,outcome:"applied",
  }),/receipt/);
});

test("invalid server payload and reused local operation ID never replace a saved Session",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(8));
  await assert.rejects(save(db,ACCOUNT_A,cid(8),session("bad duplicate")) ,/reused/);
  await assert.rejects(save(db,ACCOUNT_A,cid(10),{
    ...session(), exercises:[{id:"exercise-1",name:"Barbell Row",
      sets:[{id:"invalid-set",type:"working",weight:-1,reps:8,rir:2,createdAt:NOW}]}],
  }),/too_small|nonnegative|>=0|greater/i);
  const state=await inspect(db);
  assert.equal(state.outbox.length,1);
  assert.equal(state.snapshot?.payload.name,"Synthetic");
});

test("rejected backend command remains saved for explicit reconciliation",async()=>{
  const db=new MemoryTrainingDatabase();
  await save(db,ACCOUNT_A,cid(11));
  await markTrainingCommandFailed(db,ACCOUNT_A,cid(11),t0,"rejected","validation error");
  assert.equal((await inspect(db)).outbox[0].status,"rejected");
  assert.equal((await readyTrainingCommands(db,ACCOUNT_A,t0+100_000)).length,0);
});
