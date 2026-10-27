import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryTrainingDatabase } from "../src/lib/training-offline/memory-adapter";
import {
  saveTrainingOffline, flushReadyTrainingCommands, readyTrainingCommands,
} from "../src/lib/training-offline/protocol";
import {
  createVerifiedDevTrainingSender, readVerifiedDevTrainingSession,
  type DevSupabaseTransport,
} from "../src/lib/training-offline/dev-supabase-sender";
import { importVerifiedRemoteSession } from "../src/lib/training-offline/verified-remote-import";
import type { Session } from "../src/lib/training-core/types";

const a="11111111-1111-4111-8111-111111111111";
const b="22222222-2222-4222-8222-222222222222";
const config={
  devUrl:"https://abcdefghijklmnop.supabase.co",
  expectedDevProjectRef:"abcdefghijklmnop",
  productionUrl:"https://eszdtxsvwgejnbsczgxf.supabase.co",
};
const time="2026-10-22T11:00:00.000Z";
const cid=(i:number)=>"aaaaaaaa-aaaa-4aaa-8aaa-"+String(i).padStart(12,"0");
const session=(name:string,id="training-abc"):Session=>({
  id,date:"2026-10-22",name,status:"in_progress",createdAt:time,
  exercises:[{id:"ex",name:"Squat",sets:[]}],
});
type Stored = {revision:number; session:Session};
const serverSessions=new Map<string,Stored>();
const ledger=new Map<string,{request:string;result:unknown}>();
function mockDevServer(owner:string):DevSupabaseTransport {
  return {
    auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},
    rpc:async(method,p)=>{
      const key=owner+"/"+String(p.p_session_id);
      if(method==="jfs_dev_read_session_v1"){
        const stored=serverSessions.get(key);
        return{data:stored?{
          session_id:String(p.p_session_id),revision:stored.revision,
          session:structuredClone(stored.session),written_at:time,
        }:null,error:null};
      }
      if(method!=="jfs_dev_apply_session_v1")throw Error("Unexpected RPC");
      const cmd=owner+"/"+String(p.p_command_id);
      const req=JSON.stringify(p);
      const existing=ledger.get(cmd);
      if(existing) {
        if(existing.request!==req) return {data:null,error:{code:"22023",message:"Command changed"}};
        return {data:existing.result,error:null};
      }
      const prior=serverSessions.get(key);
      const expected=prior?.revision??0;
      if(expected!==p.p_expected_revision) return {
        data:null,error:{code:"40001",message:"TRAINING_VERSION_CONFLICT"},
      };
      const revision=expected+1;
      const result={
        command_id:p.p_command_id,session_id:p.p_session_id,
        revision,outcome:"applied",
      };
      serverSessions.set(key,{revision,session:structuredClone(p.p_session as Session)});
      ledger.set(cmd,{request:req,result});
      return{data:result,error:null};
    },
  };
}
test("Web→iOS→Android protocol simulation delivers same synthetic Session, preserves Android conflict",async()=>{
  serverSessions.clear(); ledger.clear();
  const web=new MemoryTrainingDatabase();
  const ios=new MemoryTrainingDatabase();
  const android=new MemoryTrainingDatabase();
  const sender=createVerifiedDevTrainingSender(mockDevServer(a),config);
  await saveTrainingOffline(web,{ownerId:a,session:session("WEB START"),commandId:cid(1),now:time});
  assert.equal((await flushReadyTrainingCommands(web,a,Date.parse(time),()=>true,sender)).applied,1);
  assert.equal(serverSessions.get(a+"/training-abc")?.revision,1);

  const transport=mockDevServer(a);
  const onIos=await readVerifiedDevTrainingSession(transport,config,a,"training-abc");
  const onAndroid=await readVerifiedDevTrainingSession(transport,config,a,"training-abc");
  assert.ok(onIos && onAndroid);
  await importVerifiedRemoteSession(ios,a,onIos);
  await importVerifiedRemoteSession(android,a,onAndroid);
  const importedIos=await ios.transact(tx=>tx.getSnapshot(a,"training-abc"));
  const importedAndroid=await android.transact(tx=>tx.getSnapshot(a,"training-abc"));
  assert.equal(importedIos?.serverRevision,1);
  assert.equal(importedAndroid?.payload.name,"WEB START");

  await saveTrainingOffline(ios,{ownerId:a,session:session("IOS OFFLINE EDIT"),commandId:cid(2),now:time});
  await saveTrainingOffline(android,{ownerId:a,session:session("ANDROID OFFLINE EDIT"),commandId:cid(3),now:time});
  assert.equal((await flushReadyTrainingCommands(ios,a,Date.parse(time),()=>true,sender)).applied,1);
  assert.equal(serverSessions.get(a+"/training-abc")?.revision,2);
  const conflict=await flushReadyTrainingCommands(android,a,Date.parse(time),()=>true,sender);
  assert.equal(conflict.blocked,1);
  const localAndroid=await android.transact(async tx=>({
    snapshot:await tx.getSnapshot(a,"training-abc"),
    outbox:await tx.listCommands(a),
  }));
  assert.equal(localAndroid.snapshot?.payload.name,"ANDROID OFFLINE EDIT");
  assert.equal(localAndroid.outbox[0].status,"conflict");
  assert.deepEqual(await readyTrainingCommands(android,a,Date.parse(time)+60000),[]);
  await assert.rejects(importVerifiedRemoteSession(android,a,{
    ...onAndroid,session:session("SERVER TRIES TO OVERWRITE"),revision:2,
  }),/reconciliation required/);
  assert.equal((await android.transact(tx=>tx.getSnapshot(a,"training-abc")))?.payload.name,"ANDROID OFFLINE EDIT");

  assert.equal(await readVerifiedDevTrainingSession(mockDevServer(b),config,b,"training-abc"),null);
  const revisedIos=await ios.transact(tx=>tx.getSnapshot(a,"training-abc"));
  assert.equal(revisedIos?.payload.name,"IOS OFFLINE EDIT");
});
