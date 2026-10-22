/** Opt-in smoke verification against a SEPARATE Supabase development project.
 * Never put credentials in source, CLI output or public CI artifacts.
 * Runs no writes unless the operator explicitly opts in.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  assertIsolatedDevProject, createVerifiedDevTrainingSender,
  readVerifiedDevTrainingSession,
} from "../src/lib/training-offline/dev-supabase-sender";
import type { TrainingOutboxCommand } from "../src/lib/training-offline/protocol";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw Error("Dev smoke blocked: missing " + key);
  return value;
}
if (process.env.JFS_DEV_SMOKE_ALLOW_WRITES !== "YES_I_CONFIRM_SYNTHETIC_DEV_ONLY") {
  throw Error("Dev smoke blocked. Set JFS_DEV_SMOKE_ALLOW_WRITES explicitly to opt in.");
}
const config = {
  devUrl: required("JFS_DEV_SUPABASE_URL"),
  productionUrl: required("JFS_PRODUCTION_SUPABASE_URL"),
  expectedDevProjectRef: required("JFS_DEV_PROJECT_REF"),
};
assertIsolatedDevProject(config);
const publishable = required("JFS_DEV_SUPABASE_PUBLISHABLE_KEY");
if (/^sb_secret_|service_role|postgres:\/\//i.test(publishable))
  throw Error("Do not use a privileged Supabase secret in a client smoke test");

function userClient() {
  return createClient(config.devUrl,publishable,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  });
}
const alice=userClient();
const bob=userClient();
try {
  const pairs = [
    [alice,required("JFS_DEV_TEST_A_EMAIL"),required("JFS_DEV_TEST_A_PASSWORD")],
    [bob,required("JFS_DEV_TEST_B_EMAIL"),required("JFS_DEV_TEST_B_PASSWORD")],
  ] as const;
  for (const [client,email,password] of pairs) {
    const {error}=await client.auth.signInWithPassword({email,password});
    if (error) throw Error("Dev-only test account sign-in failed");
  }
  const {data:{user:aliceUser},error:aliceError}=await alice.auth.getUser();
  const {data:{user:bobUser},error:bobError}=await bob.auth.getUser();
  if (aliceError||bobError||!aliceUser||!bobUser||aliceUser.id===bobUser.id)
    throw Error("Two distinct, server-verified synthetic Dev Auth identities required");

  // Both operations deliberately use the same Session ID to prove owner isolation.
  const sessionId="smoke-"+randomUUID();
  const now=new Date().toISOString();
  const date=now.slice(0,10);
  const clientTransport = (client:typeof alice) => ({
    auth:{getUser:()=>client.auth.getUser()},
    rpc:async (method:string,params:Record<string,unknown>)=>{
      const {data,error}=await client.rpc(method,params);
      return {data,error};
    },
  });
  const ownerA=clientTransport(alice), ownerB=clientTransport(bob);
  function makeCommand(ownerId:string,name:string):TrainingOutboxCommand {
    return{
      ownerId,commandId:randomUUID(),sessionId,sequence:1,
      expectedRevision:0,createdAt:now,retryAfter:0,attempts:0,status:"pending",
      session:{id:sessionId,name,date,status:"in_progress",createdAt:now,exercises:[]},
    };
  }
  const a=makeCommand(aliceUser.id,"Synthetic dev A");
  const b=makeCommand(bobUser.id,"Synthetic dev B");
  const sendA=createVerifiedDevTrainingSender(ownerA,config);
  const sendB=createVerifiedDevTrainingSender(ownerB,config);
  const receiptA=await sendA(a);
  const receiptRetry=await sendA(a);
  if (receiptA.revision!==1||receiptRetry.revision!==1)
    throw Error("Dev duplicate command did not return the same revision");

  const ownerARead=await readVerifiedDevTrainingSession(
    ownerA,config,aliceUser.id,sessionId);
  const beforeB=await readVerifiedDevTrainingSession(
    ownerB,config,bobUser.id,sessionId);
  if (!ownerARead||ownerARead.session.name!=="Synthetic dev A"||beforeB!==null)
    throw Error("Dev read before account-B write violated ownership");

  await sendB(b);
  const afterB=await readVerifiedDevTrainingSession(ownerB,config,bobUser.id,sessionId);
  const afterA=await readVerifiedDevTrainingSession(ownerA,config,aliceUser.id,sessionId);
  if (afterB?.session.name!=="Synthetic dev B"||afterA?.session.name!=="Synthetic dev A")
    throw Error("Dev session ownership leaked across accounts");

  let rejected=false;
  try {await sendA({...a,commandId:randomUUID()});}
  catch(error) {rejected=(error as {code?:string}).code==="40001";}
  if (!rejected)throw Error("Dev stale Session update was accepted");

  console.log("PASS: live Supabase DEV Auth, tenant RLS, idempotent write/read and version conflict");
  console.log("No user data or production database accessed. Synthetic records remain in isolated Dev.");
} finally {
  await Promise.allSettled([alice.auth.signOut(),bob.auth.signOut()]);
}
