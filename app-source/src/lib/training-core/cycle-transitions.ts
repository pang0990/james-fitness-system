import type { Session } from "./types";
import { endRestInterval } from "./rest-intervals";

/**
 * Portable Cycle queue and session transitions. No browser, crypto, UUID,
 * React, network, storage or Next.js dependencies are permitted.
 * The host must inject a unique event ID only when a counted completion occurs.
 */
export type CoreCycleDay = { id?: string };
export type CoreCycle = {
  id: string;
  days: CoreCycleDay[];
  pending?: string[];
  round?: number;
};
export type CoreCycleEvent = {
  id: string;
  cycleId: string;
  type: "completed" | "skipped" | "skipped_for_round";
  date: string;
  sessionId?: string;
  trainingDayId?: string;
};
export type CoreCycleState = {
  cycles?: CoreCycle[];
  cycleEvents?: CoreCycleEvent[];
  sessions: Session[];
};

export const cycleDayId = (plan: CoreCycle, index: number) =>
  plan.days[index]?.id ?? `${plan.id}:day:${index}`;

export function countedCycleEvents(state: CoreCycleState, cycleId: string) {
  return (state.cycleEvents ?? []).filter((event) => {
    if (event.cycleId !== cycleId) return false;
    const session = event.sessionId
      ? state.sessions.find((s) => s.id === event.sessionId)
      : undefined;
    return !session?.isExtra && session?.cycleCounted !== false;
  });
}
export function cyclePendingIds(state: CoreCycleState, plan: CoreCycle): string[] {
  if (plan.pending) return plan.pending;
  if (!plan.days.length) return [];
  const count = countedCycleEvents(state, plan.id).length;
  const index = count % plan.days.length;
  return plan.days.slice(index).map((_, i) => cycleDayId(plan, i + index));
}
export function cycleNextDayIndex(state: CoreCycleState, plan: CoreCycle) {
  const id = cyclePendingIds(state, plan)[0];
  return plan.days.findIndex((_, i) => cycleDayId(plan, i) === id);
}
export function cycleConsumeDay(state: CoreCycleState, plan: CoreCycle, id: string) {
  const queue = cyclePendingIds(state, plan);
  if (!queue.includes(id)) return;
  plan.pending = queue.filter((x) => x !== id);
  if (!plan.pending.length) {
    plan.pending = plan.days.map((_, i) => cycleDayId(plan, i));
    plan.round = (plan.round ?? 1) + 1;
  }
}

/** Mutates one Session in a transaction owned by the adapter. */
export function finishTrainingSession(
  state: CoreCycleState,
  session: Session,
  now: string,
  options: { countTowardCycle?: boolean; eventId: () => string },
) {
  if (session.status !== "in_progress") throw Error("這次訓練已結束");
  endRestInterval(session, "standard", now);
  endRestInterval(session, "rp", now);
  const plan = state.cycles?.find((p) => p.id === session.cycleId);
  const id = session.trainingDayId ??
    (plan && session.cycleDayIndex !== undefined
      ? cycleDayId(plan, session.cycleDayIndex) : undefined);
  const eligible = Boolean(
    plan && id && !session.isExtra && options.countTowardCycle !== false &&
    (session.round === undefined || session.round === (plan.round ?? 1)) &&
    cyclePendingIds(state, plan).includes(id) &&
    !(state.cycleEvents ?? []).some((e) =>
      e.type === "completed" && e.sessionId === session.id),
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
  if (eligible && plan && id) {
    cycleConsumeDay(state, plan, id);
    (state.cycleEvents ??= []).push({
      id: options.eventId(),
      cycleId: plan.id,
      type: "completed",
      date: session.workoutDate ?? session.date,
      sessionId: session.id,
      trainingDayId: id,
    });
  }
}
