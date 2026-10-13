"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import catalog from "@/content/exercises.json";
import { PageTitle } from "./daily";

export function WorkoutHistoryDetail() {
  const { state } = useStore();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const sessions = state.sessions.filter(s => s.status !== "in_progress").slice().reverse();
  const session = sessions.find(s => s.id === id);
  return (
    <div className="daily-page">
      <PageTitle title={session ? session.name : "Workout History"} />
      <Link className="text-link" href="/training/history">← 返回歷史紀錄</Link>
      {session ? (
        <>
          <section className="card stack">
            <small>{session.workoutDate ?? session.date}</small>
            <strong>{session.status === "discarded" ? "已放棄" : "已完成"}</strong>
            <p className="muted">依當次 Session 保存的實際紀錄呈現，不使用現在的 Plan 自動補齊組數。</p>
            <p>實際完成組數：{session.exercises.reduce((a, e) => a + e.sets.filter(t => t.type === "working").length, 0)}</p>
            {session.activeDuration !== undefined && <p>Active Training：{Math.round(session.activeDuration / 60000)} 分鐘</p>}
            {session.feedback && <p>當次回饋：{session.feedback}</p>}
          </section>
          {session.exercises.map((ex) => (
            <section className="card stack" key={ex.id}>
              <h2>{ex.name}</h2>
              <p className="muted">Target Sets：{ex.plannedSets ?? "未提供"} · Target Reps：{ex.reps ?? "未提供"}</p>
              {ex.sets.length ? ex.sets.map((set, i) => (
                <div className="simple-row" key={set.id}>
                  <span>{i+1}. {set.type}</span>
                  <span>{set.weight} kg × {set.reps}　RIR {set.rir ?? "—"}</span>
                </div>
              )) : <p className="muted">沒有完成的組數。</p>}
              <Link className="text-link" href={`/progress/training/exercises?name=${encodeURIComponent(ex.name)}`}>查看此動作長期紀錄 →</Link>
            </section>
          ))}
        </>
      ) : (
        <section className="card stack">
          <h2>選擇歷史訓練</h2>
          {!sessions.length && <p className="muted">尚未有訓練歷史。</p>}
          {sessions.map(s => (
            <Link className="simple-row" key={s.id} href={`/training/history/session?id=${encodeURIComponent(s.id)}`}>
              {s.workoutDate ?? s.date} · {s.name} <span>→</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export function ExerciseGuideDetail() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const exercise = catalog.find(e => e.id === id);
  return (
    <div className="daily-page">
      <PageTitle title={exercise?.nameZh ?? "Exercise Guide"} />
      <Link className="text-link" href="/training/exercises">← 返回動作資料庫</Link>
      {exercise ? (
        <section className="card stack">
          <small>EXERCISE LIBRARY</small>
          <h2>{exercise.name}</h2>
          <p>主要肌群：{exercise.muscle}</p>
          <p>器材：{exercise.brand}</p>
          <p className="muted">目前這筆動作資料尚未附可查證的教學步驟及影片；不會使用不相符的示範影片。</p>
          {exercise.sourceUrl && <a href={exercise.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link">參考來源 ↗</a>}
          <Link href="/training/plan" className="button secondary">開啟課表，加入／編輯動作</Link>
          <Link href={`/progress/training/exercises?name=${encodeURIComponent(exercise.name)}`} className="text-link">查看訓練紀錄 →</Link>
        </section>
      ) : (
        <section className="card stack">
          <p className="muted">選擇一個動作查看詳情：</p>
          {catalog.map(e => (
            <Link className="simple-row" key={e.id} href={`/training/exercises/detail?id=${encodeURIComponent(e.id)}`}>
              {e.nameZh} <small>{e.name}</small> <span>→</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export function ExerciseProgressDetail() {
  const { state } = useStore();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const match = catalog.find(e => e.id === params.get("id"));
    setName(params.get("name") || match?.name || null);
  }, []);
  const sessions = state.sessions.filter(s => s.status === "completed");
  const exercises = Array.from(new Set(sessions.flatMap(s => s.exercises.map(e => e.name)))).sort();
  const points = sessions.flatMap(s => s.exercises.filter(e => e.name === name).map(e => ({
    id: s.id, date: s.workoutDate ?? s.date, sets: e.sets.filter(t => t.type === "working"),
  }))).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="daily-page">
      <PageTitle title={name ? name + " · Progress" : "Exercise Progress"} />
      <Link className="text-link" href="/progress/training">← 返回訓練分析</Link>
      {!name ? (
        <section className="card stack">
          <h2>選擇要追蹤的動作</h2>
          {exercises.length ? exercises.map(ex => (
            <Link className="simple-row" key={ex} href={`/progress/training/exercises?name=${encodeURIComponent(ex)}`}>{ex} <span>→</span></Link>
          )) : <p className="muted">尚未有可供比較的已完成訓練。</p>}
        </section>
      ) : (
        <>
          <p className="muted">以下為已完成 Session 的原始 Working Sets，不把目標組數當成實際完成，也不根據單筆資料自動判定 Improving。</p>
          {!points.length && <p className="muted">這個動作還沒有歷史訓練紀錄。</p>}
          {points.map(point => (
            <section className="card stack" key={point.id}>
              <h2>{point.date}</h2>
              {point.sets.length ? point.sets.map((set,i) => (
                <div className="simple-row" key={set.id}>
                  <span>Working {i+1}</span><span>{set.weight} kg × {set.reps} · RIR {set.rir ?? "—"}</span>
                </div>
              )) : <p className="muted">無有效 Working Set。</p>}
              <Link href={`/training/history/session?id=${encodeURIComponent(point.id)}`} className="text-link">查看當次完整紀錄 →</Link>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
