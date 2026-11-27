import type { AppState, CycleDay, CycleExercise } from "./domain";
import { activeCycle, scheduleEntry } from "./training-model";
import { dayId, pendingIds } from "./training-queue";

export function exerciseDescription(e: CycleExercise) {
  return [
    e.name,
    e.sets + " 組 × " + e.reps,
    "RIR " + (e.targetRir ?? "—"),
    e.restSeconds + " 秒",
    e.allowRestPause ? "RP 開" : "RP 關",
    e.allowDropSet ? "Drop 開" : "Drop 關",
  ].join(" · ");
}

export function versionReview(state: AppState, days: CycleDay[], date: string) {
  const old = activeCycle(state);
  const oldDays =
    old?.days.map((day, i) => ({ ...day, id: dayId(old, i) })) ?? [];
  const before = old ? pendingIds(state, old) : [];
  const ids = days.map((day) => day.id!);
  const pending = ids.filter(
    (id) => before.includes(id) || !oldDays.some((day) => day.id === id),
  );
  const nextRound = (old?.round ?? 1) + (old && !pending.length ? 1 : 0);
  const dates = [
    ...new Set(state.schedule?.map((entry) => entry.date) ?? []),
  ].filter((d) => d >= date);
  const affected = dates
    .filter((d) => {
      const entry = scheduleEntry(state, d);
      return (
        entry.kind === "train" &&
        !!entry.trainingDayId &&
        !ids.includes(entry.trainingDayId)
      );
    })
    .sort();
  return {
    oldDays,
    before,
    pending: pending.length ? pending : ids,
    nextRound,
    affected,
  };
}

export function reordered<T>(rows: T[], from: number, to: number) {
  if (
    from < 0 ||
    to < 0 ||
    from >= rows.length ||
    to >= rows.length ||
    from === to
  )
    return rows;
  const copy = rows.slice();
  copy.splice(to, 0, copy.splice(from, 1)[0]);
  return copy;
}
