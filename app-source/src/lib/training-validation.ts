import { z } from "zod";

const id = z.string().min(1);
const time = z
  .string()
  .refine((v) => Number.isFinite(Date.parse(v)), "時間格式無效");
const nonnegative = z.number().finite().nonnegative();
export const setTypeSchema = z.enum([
  "working",
  "warmup",
  "rampup",
  "rp",
  "drop",
]);
export const segmentSchema = z
  .object({
    id,
    weight: nonnegative.max(1000),
    reps: z.number().int().min(1).max(500),
    rir: z.number().min(0).max(10).nullable().optional(),
    type: setTypeSchema,
    parentId: id.optional(),
    createdAt: time,
  })
  .passthrough();
export const setDraftSchema = z
  .object({
    id,
    weight: z.string(),
    reps: z.string(),
    type: setTypeSchema,
    parentId: z.string(),
    updatedAt: time,
  })
  .passthrough();
const rest = z
  .object({
    startedAt: time,
    endedAt: time,
    elapsedSeconds: nonnegative,
    targetSeconds: z.number().int().min(1).max(3600),
  })
  .passthrough();
const correctionValue = z
  .object({
    weight: nonnegative.max(1000),
    reps: z.number().int().min(1).max(500),
    type: setTypeSchema,
  })
  .passthrough();
const sessionSchema = z
  .object({
    id,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    name: id,
    status: z.enum(["in_progress", "completed", "discarded"]),
    createdAt: time,
    completedAt: time.optional(),
    discardedAt: time.optional(),
    pausedAt: time.optional(),
    phase: z.enum(["warmup", "workout"]).optional(),
    cycleId: id.optional(),
    trainingDayId: id.optional(),
    cycleDayIndex: z.number().int().nonnegative().optional(),
    sessionPart: z.enum(["main", "second", "extra"]).optional(),
    parentSessionId: id.optional(),
    round: z.number().int().min(1).optional(),
    warmupIds: z.array(id).optional(),
    isExtra: z.boolean().optional(),
    cycleCounted: z.boolean().optional(),
    pausedDuration: nonnegative.optional(),
    activeDuration: nonnegative.optional(),
    elapsedDuration: nonnegative.optional(),
    restStartedAt: time.optional(),
    rpRestStartedAt: time.optional(),
    restTargetSeconds: z.number().int().min(1).max(3600).optional(),
    rpRestTargetSeconds: z.number().int().min(1).max(3600).optional(),
    restHistory: z.array(rest).optional(),
    rpRestHistory: z.array(rest).optional(),
    setDrafts: z.record(z.string(), setDraftSchema).optional(),
    setSubmissionIds: z.array(id).optional(),
    setCorrections: z
      .array(
        z
          .object({
            id,
            editedAt: time,
            exerciseId: id,
            setId: id,
            before: correctionValue,
            after: correctionValue,
          })
          .passthrough(),
      )
      .optional(),
    exercises: z.array(
      z
        .object({
          id,
          name: id,
          exerciseLibraryId: id.optional(),
          sets: z.array(segmentSchema),
          restSeconds: z.number().int().min(1).max(3600).optional(),
          plannedSets: z.number().int().min(1).max(100).optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw Error(`${label} ID 重複`);
}
/** Validate without coercing, stripping unknown fields or rewriting old records. */
export function validateTrainingSessions(value: unknown) {
  const sessions = z.array(sessionSchema).parse(value);
  unique(
    sessions.map((s) => s.id),
    "Session",
  );
  for (const session of sessions) {
    unique(
      session.exercises.map((e) => e.id),
      "動作",
    );
    unique(
      session.exercises.flatMap((e) => e.sets.map((s) => s.id)),
      "組次",
    );
    unique(session.setSubmissionIds ?? [], "提交");
    for (const [exerciseId, draft] of Object.entries(session.setDrafts ?? {})) {
      if (!session.exercises.some((e) => e.id === exerciseId))
        throw Error("草稿動作不存在");
      if (
        draft.id &&
        session.exercises.some((e) => e.sets.some((s) => s.id === draft.id))
      )
        throw Error("草稿已提交");
    }
    for (const ex of session.exercises)
      for (const set of ex.sets) {
        const child = set.type === "rp" || set.type === "drop";
        if (
          child &&
          (!set.parentId ||
            !ex.sets.some((p) => p.id === set.parentId && p.type === "working"))
        )
          throw Error("延伸組缺少同動作的工作組");
        if (!child && set.parentId) throw Error("一般組不能指定父組次");
      }
    for (const r of [
      ...(session.restHistory ?? []),
      ...(session.rpRestHistory ?? []),
    ])
      if (Date.parse(r.endedAt) < Date.parse(r.startedAt))
        throw Error("休息結束早於開始");
  }
}

export function validateCycleIntegrity(value: unknown, events: unknown) {
  const day = z.object({ id: id.optional(), name: id }).passthrough();
  const cycles = z
    .array(
      z
        .object({
          id,
          name: id,
          days: z.array(day).min(1),
          pending: z.array(id).optional(),
          round: z.number().int().min(1).optional(),
        })
        .passthrough(),
    )
    .parse(value ?? []);
  unique(
    cycles.map((c) => c.id),
    "Cycle",
  );
  for (const c of cycles) {
    const ids = c.days.map((d, i) => d.id ?? `${c.id}:day:${i}`);
    unique(ids, "Cycle Day");
    unique(c.pending ?? [], "待完成日");
    if (c.pending?.some((p) => !ids.includes(p)))
      throw Error("Cycle 待完成日不存在");
  }
  const rows = z
    .array(
      z
        .object({
          id,
          cycleId: id,
          type: z.enum(["completed", "skipped", "skipped_for_round"]),
          date: id,
          sessionId: id.optional(),
          trainingDayId: id.optional(),
        })
        .passthrough(),
    )
    .parse(events ?? []);
  unique(
    rows.map((e) => e.id),
    "Cycle 事件",
  );
  unique(
    rows
      .filter((e) => e.type === "completed" && e.sessionId)
      .map((e) => e.sessionId!),
    "Cycle 完成 Session",
  );
  // Old events can outlive deleted plans/sessions. Keep those historical references.
}
