"use client";
import { useEffect, useRef, useState } from "react";
import type { Session, SetDraft } from "@/lib/domain";
import { useStore } from "@/lib/store";
import { appendWorkoutSet } from "@/lib/workout-sets";
import { startRestInterval, endRestInterval } from "@/lib/rest-intervals";
import { Field } from "./daily";

const emptyDraft = (): SetDraft => ({
  id: crypto.randomUUID(),
  weight: "",
  reps: "",
  rir: "",
  type: "working",
  parentId: "",
  updatedAt: new Date().toISOString(),
});
export function WorkoutSetEntry({
  session,
  exercise,
  onSaved,
}: {
  session: Session;
  exercise: Session["exercises"][number];
  onSaved: (id: string) => void;
}) {
  const { state, save, error } = useStore();
  const [draft, setDraft] = useState<SetDraft>(
    () => session.setDrafts?.[exercise.id] ?? emptyDraft(),
  );
  const [draftFailed, setDraftFailed] = useState(false);
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!draftFailed) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!formRef.current?.contains(target) && target.closest("a,button")) {
        event.preventDefault();
        event.stopPropagation();
        formRef.current?.scrollIntoView({ block: "center" });
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [draftFailed]);
  const hasDraft = !!(
    draft.weight ||
    draft.reps ||
    draft.parentId ||
    draft.rir ||
    draft.type !== "working"
  );
  function persist(next: SetDraft) {
    const ok = save("保存組次草稿", (s) => {
      const target = s.sessions.find((x) => x.id === session.id);
      if (!target || target.status !== "in_progress") throw Error("訓練已結束");
      if (target.setSubmissionIds?.includes(next.id))
        throw Error("此草稿已在其他分頁提交，請重新載入");
      (target.setDrafts ??= {})[exercise.id] = next;
    });
    setDraftFailed(!ok);
    return ok;
  }
  function change(patch: Partial<SetDraft>) {
    const next = { ...draft, ...patch, updatedAt: new Date().toISOString() };
    setDraft(next);
    persist(next);
  }
  return (
    <form
      ref={formRef}
      className="workout-set-entry"
      onSubmit={(event) => {
        event.preventDefault();
        if (lock.current || session.pausedAt) return;
        lock.current = true;
        try {
          if (!draft.weight.trim() || !draft.reps.trim()) return;
          if (draft.rir?.trim() && (!Number.isInteger(Number(draft.rir)) || Number(draft.rir)<0 || Number(draft.rir)>10))return;
          const ok = save("保存訓練段落", (s) => {
            const target = s.sessions.find((x) => x.id === session.id)!;
            const liveExercise = target.exercises.find(
              (e) => e.id === exercise.id,
            );
            if (
              (draft.type === "rp" &&
                (!liveExercise?.allowRestPause ||
                  s.preferences?.allowRestPause === false)) ||
              (draft.type === "drop" &&
                (!liveExercise?.allowDropSet ||
                  s.preferences?.allowDropSet === false))
            )
              throw Error("此動作的延伸組已停用，請改選組型或重新啟用");
            const added = appendWorkoutSet(target, exercise.id, {
              id: draft.id,
              weight: Number(draft.weight),
              reps: Number(draft.reps),
              type: draft.type,
              rir: draft.rir?.trim() ? Number(draft.rir) : null,
              createdAt: new Date().toISOString(),
              ...(["rp", "drop"].includes(draft.type)
                ? { parentId: draft.parentId }
                : {}),
            });
            if (
              added &&
              draft.type === "working" &&
              s.preferences?.autoRest !== false
            ) {
              const now = new Date().toISOString();
              endRestInterval(target, "standard", now);
              startRestInterval(
                target,
                "standard",
                now,
                exercise.restSeconds ??
                  Number(s.preferences?.restSeconds ?? 120),
              );
            }
          });
          if (ok) {
            onSaved(draft.id);
            setDraft(emptyDraft());
            setDraftFailed(false);
          } else setDraftFailed(true);
        } finally {
          lock.current = false;
        }
      }}
    >
      {(draftFailed || !hasDraft) && (
        <div className="workout-draft-status" role={draftFailed ? "alert" : "status"}>
          {draftFailed
            ? "保存失敗 · 輸入仍保留，請先重試再切換畫面"
            : "下一組 · 請輸入重量與次數"}
          {draftFailed && (
            <button type="button" onClick={() => persist(draft)}>
              重試保存草稿
            </button>
          )}
        </div>
      )}
      {draftFailed && (
        <>
          <p role="alert">{error}</p>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (
                window.confirm(
                  "放棄尚未保存的輸入並回到最後已保存草稿？已記錄組次不會刪除。",
                )
              ) {
                setDraft(session.setDrafts?.[exercise.id] ?? emptyDraft());
                setDraftFailed(false);
              }
            }}
          >
            放棄未保存輸入
          </button>
        </>
      )}
      <Field label="組型">
        <select
          value={draft.type}
          disabled={!!session.pausedAt}
          onChange={(e) =>
            change({ type: e.target.value as SetDraft["type"], parentId: "" })
          }
        >
          <option value="working">Working Set</option>
          <option value="warmup">Warm-up</option>
          <option value="rampup">Ramp-up</option>
          {exercise.allowRestPause &&
            state.preferences?.allowRestPause !== false && (
              <option value="rp">Rest-Pause</option>
            )}
          {exercise.allowDropSet &&
            state.preferences?.allowDropSet !== false && (
              <option value="drop">Drop Set</option>
            )}
        </select>
      </Field>
      <div className="set-inputs">
        <Field label="重量 kg">
          <input
            name="weight"
            type="number"
            inputMode="decimal"
            min="0"
            max="1000"
            step="0.1"
            required
            value={draft.weight}
            disabled={!!session.pausedAt}
            onChange={(e) => change({ weight: e.target.value })}
          />
        </Field>
        <Field label="次數">
          <input
            name="reps"
            type="number"
            inputMode="numeric"
            min="1"
            max="500"
            step="1"
            required
            value={draft.reps}
            disabled={!!session.pausedAt}
            onChange={(e) => change({ reps: e.target.value })}
          />
        </Field>
      </div>
      {state.preferences?.showRir !== false && (
        <Field label="RIR · 還可再做幾次（選填）">
          <input name="rir" type="number" min={0} max={10} step={1}
            value={draft.rir??""} inputMode="numeric" disabled={!!session.pausedAt}
            onChange={e=>change({rir:e.target.value})}/>
        </Field>
      )}
      {["rp", "drop"].includes(draft.type) && (
        <Field label="所屬工作組">
          <select
            required
            value={draft.parentId}
            disabled={!!session.pausedAt}
            onChange={(e) => change({ parentId: e.target.value })}
          >
            <option value="">請選擇</option>
            {exercise.sets
              .filter((s) => s.type === "working")
              .map((s, i) => (
                <option key={s.id} value={s.id}>
                  工作組 {i + 1} · {s.weight} × {s.reps}
                </option>
              ))}
          </select>
        </Field>
      )}
      <button
        type="submit"
        className="button workout-submit"
        disabled={!!session.pausedAt}
      >
        完成這一組
      </button>
      {hasDraft && (
        <button
          className="text-link"
          type="button"
          onClick={() => {
            if (
              save("清除組次草稿", (s) => {
                const target = s.sessions.find((x) => x.id === session.id)!;
                if (target.setDrafts) delete target.setDrafts[exercise.id];
              })
            ) {
              setDraft(emptyDraft());
              setDraftFailed(false);
            }
          }}
        >
          清除此動作草稿
        </button>
      )}
    </form>
  );
}
