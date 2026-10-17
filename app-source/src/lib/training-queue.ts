import { type AppState, type Cycle, type Session } from "./domain";
import { activeCycle, cycleProgressEvents } from "./training-model";
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
  options: { countTowardCycle?: boolean } = {},
) {
  if (session.status !== "in_progress") throw Error("這次訓練已結束");
  if(session.restStartedAt){
    (session.restHistory??=[]).push({
      startedAt:session.restStartedAt,endedAt:now,
      elapsedSeconds:Math.max(0,Math.round((Date.parse(now)-Date.parse(session.restStartedAt))/1000)),
      targetSeconds:session.restTargetSeconds??120,
    });
    delete session.restStartedAt;
    delete session.restTargetSeconds;
  }
  if(session.rpRestStartedAt){
    (session.rpRestHistory??=[]).push({
      startedAt:session.rpRestStartedAt,endedAt:now,
      elapsedSeconds:Math.max(0,Math.round((Date.parse(now)-Date.parse(session.rpRestStartedAt))/1000)),
      targetSeconds:session.rpRestTargetSeconds??20,
    });
    delete session.rpRestStartedAt;
    delete session.rpRestTargetSeconds;
  }
  if(session.cycleId)session.cycleCounted=!session.isExtra && options.countTowardCycle !== false;
  session.status = "completed";
  session.completedAt = now;
  const elapsed = Math.max(0, Date.parse(now) - Date.parse(session.createdAt));
  session.pausedDuration =
    (session.pausedDuration ?? 0) +
    (session.pausedAt ? Date.parse(now) - Date.parse(session.pausedAt) : 0);
  session.elapsedDuration = elapsed;
  session.activeDuration = Math.max(0, elapsed - session.pausedDuration);
  delete session.pausedAt;
  const original = state.cycles?.find((p) => p.id === session.cycleId);
  const active = activeCycle(state);
  const id =
    session.trainingDayId ??
    (original ? dayId(original, session.cycleDayIndex ?? 0) : undefined);
  if (id && active && !session.isExtra && options.countTowardCycle !== false) consumeDay(state, active, id);
  if (session.cycleId && !session.isExtra && options.countTowardCycle !== false)
    (state.cycleEvents ??= []).push({
      id: crypto.randomUUID(),
      cycleId: session.cycleId,
      type: "completed",
      date: session.workoutDate ?? session.date,
      sessionId: session.id,
      trainingDayId: id,
    });
}
