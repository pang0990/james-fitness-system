import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState, mealCompletion, pinDay, setMealSkipped,
  syncMealCompletion, type AppState,
} from "../src/lib/domain";
import { asProfile, blankSafety, startingTarget, type OnboardingData } from "../src/lib/onboarding";

const BASE: OnboardingData = {
  name:"James", age:30, height:175, weight:70, sex:"male",
  frequency:2, resistanceDays:4, experiencedCut:true,
  goal:"CUT", safety:blankSafety(),
};
const plan=(input:Partial<OnboardingData>={})=>startingTarget({...BASE,...input});

test("Numbers 3.0 exact CUT coefficients and three day types are preserved",()=>{
  const r=plan();
  assert.equal(r.status,"cut"); assert.ok(r.targets);
  assert.deepEqual(r.targets!.training, {p:119,c:210,f:70,kcal:1946});
  assert.deepEqual(r.targets!.light, {p:119,c:147,f:70,kcal:1694});
  assert.deepEqual(r.targets!.rest, {p:119,c:105,f:70,kcal:1526});
});
test("GAIN provisional uses unique 42 kcal/kg rule, never CUT multipliers",()=>{
  const r=plan({goal:"GAIN",bodyFat:18});
  assert.equal(r.status,"gain-temporary"); assert.ok(r.targets);
  assert.deepEqual(r.targets!.training,{p:126,c:451.5,f:70,kcal:2940});
  assert.deepEqual(r.targets!.training,r.targets!.rest);
});
test("Under18, unsafe health states and unmatched activity do not create CUT prescriptions",()=>{
  assert.equal(plan({age:17}).status,"tracking");
  assert.equal(plan({frequency:-1}).status,"tracking");
  assert.equal(plan({safety:{...blankSafety(),eatingDisorderHistory:true}}).status,"tracking");
  assert.equal(asProfile({...BASE,age:16}).eligible,false);
});
test("GAIN temporary requires >=3 resistance days and BMI / bodyfat gates",()=>{
  assert.equal(plan({goal:"GAIN",resistanceDays:2}).status,"tracking");
  assert.equal(plan({goal:"GAIN",bodyFat:25}).status,"tracking");
  assert.equal(plan({goal:"GAIN",height:150,weight:70,bodyFat:undefined}).status,"tracking");
});
test("Meal completion follows meal snapshots and recorded/skipped status, not a manual complete checkbox",()=>{
  const s=initialState();
  const date="2026-10-13";
  pinDay(s,date);
  assert.equal(mealCompletion(s,date).completed,false);
  s.meals.push({id:"meal1",date,slot:"早餐",name:"雞蛋",quantity:1,unit:"份",p:6,c:0,f:5,kcal:72,createdAt:"test"});
  syncMealCompletion(s,date);
  assert.equal(mealCompletion(s,date).slots[0].status,"logged");
  assert.equal(mealCompletion(s,date).completed,false);
  for(const slot of ["午餐","晚餐","點心"])setMealSkipped(s,date,slot,true);
  assert.equal(mealCompletion(s,date).completed,true);
  assert.equal(s.days.find(d=>d.date===date)?.complete,true);
  s.mealSlots=["早餐","午餐","晚餐","點心","宵夜"];
  assert.equal(mealCompletion(s,date).slots.length,4,"old template must not be retroactively changed");
  setMealSkipped(s,date,"晚餐",false);
  assert.equal(mealCompletion(s,date).completed,false);
});
