/**
 * Training-first shared, platform-neutral module entry point (Batch 1).
 * No Next.js, React, browser storage, global IDs, navigation or network calls.
 * Existing Web imports remain supported by compatibility re-exports.
 */
export type { Segment, SetDraft, Session } from "./types";
export {
  setTypeSchema,
  segmentSchema,
  setDraftSchema,
  validateTrainingSessions,
  validateCycleIntegrity,
} from "./validation";
export {
  appendWorkoutSet,
  correctCompletedSet,
  previousWorkingSets,
  removeWorkoutSet,
  replaceWorkoutSet,
  restoreWorkoutSets,
} from "./workout-sets";
export type { RestKind } from "./rest-intervals";
export { startRestInterval, endRestInterval } from "./rest-intervals";
