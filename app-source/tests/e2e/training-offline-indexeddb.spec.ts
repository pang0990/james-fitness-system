import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const bundle = resolve(process.cwd(), "test-output", "jfs-offline-harness.js");
const script = readFileSync(bundle, "utf8");

type Harness = {
  WebIndexedDbTrainingDatabase: new () => {
    transact<T>(fn:(tx:{
      getSnapshot(owner:string,id:string):Promise<unknown>;
      putSnapshot(value:unknown):Promise<void>;
      listCommands(owner:string):Promise<unknown[]>;
    })=>Promise<T>):Promise<T>;
  };
  saveTrainingOffline:(db:unknown,input:unknown)=>Promise<unknown>;
  readyTrainingCommands:(db:unknown,owner:string,now:number)=>Promise<unknown[]>;
  acknowledgeTrainingCommand:(db:unknown,owner:string,id:string,receipt:unknown)=>Promise<boolean>;
  markTrainingCommandFailed:(db:unknown,owner:string,id:string,now:number,kind:string,reason:string)=>Promise<void>;
};
declare global { interface Window { __jfsOfflineHarness?: Harness } }

const accountA = "11111111-1111-4111-8111-111111111111";
const accountB = "22222222-2222-4222-8222-222222222222";
const commandA = "aaaaaaaa-aaaa-4aaa-8aaa-000000000081";
const commandB = "aaaaaaaa-aaaa-4aaa-8aaa-000000000082";

test.beforeEach(async({page})=>{
  await page.goto("/");
  await page.addScriptTag({content:script, type:"module"});
  await page.waitForFunction(()=>Boolean(window.__jfsOfflineHarness));
});

test("real Chromium IndexedDB commits Session + Outbox atomically and survives browser reload",async({page})=>{
  const result = await page.evaluate(async({accountA,commandA})=>{
    const h=window.__jfsOfflineHarness!;
    const db=new h.WebIndexedDbTrainingDatabase();
    const t="2026-10-22T08:00:00.000Z";
    const snapshot={
      id:"idb-session-1",date:"2026-10-22",name:"Synthetic",
      status:"in_progress",createdAt:t,
      exercises:[{id:"x",name:"Synthetic exercise",sets:[]}],
      setDrafts:{x:{id:"draft-x",weight:"80",reps:"9",type:"working",
        parentId:"",updatedAt:t}},
    };
    await h.saveTrainingOffline(db,{ownerId:accountA,commandId:commandA,session:snapshot,now:t});
    const stored = await db.transact(async(tx)=>({
      snapshot:await tx.getSnapshot(accountA,snapshot.id),
      commands:await tx.listCommands(accountA),
    }));
    return stored;
  },{accountA,commandA});
  const record=result.snapshot as { payload:{id:string;setDrafts?:unknown}; serverRevision:number };
  expect(record.payload.id).toBe("idb-session-1");
  expect(record.payload.setDrafts).toBeTruthy();
  expect(result.commands).toHaveLength(1);
  expect((result.commands[0] as {session:{setDrafts?:unknown}}).session.setDrafts).toBeUndefined();
  await page.reload();
  await page.addScriptTag({content:script, type:"module"});
  await page.waitForFunction(()=>Boolean(window.__jfsOfflineHarness));
  const restored=await page.evaluate(async({accountA,commandA})=>{
    const h=window.__jfsOfflineHarness!;
    const db=new h.WebIndexedDbTrainingDatabase();
    const prior=await db.transact(async tx=>({
      snap:await tx.getSnapshot(accountA,"idb-session-1"),
      command: (await tx.listCommands(accountA))[0],
    }));
    const done=await h.acknowledgeTrainingCommand(db,accountA,commandA,{
      command_id:commandA,session_id:"idb-session-1",revision:1,outcome:"applied",
    });
    const after=await db.transact(async tx=>({
      snap:await tx.getSnapshot(accountA,"idb-session-1"),
      commands:await tx.listCommands(accountA),
    }));
    return {prior,after,done};
  },{accountA,commandA});
  expect(restored.prior.command).toBeTruthy();
  expect(restored.done).toBe(true);
  expect((restored.after.snap as {serverRevision:number}).serverRevision).toBe(1);
  expect(restored.after.commands).toEqual([]);
});

test("real IndexedDB rollback, cross-account ownership and conflict preservation",async({page})=>{
  const data=await page.evaluate(async({accountA,accountB,commandB})=>{
    const h=window.__jfsOfflineHarness!;
    const db=new h.WebIndexedDbTrainingDatabase();
    const t="2026-10-22T08:00:00.000Z";
    const session={
      id:"idb-session-other",date:"2026-10-22",name:"Device B",
      status:"in_progress",createdAt:t,exercises:[],
    };
    await h.saveTrainingOffline(db,{ownerId:accountB,commandId:commandB,session,now:t});
    let rollback=false;
    try {
      await db.transact(async tx=>{
        await tx.putSnapshot({ownerId:accountA,sessionId:"must-not-exist",
          serverRevision:0,localSequence:1,payload:session,updatedAt:t});
        throw Error("simulate failure");
      });
    } catch { rollback=true; }
    await h.markTrainingCommandFailed(db,accountB,commandB,Date.parse(t),
      "conflict","Synthetic stale version");
    const a=await db.transact(async tx=>({
      missing:await tx.getSnapshot(accountA,"must-not-exist"),
      commands:await tx.listCommands(accountA),
    }));
    const b=await db.transact(async tx=>({
      snapshot:await tx.getSnapshot(accountB,session.id),
      commands:await tx.listCommands(accountB),
    }));
    const ready=await h.readyTrainingCommands(db,accountB,Date.parse(t)+60000);
    return {rollback,a,b,ready};
  },{accountA,accountB,commandB});
  expect(data.rollback).toBe(true);
  expect(data.a.missing).toBeUndefined();
  expect(data.a.commands).toHaveLength(0);
  expect(data.b.commands).toHaveLength(1);
  expect((data.b.commands[0] as {status:string}).status).toBe("conflict");
  expect(data.ready).toHaveLength(0);
});
