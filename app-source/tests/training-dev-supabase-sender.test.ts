import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertIsolatedDevProject, createVerifiedDevTrainingSender,
  type DevSupabaseTransport,
} from "../src/lib/training-offline/dev-supabase-sender";
import type { TrainingOutboxCommand } from "../src/lib/training-offline/protocol";

const prod="https://eszdtxsvwgejnbsczgxf.supabase.co";
const dev="https://abcdefghijklmnop.supabase.co";
const config={ devUrl:dev, productionUrl:prod, expectedDevProjectRef:"abcdefghijklmnop" };
const owner="11111111-1111-4111-8111-111111111111";
const command:TrainingOutboxCommand={
  ownerId:owner,commandId:"aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
  sessionId:"test-session",expectedRevision:0,sequence:1,createdAt:"2026-10-22T09:00:00Z",
  retryAfter:0,attempts:0,status:"pending",
  session:{
    id:"test-session",name:"Synthetic",date:"2026-10-22",
    status:"in_progress",createdAt:"2026-10-22T09:00:00Z",exercises:[],
  },
};

test("isolated DEV sender rejects production URL, mismatched ref and untrusted domains",()=>{
  assert.doesNotThrow(()=>assertIsolatedDevProject(config));
  assert.throws(()=>assertIsolatedDevProject({...config,devUrl:prod}),/separate HTTPS/);
  assert.throws(()=>assertIsolatedDevProject({...config,devUrl:"http://abcdefghijklmnop.supabase.co"}),/separate HTTPS/);
  assert.throws(()=>assertIsolatedDevProject({...config,devUrl:"https://abcdefghijklmnop.supabase.co.attacker.test"}),/separate HTTPS/);
  assert.throws(()=>assertIsolatedDevProject({...config,expectedDevProjectRef:"differentproject"}),/separate HTTPS/);
});
test("RPC only after verified account ID matches queued operation; no owner supplied in params",async()=>{
  let called=0;
  const transport:DevSupabaseTransport={
    auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},
    rpc:async (name,params)=>{
      called++;
      assert.equal(name,"jfs_dev_apply_session_v1");
      assert.equal(params.p_command_id,command.commandId);
      assert.equal(params.p_expected_revision,0);
      assert.equal("owner_id" in params,false);
      return{data:{command_id:command.commandId,session_id:command.sessionId,
        revision:1,outcome:"applied"},error:null};
    },
  };
  const send=createVerifiedDevTrainingSender(transport,config);
  const receipt=await send(command);
  assert.equal(receipt.revision,1);
  assert.equal(called,1);
});
test("foreign or expired Supabase identity cannot send queued operations",async()=>{
  let called=false;
  const transport:DevSupabaseTransport={
    auth:{getUser:async()=>({data:{user:{id:"another-account"}},error:null})},
    rpc:async()=>{called=true;return{data:null,error:null};},
  };
  const send=createVerifiedDevTrainingSender(transport,config);
  await assert.rejects(send(command),/server-verified/);
  assert.equal(called,false);
});
test("server error and mismatched receipt preserve command by rejecting sender",async()=>{
  const denied:DevSupabaseTransport={
    auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},
    rpc:async()=>({data:null,error:{code:"40001",message:"TRAINING_VERSION_CONFLICT"}}),
  };
  await assert.rejects(createVerifiedDevTrainingSender(denied,config)(command),/VERSION_CONFLICT/);
  const stale:DevSupabaseTransport={
    ...denied,
    rpc:async()=>({data:{command_id:command.commandId,session_id:command.sessionId,
      revision:999,outcome:"applied"},error:null}),
  };
  await assert.rejects(createVerifiedDevTrainingSender(stale,config)(command),/invalid Training receipt/);
});
