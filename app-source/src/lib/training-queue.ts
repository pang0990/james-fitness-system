import { type AppState, type Cycle, type Session } from "./domain";
import { cycleProgressEvents } from "./training-model";
import { endRestInterval } from "./rest-intervals";
export const dayId = (plan: Cycle, index: number) =>
  plan.days[index]?.id ?? `${plan.id}:day:${index}`;
export function pendingIds(state: AppState, plan: Cycle): string[] {
  if (plan.pending) return plan.pending;
  const count =
    cycleProgressEvents(state, plan.id).length;
  return plan.days
    .slice(count % plan.days.length)
    .map((_, i) => dayId(plan, i + (count % plan.days.length)));
}
export function nextDayIndex(state: AppState, plan: Cycle) {
  const id = pendingIds(state, plan)[0];
  return plan.days.findIndex((_, i) => dayId(plan, i) === id);
}
export function consumeDay(state: AppState, plan: Cycle, id: string) {
  const queue = pendingIds(state, plan);
  if (!queue.includes(id)) return;
  plan.pending = queue.filter((x) => x !== id);
  if (!plan.pending.length) {
    plan.pending = plan.days.map((_, i) => dayId(plan, i));
    plan.round = (plan.round ?? 1) + 1;
  }
}
export function completeSession(
  state: AppState,
  session: Session,
  now: string,
  options: { countTowardCycle?: boolean; eventId?: () => string } = {},
) {
  if (session.status !== "in_progress") throw Error("這次訓練已結束");
  endRestInterval(session,"standard",now);
  endRestInterval(session,"rp",now);
  const original = state.cycles?.find((p) => p.id === session.cycleId);
  const id = session.trainingDayId ??
    (original && session.cycleDayIndex !== undefined ? dayId(original, session.cycleDayIndex) : undefined);
  // An offline/stale second session may finish successfully, but must not advance
  // a day already consumed by another session or a previous Cycle round.
  const eligible = Boolean(
    original && id && !session.isExtra && options.countTowardCycle !== false &&
    (session.round === undefined || session.round === (original.round ?? 1)) &&
    pendingIds(state, original).includes(id) &&
    !(state.cycleEvents ?? []).some(e => e.type === "completed" && e.sessionId === session.id),
  );
  if (session.cycleId) session.cycleCounted = eligible;
  session.status = "completed";
  session.completedAt = now;
  const elapsed = Math.max(0, Date.parse(now) - Date.parse(session.createdAt));
  session.pausedDuration =
    (session.pausedDuration ?? 0) +
    (session.pausedAt ? Date.parse(now) - Date.parse(session.pausedAt) : 0);
  session.elapsedDuration = elapsed;
  session.activeDuration = Math.max(0, elapsed - session.pausedDuration);
  delete session.pausedAt;
  if (eligible && original && id) {
    consumeDay(state, original, id);
    (state.cycleEvents ??= []).push({
      id: options.eventId?.() ?? crypto.randomUUID(),
      cycleId: original.id,
      type: "completed",
      date: session.workoutDate ?? session.date,
      sessionId: session.id,
      trainingDayId: id,
    });
  }
}
