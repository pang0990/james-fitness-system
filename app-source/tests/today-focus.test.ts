import test from "node:test";
import assert from "node:assert/strict";
import { todayFocus } from "../src/lib/today-focus";
import { trainingFixture } from "./fixtures/training-v3";

test("a queued cycle day alone never schedules a workout", () => {
  const state = trainingFixture();
  state.sessions = [];
  const date = "2026-10-21";
  assert.equal(todayFocus(state,date).href, "/training/plan");
  state.weeklySchedule = [];
  assert.equal(todayFocus(state,date).href, "/nutrition");
  state.weeklySchedule = [3];
  assert.equal(todayFocus(state,date).status, "已排定");
});

test("resume precedes completion and a second session is offered once", () => {
  const state = trainingFixture();
  const first = state.sessions[1];
  const date = first.date;
  first.pausedAt = first.createdAt;
  assert.equal(todayFocus(state,date).status, "已暫停");
  first.status = "completed";
  const day = state.cycles![0].days[0];
  day.secondSession = {name:"晚間",exercises:[{name:"划船",muscle:"Back",sets:2,reps:"8",restSeconds:90,allowDropSet:false,allowRestPause:false}]};
  assert.equal(todayFocus(state,date).status, "第二場");
  state.sessions.push({...first,id:"evening",parentSessionId:first.id,isExtra:true});
  assert.equal(todayFocus(state,date).status, "已完成");
});
