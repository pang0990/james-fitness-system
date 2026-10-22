import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "../src/lib/training-core/types";
import {
  createNativeSqliteTrainingDatabase, type NativeSqliteDatabase,
} from "../src/lib/training-offline/native-sqlite-adapter";
import {
  saveTrainingOffline, acknowledgeTrainingCommand,
  readyTrainingCommands, markTrainingCommandFailed,
} from "../src/lib/training-offline/protocol";

const accountA="11111111-1111-4111-8111-111111111111";
const accountB="22222222-2222-4222-8222-222222222222";
const command=(n:number)=>"aaaaaaaa-aaaa-4aaa-8aaa-"+String(n).padStart(12,"0");
const now="2026-10-22T07:00:00.000Z";
const sample=(name:string):Session=>({
  id:"session-one",date:"2026-10-22",name,status:"in_progress",
  createdAt:now,exercises:[{id:"ex-one",name:"Squat",sets:[]}],
});
function wrapSQLite(file:string):{ db:DatabaseSync; open:()=>Promise<NativeSqliteDatabase> } {
  const db=new DatabaseSync(file);
  const query={
    async runAsync(sql:string,args:(string|number|null)[]) {
      return db.prepare(sql).run(...args);
    },
    async getFirstAsync<T>(sql:string,args:(string|number|null)[]) {
      return (db.prepare(sql).get(...args) ?? null) as T|null;
    },
    async getAllAsync<T>(sql:string,args:(string|number|null)[]) {
      return db.prepare(sql).all(...args) as T[];
    },
  };
  return { db, open: async()=>({
    async execAsync(sql){ db.exec(sql); },
    async withExclusiveTransactionAsync(fn) {
      db.exec("BEGIN IMMEDIATE");
      try { await fn(query); db.exec("COMMIT"); }
      catch(error) { db.exec("ROLLBACK"); throw error; }
    },
  }) };
}
test("real SQLite keeps snapshot and command after DB close/reopen and ordered ACK",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"jfs-sqlite-"));
  const file=join(dir,"jfs.sqlite");
  try {
    const first=wrapSQLite(file);
    const one=createNativeSqliteTrainingDatabase(first.open);
    await saveTrainingOffline(one,{ownerId:accountA,commandId:command(1),
      session:sample("Upper"),now});
    await saveTrainingOffline(one,{ownerId:accountA,commandId:command(2),
      session:sample("Upper edited"),now});
    first.db.close();
    const second=wrapSQLite(file);
    try {
      const two=createNativeSqliteTrainingDatabase(second.open);
      const local=await two.transact(tx=>tx.getSnapshot(accountA,"session-one"));
      assert.equal(local?.payload.name,"Upper edited");
      const pending=await readyTrainingCommands(two,accountA,Date.parse(now));
      assert.equal(pending[0].commandId,command(1));
      await acknowledgeTrainingCommand(two,accountA,command(1),{
        command_id:command(1),session_id:"session-one",revision:1,outcome:"applied",
      });
      const next=await readyTrainingCommands(two,accountA,Date.parse(now));
      assert.equal(next[0].commandId,command(2));
      await acknowledgeTrainingCommand(two,accountA,command(2),{
        command_id:command(2),session_id:"session-one",revision:2,outcome:"applied",
      });
      assert.equal((await readyTrainingCommands(two,accountA,Date.parse(now))).length,0);
      const after=await two.transact(tx=>tx.getSnapshot(accountA,"session-one"));
      assert.equal(after?.payload.name,"Upper edited");
      assert.equal(after?.serverRevision,2);
    } finally { second.db.close(); }
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test("real SQLite rolls back entire transaction and isolates accounts",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"jfs-sqlite-"));
  const sqlite=wrapSQLite(join(dir,"store.sqlite"));
  try {
    const db=createNativeSqliteTrainingDatabase(sqlite.open);
    await saveTrainingOffline(db,{ownerId:accountA,commandId:command(3),
      session:sample("Owner A"),now});
    await saveTrainingOffline(db,{ownerId:accountB,commandId:command(3),
      session:sample("Owner B"),now});
    await assert.rejects(db.transact(async tx=>{
      await tx.deleteCommand(accountA,command(3));
      await tx.putSnapshot({
        ownerId:accountA,sessionId:"failing-session",serverRevision:0,
        localSequence:1,payload:sample("Uncommitted"),updatedAt:now,
      });
      throw Error("power cut before commit");
    }),/power cut/);
    const a=await db.transact(async tx=>({
      active:await tx.listCommands(accountA),
      missing:await tx.getSnapshot(accountA,"failing-session"),
    }));
    const b=await db.transact(tx=>tx.listCommands(accountB));
    assert.equal(a.active.length,1);
    assert.equal(a.missing,undefined);
    assert.equal(b.length,1);
    await markTrainingCommandFailed(db,accountB,command(3),Date.parse(now),
      "conflict","different device wrote first");
    const conflict=await db.transact(tx=>tx.listCommands(accountB));
    assert.equal(conflict[0].status,"conflict");
    assert.equal((await readyTrainingCommands(db,accountB,Date.parse(now)+100000)).length,0);
    assert.equal((await readyTrainingCommands(db,accountA,Date.parse(now))).length,1);
  }finally {sqlite.db.close();rmSync(dir,{recursive:true,force:true});}
});
