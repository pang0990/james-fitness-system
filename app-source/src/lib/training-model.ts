import { type AppState, type Cycle, addDays, round } from "./domain";
import media from "@/content/media.json";
export const muscles = [
  "Chest",
  "Back",
  "Shoulders",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Biceps",
  "Triceps",
  "Calves",
  "Core",
];
export const stages = [
  "Intensity",
  "Frequency",
  "Volume",
  "Deload",
  "Next Cycle",
] as const;
export type MuscleTarget = {
  muscle: string;
  target: number;
  frequency: number;
  priority: boolean;
  allocation: number[];
};
export type ScheduleEntry = {
  id: string;
  date: string;
  kind: "train" | "rest" | "temporary_rest";
  createdAt: string;
};
export type WarmupItem = {
  id: string;
  name: string;
  minutes: number;
  video_url: string | null;
};
const warmupVideos = media.warmupVideos as Record<string, string>;
export const warmups: WarmupItem[] = [
  { id: "walk", name: "快走或腳踏車", minutes: 3, video_url: warmupVideos.walk ?? null },
  { id: "shoulder", name: "肩部繞環", minutes: 1, video_url: warmupVideos.shoulder ?? null },
  { id: "hip", name: "髖關節活動", minutes: 1, video_url: warmupVideos.hip ?? null },
  { id: "squat", name: "徒手深蹲", minutes: 1, video_url: warmupVideos.squat ?? null },
  { id: "band", name: "彈力帶拉開", minutes: 1, video_url: warmupVideos.band ?? null },
];
export function scheduleKind(state: AppState, date: string) {
  return state.schedule?.filter((e) => e.date === date).at(-1)?.kind ?? "train";
}
export function performance(state: AppState) {
  const map = new Map<
    string,
    {
      date: string;
      weight: number;
      reps: number;
      rir: number | null;
      cycle?: string;
    }[]
  >();
  state.sessions
    .filter((s) => s.status === "completed")
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((s) =>
      s.exercises.forEach((e) => {
        const set = e.sets
          .filter((t) => t.type === "working")
          .sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
        if (set)
          map.set(e.name, [
            ...(map.get(e.name) ?? []),
            {
              date: s.date,
              weight: set.weight,
              reps: set.reps,
              rir: set.rir,
              cycle: s.cycleId,
            },
          ]);
      }),
    );
  return [...map].flatMap(([name, sets]) => {
    if (sets.length < 2) return [];
    const before = sets.at(-2)!,
      after = sets.at(-1)!;
    const comparable =
      before.rir !== null && after.rir !== null && after.rir >= before.rir;
    const improved =
      comparable &&
      ((after.weight > before.weight && after.reps >= before.reps) ||
        (after.weight === before.weight && after.reps > before.reps) ||
        (after.weight === before.weight &&
          after.reps === before.reps &&
          after.rir! > before.rir!));
    return [{ name, before, after, comparable, improved }];
  });
}
export function muscleCompleted(state: AppState, cycle: Cycle, muscle: string) {
  const events = state.cycleEvents?.filter((e) => e.cycleId === cycle.id) ?? [];
  const finished = Math.floor(events.length / cycle.days.length);
  const currentIds = new Set(
    events.slice(finished * cycle.days.length).map((e) => e.sessionId),
  );
  return state.sessions
    .filter(
      (s) =>
        s.cycleId === cycle.id &&
        (currentIds.has(s.id) || s.status === "in_progress"),
    )
    .flatMap((s) => s.exercises)
    .filter((e) => e.muscle === muscle)
    .reduce((n, e) => n + e.sets.filter((t) => t.type === "working").length, 0);
}
export function activeCycle(state: AppState) {
  return state.cycles
    ?.filter(
      (c) =>
        !c.activateAfter ||
        ((state.cycleEvents?.filter(
          (e) => e.cycleId === c.activateAfter!.cycleId,
        ).length ?? 0) >= c.activateAfter.eventCount &&
          !state.sessions.some(
            (s) =>
              s.status === "in_progress" &&
              s.cycleId === c.activateAfter!.cycleId,
          )),
    )
    .at(-1);
}

export type ExercisePerformancePoint = {
  date: string;
  cycleId: string | null;
  weight: number;
  reps: number;
  rir: number | null;
  e1rm: number;
};

export type ExercisePerformanceTrend = {
  name: string;
  history: ExercisePerformancePoint[];
  latest: ExercisePerformancePoint;
  previous: ExercisePerformancePoint | null;
  e1rmChangePct: number | null;
  improved: boolean;
};

export type CrossCyclePerformance = {
  currentCycleId: string | null;
  previousCycleId: string | null;
  comparable: number;
  improved: number;
  direction: "progressing" | "mixed" | "insufficient";
  exercises: {
    name: string;
    previousE1rm: number;
    currentE1rm: number;
    changePct: number;
    improved: boolean;
  }[];
};

export function estimate1RM(weight: number, reps: number) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0)
    return 0;
  return round(weight * (1 + reps / 30), 2);
}

export function exercisePerformanceHistory(
  state: AppState,
): ExercisePerformanceTrend[] {
  const map = new Map<string, ExercisePerformancePoint[]>();

  state.sessions
    .filter((s) => s.status === "completed")
    .slice()
    .sort((a, b) =>
      (a.completedAt ?? a.date).localeCompare(b.completedAt ?? b.date),
    )
    .forEach((session) => {
      session.exercises.forEach((exercise) => {
        const working = exercise.sets.filter((set) => set.type === "working");
        if (!working.length) return;
        const best = working
          .map((set) => ({
            set,
            e1rm: estimate1RM(set.weight, set.reps),
          }))
          .sort((a, b) => b.e1rm - a.e1rm)[0];
        const point: ExercisePerformancePoint = {
          date: session.date,
          cycleId: session.cycleId ?? null,
          weight: best.set.weight,
          reps: best.set.reps,
          rir: best.set.rir,
          e1rm: best.e1rm,
        };
        map.set(exercise.name, [...(map.get(exercise.name) ?? []), point]);
      });
    });

  return [...map.entries()].map(([name, history]) => {
    const latest = history.at(-1)!;
    const previous = history.length > 1 ? history.at(-2)! : null;
    const comparable =
      previous &&
      previous.rir !== null &&
      latest.rir !== null &&
      latest.rir >= previous.rir;
    const e1rmChangePct =
      comparable && previous.e1rm > 0
        ? round(((latest.e1rm - previous.e1rm) / previous.e1rm) * 100, 2)
        : null;
    return {
      name,
      history,
      latest,
      previous,
      e1rmChangePct,
      improved: Boolean(comparable && e1rmChangePct !== null && e1rmChangePct >= 1),
    };
  });
}

export function crossCyclePerformance(state: AppState): CrossCyclePerformance {
  const completed = state.sessions
    .filter((s) => s.status === "completed")
    .slice()
    .sort((a, b) =>
      (a.completedAt ?? a.date).localeCompare(b.completedAt ?? b.date),
    );

  const cycleOrder: string[] = [];
  completed.forEach((s) => {
    const id = s.cycleId ?? "unassigned";
    if (!cycleOrder.includes(id)) cycleOrder.push(id);
  });

  if (cycleOrder.length < 2)
    return {
      currentCycleId: cycleOrder.at(-1) ?? null,
      previousCycleId: null,
      comparable: 0,
      improved: 0,
      direction: "insufficient",
      exercises: [],
    };

  const previousCycleId = cycleOrder.at(-2)!;
  const currentCycleId = cycleOrder.at(-1)!;

  function bestByExercise(cycleId: string) {
    const map = new Map<string, number>();
    completed
      .filter((s) => (s.cycleId ?? "unassigned") === cycleId)
      .forEach((s) =>
        s.exercises.forEach((e) => {
          const best = Math.max(
            0,
            ...e.sets
              .filter((set) => set.type === "working")
              .map((set) => estimate1RM(set.weight, set.reps)),
          );
          if (best > 0) map.set(e.name, Math.max(map.get(e.name) ?? 0, best));
        }),
      );
    return map;
  }

  const previous = bestByExercise(previousCycleId);
  const current = bestByExercise(currentCycleId);
  const exercises = [...current.entries()]
    .filter(([name]) => previous.has(name))
    .map(([name, currentE1rm]) => {
      const previousE1rm = previous.get(name)!;
      const changePct =
        previousE1rm > 0
          ? round(((currentE1rm - previousE1rm) / previousE1rm) * 100, 2)
          : 0;
      return {
        name,
        previousE1rm,
        currentE1rm,
        changePct,
        improved: changePct >= 1,
      };
    })
    .sort((a, b) => b.changePct - a.changePct);

  const improved = exercises.filter((e) => e.improved).length;
  const comparable = exercises.length;
  return {
    currentCycleId: currentCycleId === "unassigned" ? null : currentCycleId,
    previousCycleId: previousCycleId === "unassigned" ? null : previousCycleId,
    comparable,
    improved,
    direction:
      comparable < 2
        ? "insufficient"
        : improved / comparable >= 0.5
          ? "progressing"
          : "mixed",
    exercises,
  };
}