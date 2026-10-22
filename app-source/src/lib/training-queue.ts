import type { AppState, Cycle, Session } from "./domain";
import {
  cycleDayId, cyclePendingIds, cycleNextDayIndex, cycleConsumeDay,
  finishTrainingSession,
} from "./training-core/cycle-transitions";

/**
 * Legacy Web adapter. All mutations are executed against the existing account
 * store. The shared core does not rely on crypto, React or browser globals.
 */
export const dayId = cycleDayId;
export function pendingIds(state: AppState, plan: Cycle): string[] {
  return cyclePendingIds(state, plan);
}
export function nextDayIndex(state: AppState, plan: Cycle) {
  return cycleNextDayIndex(state, plan);
}
export function consumeDay(state: AppState, plan: Cycle, id: string) {
  return cycleConsumeDay(state, plan, id);
}
export function completeSession(
  state: AppState,
  session: Session,
  now: string,
  options: { countTowardCycle?: boolean; eventId?: () => string } = {},
) {
  return finishTrainingSession(state, session, now, {
    countTowardCycle: options.countTowardCycle,
    eventId: options.eventId ?? (() => crypto.randomUUID()),
  });
}
