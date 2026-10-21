/**
 * Pure cross-platform Training data contracts extracted verbatim from domain.ts.
 * Platform storage, network access and identity remain adapter responsibilities.
 * Do not change these contract fields without migration and parity tests.
 */
export type Segment = {
  id: string;
  weight: number;
  reps: number;
  rir: number | null;
  type: "working" | "warmup" | "rampup" | "rp" | "drop";
  parentId?: string;
  createdAt: string;
};
export type SetDraft = {
  id:string; weight:string; reps:string; type:Segment["type"]; parentId:string; updatedAt:string;
};
export type Session = {
  setDrafts?: Record<string, SetDraft>;
  /** Retains consumed operation IDs even if a recorded set is later removed. */
  setSubmissionIds?: string[];
  cycleId?: string;
  cycleDayIndex?: number;
  phase?: "warmup" | "workout";
  id: string;
  date: string;
  name: string;
  status: "in_progress" | "completed" | "discarded";
  isExtra?: boolean;
  sessionPart?: "main" | "second" | "extra";
  parentSessionId?: string;
  workoutDate?: string;
  scheduledDate?: string;
  pausedAt?: string;
  pausedDuration?: number;
  activeDuration?: number;
  elapsedDuration?: number;
  /** Timestamp-based per-session rest timing. Old session records may omit these. */
  restStartedAt?: string;
  restTargetSeconds?: number;
  restHistory?: { startedAt:string; endedAt:string; elapsedSeconds:number; targetSeconds:number }[];
  /** RP pause is independent from normal between-set rest. */
  rpRestStartedAt?: string;
  rpRestTargetSeconds?: number;
  rpRestHistory?: { startedAt:string; endedAt:string; elapsedSeconds:number; targetSeconds:number }[];
  /** Explicit answer when a planned session is completed before target sets. */
  cycleCounted?: boolean;
  /** Detailed correction history; does not rewrite the original audit log. */
  setCorrections?: {
    id:string; editedAt:string; exerciseId:string; setId:string;
    before:{weight:number;reps:number;type:Segment["type"]};
    after:{weight:number;reps:number;type:Segment["type"]};
  }[];
  discardedAt?: string;
  trainingDayId?: string;
  round?: number;
  exercises: {
    id: string;
    name: string;
    /** Stable ID when exercise originates in JFS or personal library. */
    exerciseLibraryId?: string;
    sets: Segment[];
    restSeconds?: number;
    plannedSets?: number;
    reps?: string;
    rir?: number;
    muscle?: string;
    allowRestPause?: boolean;
    allowDropSet?: boolean;
  }[];
  warmupIds?: string[];
  createdAt: string;
  completedAt?: string;
  feedback?: string;
};
