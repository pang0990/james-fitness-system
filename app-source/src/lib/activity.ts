import { addDays, round, type AppState } from "./domain";

export type StepRecord = NonNullable<AppState["dailySteps"]>[number];
export type ActivityPoint = { date: string; steps: number };

export function stepsInRange(state: AppState, end: string, length: number): ActivityPoint[] {
  const start = addDays(end, 1 - length);
  return (state.dailySteps ?? [])
    .filter(row => row.date >= start && row.date <= end)
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(row => ({date:row.date,steps:row.steps}));
}

export function averageSteps(state:AppState,end:string,days=7) {
  const values=stepsInRange(state,end,days);
  return {
    count: values.length, periodDays:days,
    average:values.length ? Math.round(values.reduce((sum,p)=>sum+p.steps,0)/values.length):null,
    total:values.reduce((sum,p)=>sum+p.steps,0)
  };
}

/**
 * Interpretation support only. No expenditure estimate, automatic macro change,
 * dietary prescription or invented "0 steps" on missing days.
 */
export function activityContext(state:AppState,end:string) {
  const recent=averageSteps(state,end,7);
  const previous=averageSteps(state,addDays(end,-7),7);
  const hasComparison=recent.count>=4 && previous.count>=4 && previous.average!==null && previous.average>0;
  const changePercent=hasComparison ? round(((recent.average!-previous.average!)/previous.average!)*100,1):null;
  let message = "尚未有足夠的每日步數資料可比較活動量。";
  let direction:"down"|"up"|"similar"|"unknown"="unknown";
  if(changePercent!==null) {
    if(changePercent<=-25) {direction="down";message="最近一週步數明顯下降。若體重變化與預期不同，可先確認日常活動是否減少，再評估飲食調整。";}
    else if(changePercent>=25) {direction="up";message="最近一週步數明顯增加。活動量可能影響體重趨勢，請與實際飲食和體重紀錄一起判讀。";}
    else {direction="similar";message="最近兩週步數沒有顯著變動；不能僅憑步數推斷熱量需求。";}
  }
  return {recent,previous,changePercent,direction,message};
}
