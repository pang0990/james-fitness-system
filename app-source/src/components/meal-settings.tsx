"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { dateInZone, visibleMeals } from "@/lib/domain";
import { PageTitle, Sheet, Field, uid, stamp } from "./daily";

export function MealSettings({ notify }: { notify:(s?:string)=>void }) {
  const {state,save}=useStore();
  const [editing,setEditing]=useState<string|null>(null);
  const [text,setText]=useState("");
  const [adding,setAdding]=useState(false);
  const [error,setError]=useState("");
  const today=dateInZone(state.profile?.timezone);
  const slots=state.mealSlots;
  const openEdit=(name:string)=>{setEditing(name);setText(name);setError("");};
  const unique=(value:string,except?:string)=>!slots.some(s=>s!==except && s.toLocaleLowerCase()===value.toLocaleLowerCase());
  function changeName(from:string,to:string){
    const next=to.trim();
    if(!next||next.length>30||!unique(next,from)){setError("餐次名稱必須為 1–30 字且不能重複。");return;}
    if(next===from){setEditing(null);return;}
    if(save("更改單一餐次名稱",s=>{
      s.mealSlots=s.mealSlots.map(name=>name===from?next:name);
      // Keep all previous day meal records intact; only current/future food logs
      // get successor snapshots with the new meal-slot name.
      const current=visibleMeals(s).filter(m=>m.slot===from && m.date>=today);
      for(const m of current) s.meals.push({...m,id:uid(),slot:next,supersedes:m.id,createdAt:stamp()});
      for(const date of Object.keys(s.mealSlotSnapshots??{}))
        if(date>=today) s.mealSlotSnapshots![date]=s.mealSlotSnapshots![date].map(n=>n===from?next:n);
      for(const item of s.skippedMealSlots??[])
        if(item.date>=today && item.slot===from)item.slot=next;
    })){setEditing(null);notify("已更名，歷史紀錄保留");}
  }
  function addSlot(){
    const next=text.trim();
    if(!next||next.length>30||!unique(next)){setError("請輸入新的、不重複的餐次名稱（最多 30 字）。");return;}
    if(save("新增餐次",s=>{
      s.mealSlots=[...s.mealSlots,next];
      for(const date of Object.keys(s.mealSlotSnapshots??{}))
        if(date>=today && !s.mealSlotSnapshots![date].includes(next))
          s.mealSlotSnapshots![date].push(next);
    })){setAdding(false);setText("");notify("餐次已新增");}
  }
  function move(index:number,amount:number){
    const target=index+amount;if(target<0||target>=slots.length)return;
    save("調整餐次順序",s=>{
      const next=[...s.mealSlots];[next[index],next[target]]=[next[target],next[index]];
      s.mealSlots=next;
      for(const date of Object.keys(s.mealSlotSnapshots??{})){
        if(date<today)continue;
        const template=s.mealSlotSnapshots![date];
        s.mealSlotSnapshots![date]=next.filter(n=>template.includes(n));
      }
    });
  }
  function remove(name:string){
    if(slots.length<=1){notify("請至少保留一個餐次");return;}
    if(!window.confirm(`刪除「${name}」這個餐次模板？\n已記錄的食物與過去日期都會保留。`))return;
    if(save("刪除餐次模板",s=>{
      s.mealSlots=s.mealSlots.filter(n=>n!==name);
      for(const date of Object.keys(s.mealSlotSnapshots??{}))
        if(date>=today)s.mealSlotSnapshots![date]=s.mealSlotSnapshots![date].filter(n=>n!==name);
      s.skippedMealSlots=(s.skippedMealSlots??[]).filter(r=>r.slot!==name||r.date<today);
    }))notify("餐次模板已刪除，既有飲食紀錄仍保留");
  }
  return <div className="daily-page meal-settings-page">
    <PageTitle title="每日餐次" />

    <div className="meal-slot-list">
      {slots.map((slot,index)=><section className="card meal-slot-item" key={slot}>
        <div className="meal-slot-info">
          <small>MEAL {String(index+1).padStart(2,"0")}</small>
          <button type="button" className="meal-name-edit" aria-label={`修改${slot}名稱`} title="點擊更名" onClick={()=>openEdit(slot)}>{slot}</button>
        </div>
        <div className="meal-slot-actions">
          <button type="button" aria-label={slot+"上移"} className="icon-button" disabled={index===0} onClick={()=>move(index,-1)}>↑</button>
          <button type="button" aria-label={slot+"下移"} className="icon-button" disabled={index===slots.length-1} onClick={()=>move(index,1)}>↓</button>
          <button type="button" aria-label={"刪除"+slot} className="icon-button" disabled={slots.length<=1} onClick={()=>remove(slot)}>✕</button>
        </div>
      </section>)}
    </div>
    <button type="button" className="button" onClick={()=>{setAdding(true);setText("");setError("");}}>＋ 新增餐次</button>
    {(editing!==null||adding)&&<Sheet title={adding?"新增餐次":`重新命名「${editing}」`} onClose={()=>{setEditing(null);setAdding(false);}}>
      <form onSubmit={e=>{e.preventDefault();adding?addSlot():changeName(editing!,text);}}>
        <Field label="餐次名稱"><input autoFocus maxLength={30} value={text} onChange={e=>{setText(e.target.value);setError("");}} required placeholder="例如 運動後餐"/></Field>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button className="button secondary" type="button" onClick={()=>{setEditing(null);setAdding(false);}}>取消</button>
          <button className="button" type="submit">{adding?"新增餐次":"儲存名稱"}</button>
        </div>
      </form>
    </Sheet>}
  </div>;
}
