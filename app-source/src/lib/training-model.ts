import { type AppState, type Cycle, addDays, round } from "./domain";
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
  trainingDayId?: string;
  extra?: boolean;
  cleared?: boolean;
  source?: "single"|"batch";
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
export const warmups: WarmupItem[] = [
  { id: "walk", name: "快走或腳踏車", minutes: 3, video_url: null },
  { id: "shoulder", name: "肩部繞環", minutes: 1, video_url: null },
  { id: "hip", name: "髖關節活動", minutes: 1, video_url: null },
  { id: "squat", name: "徒手深蹲", minutes: 1, video_url: null },
  { id: "band", name: "彈力帶拉開", minutes: 1, video_url: null },
];
export function scheduleEntry(state:AppState,date:string) {
 const entries=state.schedule?.filter(e=>e.date===date)??[];
 const single=entries.filter(e=>e.source!=="batch").at(-1);
 if(single&&!single.cleared)return single;
 const batch=entries.filter(e=>e.source==="batch").at(-1);if(batch)return batch;
 const weekday=new Date(date+"T12:00:00Z").getUTCDay();
 return {kind:state.weeklySchedule?.includes(weekday)?"train":state.weeklySchedule?"rest":"train"} as ScheduleEntry;
}
export function scheduleKind(state:AppState,date:string){return scheduleEntry(state,date).kind;}
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
