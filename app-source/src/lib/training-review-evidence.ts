import {type AppState, addDays} from "./domain";
import {recoveryEntries, painLevel, safetyText} from "./recovery";
import {trainingProgressEvidence, TRAINING_PERFORMANCE_RULE_VERSION} from "./training-performance";

export type TrainingSafetyReview = {
  status:"safety-first"|"recovery-check"|"insufficient"|"review-ready";
  title:string; explanation:string;
  recoveryEvidenceCount:number; comparableExercises:number; improvedExercises:number;
  painDescription?:string; version:string;
};
export function trainingSafetyReview(state:AppState,referenceDate:string):TrainingSafetyReview {
  const progress=trainingProgressEvidence(state);
  const recent=recoveryEntries(state).filter(r=>r.date>=addDays(referenceDate,-6)&&r.date<=referenceDate);
  const pain=recent.filter(r=>r.type==="pain")
    .slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0];
  const severity=pain?painLevel(pain.value,pain.flags??[]):0;
  const recovery=recent.filter(r=>["fatigue","sleep","stress"].includes(r.type));
  const base={recoveryEvidenceCount:recovery.length,comparableExercises:progress.length,
    improvedExercises:progress.filter(x=>x.outcome==="improved").length,
    version:TRAINING_PERFORMANCE_RULE_VERSION};
  if(severity>=3)return {...base,status:"safety-first",title:"疼痛安全優先",
    explanation:"近期疼痛紀錄有需優先處理的警訊，先依疼痛安全紀錄評估，不以增加訓練量回應。",
    painDescription:safetyText[severity]};
  if(!progress.length||!recovery.length)return {...base,status:"insufficient",title:"資料不足",
    explanation:"尚無足夠的相同動作比較或近期恢復紀錄，不能認定停滯，也不能建議自動 Deload。"};
  const fatigue=recovery.some(r=>r.type==="fatigue"&&r.value>=4);
  const poorSleep=recovery.some(r=>r.type==="sleep"&&
    (r.unit==="rating"?r.value<=2:r.value<360));
  const stagnant=progress.length>=2&&progress.every(p=>p.outcome==="not-proven");
  if(stagnant&&(fatigue||poorSleep||severity===2))
    return {...base,status:"recovery-check",title:"建議檢查恢復與負荷",
      explanation:"至少兩個可比動作近期未達進步門檻，且存在疲勞、睡眠或疼痛相關紀錄。這只是 Deload Check，不會自動減量或改課表。"};
  return {...base,status:"review-ready",title:"持續觀察",
    explanation:"已有可比訓練與恢復資料；請檢查不同日期的實際組次與訓練感受，再決定是否調整。"};
}
