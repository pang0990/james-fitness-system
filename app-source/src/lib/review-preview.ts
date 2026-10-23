import {
  addDays, cutTargets, dateInZone, initialState, RULE_ID,
  validateState, type AppState, type Profile, type Session,
} from "./domain";

/** This flag is compile-time OFF in all normal and production builds. */
export const REVIEW_PREVIEW = process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW === "1";
export const REVIEW_USER_ID = "00000000-0000-4000-8000-000000000099";
export const REVIEW_STORAGE_KEY = "jfs-isolated-review-v1:" + REVIEW_USER_ID + ":" + (process.env.NEXT_PUBLIC_JFS_REVIEW_ID || "default");

/**
 * Entirely synthetic records. Never fetch, import, clone or link real user data.
 * The preview state is intentionally local-only and versioned separately.
 */
export function makeReviewSeed(date = dateInZone("Asia/Taipei")): AppState {
  const state = initialState();
  const todayAt = date + "T09:00:00.000Z";
  const profile: Profile = {
    name: "測試使用者（虛構）", age: 30, height: 178, weight: 78,
    sex: "male", frequency: 2, experiencedCut: false,
    goal: "CUT", eligible: true, timezone: "Asia/Taipei",
    waterTarget: 2500, resistanceDays: 4,
    safety: {
      pregnantOrBreastfeeding: false, eatingDisorderHistory: false,
      chronicConditionOrMedication: false, otherMedicalConcern: false,
    },
  };
  state.profile = profile;
  state.appearance = { theme: "dark", visualStyle: "minimal", showCompanion: false };
  state.versions = [{
    id: "review-nutrition-plan", number: 1, createdAt: todayAt,
    effectiveDate: addDays(date, -60), previousId: null,
    ruleId: RULE_ID, inputs: { ...profile },
    targets: cutTargets(profile), reason: "虛構預覽用營養目標，非個人處方",
  }];
  state.cycles = [{
    id: "review-cycle", name: "示範四日分化", createdAt: todayAt,
    source: "template", round: 2,
    pending: ["review-upper", "review-lower"],
    days: [
      { id: "review-upper", name: "上肢訓練", exercises: [
        { exerciseLibraryId:"exercise-1", name:"Barbell Bench Press",
          muscle:"Chest", sets:3, reps:"8–12", restSeconds:120,
          allowRestPause:false, allowDropSet:true },
        { exerciseLibraryId:"exercise-6", name:"Barbell Row",
          muscle:"Back", sets:3, reps:"8–12", restSeconds:120,
          allowRestPause:false, allowDropSet:false },
      ]},
      { id: "review-lower", name: "下肢訓練", exercises: [
        { exerciseLibraryId:"exercise-20", name:"Squat",
          muscle:"Quads", sets:3, reps:"8–12", restSeconds:150,
          allowRestPause:false, allowDropSet:false },
      ]},
    ],
  }];
  state.meals = [
    { id:"review-meal-breakfast", date, slot:"早餐", name:"示範燕麥早餐",
      quantity:1, unit:"份", p:24, c:52, f:12, kcal:412, createdAt:todayAt },
    { id:"review-meal-lunch", date, slot:"午餐", name:"示範雞肉飯",
      quantity:1, unit:"份", p:38, c:63, f:16, kcal:548, createdAt:todayAt },
  ];
  state.waters = [{id:"review-water", date, ml:750, createdAt:todayAt}];
  state.measurements = [
    {id:"review-weight-1", date:addDays(date,-28),weight:79,createdAt:todayAt},
    {id:"review-weight-2", date:addDays(date,-14),weight:78.5,createdAt:todayAt},
    {id:"review-weight-3", date,weight:78,createdAt:todayAt},
  ];
  state.dailySteps = Array.from({length:7},(_,i)=>({
    id:"review-steps-"+i,date:addDays(date,i-6),steps:6000+i*310,
    source:"manual" as const,updatedAt:todayAt,
  }));
  state.recoveryEntries = Array.from({length:4},(_,i)=>({
    id:"review-sleep-"+i,date:addDays(date,i-3),type:"sleep" as const,
    value:420+i*10,unit:"minutes" as const,createdAt:todayAt,
  }));
  const completed = (when:string, suffix:string,weight:number): Session => ({
    id:"review-session-"+suffix,date:when,name:"示範上肢訓練",
    status:"completed",isExtra:true,
    createdAt:when+"T08:00:00.000Z",completedAt:when+"T09:00:00.000Z",
    activeDuration:3600000,
    exercises:[{id:"review-bench-"+suffix,exerciseLibraryId:"exercise-1",
      name:"Barbell Bench Press",sets:[{id:"review-set-"+suffix,
      type:"working",weight,reps:8,rir:2,createdAt:when+"T08:30:00.000Z"}]}],
  });
  state.sessions = [
    completed(addDays(date,-14),"old",60),
    completed(addDays(date,-7),"recent",65),
  ];
  return validateState(state);
}
