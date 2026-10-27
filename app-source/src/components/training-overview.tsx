"use client";
import Link from 'next/link';
import {useStore} from '@/lib/store';
import {trainingWeek} from '@/lib/training-overview';
import {activeCycle} from '@/lib/training-model';
import {dayId,pendingIds} from '@/lib/training-queue';
export function TrainingOverviewDetails({date}:{date:string}){
 const {state}=useStore(),cycle=activeCycle(state),current=state.sessions.find(s=>s.status==='in_progress');
 const ids=cycle?pendingIds(state,cycle):[];
 const nextId=ids.find(id=>!(current?.cycleId===cycle?.id&&current?.trainingDayId===id));
 const next=cycle?.days.find((_,i)=>dayId(cycle,i)===nextId);
 return <>
  <section className="card training-week" aria-label="本週訓練狀態"><div className="card-head"><h2>這週的訓練</h2><Link href="/training/calendar" className="text-link">查看日曆 →</Link></div><div className="training-week-days">{trainingWeek(state,date).map((d,i)=><Link key={d.date} href={`/training/calendar?date=${d.date}`} aria-label={`${d.date} ${d.status}`} aria-current={d.today?'date':undefined}><small>週{'一二三四五六日'[i]}</small><strong>{d.date.slice(8)}</strong><span>{d.status}</span>{d.done>0&&<small>{d.done} 場</small>}</Link>)}</div><p className="muted">待確認表示過去已排定但沒有完成紀錄，不代表你沒有訓練。</p></section>
  {next&&<section className="card stack training-pending" aria-label="待完成訓練"><p className="eyebrow">{current?'NEXT WORKOUT':'PENDING WORKOUT'}</p><h2>{next.name}</h2><p>{[...new Set(next.exercises?.map(e=>e.muscle).filter(Boolean))].join(' · ')||'肌群尚未設定'}</p><p className="muted">依本輪待完成順序，日期請以日曆安排為準。</p><Link href="/training/plan" className="text-link">查看課表 →</Link></section>}
  <nav className="training-quick-links" aria-label="訓練快捷入口">{[['/training/plan','課表編輯'],['/training/calendar','訓練日曆'],['/training/exercises','動作庫'],['/training/history','訓練歷史'],['/progress/training','訓練成效'],['/progress/weekly','恢復與 Deload'],['/settings/training','訓練設定']].map(([href,label])=><Link href={href} key={href}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>
 </>;
}
