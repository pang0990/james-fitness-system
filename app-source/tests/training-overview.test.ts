import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/lib/domain';
import {trainingWeek,workoutProgress} from '../src/lib/training-overview';
import {trainingFixture,segment} from './fixtures/training-v3';
test('absence of schedule or history is unknown, never invented missed workouts',()=>{
 const state=initialState();assert.ok(trainingWeek(state,'2026-10-27').every(d=>d.status==='未排定'));
 state.weeklySchedule=[1,3,5];const week=trainingWeek(state,'2026-10-27');assert.equal(week[0].status,'待確認');assert.equal(week[1].status,'休息日');assert.equal(week[2].status,'已排定');assert.equal(week[1].today,true);
});
test('session actual date and pause status take precedence over schedule',()=>{
 const state=trainingFixture();const session=state.sessions.find(s=>s.status==='in_progress')!;session.workoutDate='2026-10-27';session.pausedAt=new Date().toISOString();state.weeklySchedule=[];
 assert.equal(trainingWeek(state,'2026-10-27')[1].status,'已暫停');session.status='completed';assert.equal(trainingWeek(state,'2026-10-27')[1].status,'已完成');
});
test('progress counts working sets only, requires target for exercise completion',()=>{
 const s=trainingFixture().sessions.find(s=>s.status==='in_progress')!;s.exercises[0].plannedSets=1;s.exercises[0].sets=[segment(),{...segment('warm'),type:'warmup'},{...segment('rp'),type:'rp',parentId:'set-1'}];
 assert.equal(workoutProgress(s).working,1);assert.equal(workoutProgress(s).completedExercises,1);
});
