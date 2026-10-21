import { initialState, type Session, type Segment } from "../../src/lib/domain";
export const testTime = "2026-10-21T02:00:00.000Z";
export function segment(id = "set-1"): Segment {
  return {
    id,
    type: "working",
    weight: 60,
    reps: 8,
    rir: null,
    createdAt: testTime,
  };
}
export function trainingFixture() {
  const state = initialState();
  state.appearance = {
    theme: "dark",
    visualStyle: "minimal",
    showCompanion: false,
  };
  state.preferences = {
    autoRest: true,
    warmupDefault: "skip",
    keepAwake: false,
  };
  state.cycles = [
    {
      id: "test-cycle",
      name: "隔離驗收 Cycle",
      createdAt: testTime,
      pending: ["day-a", "day-b"],
      round: 1,
      days: [
        { id: "day-a", name: "上肢", exercises: [] },
        { id: "day-b", name: "下肢", exercises: [] },
      ],
    },
  ];
  const session: Session = {
    id: "test-session",
    date: "2026-10-21",
    name: "上肢訓練",
    status: "in_progress",
    phase: "workout",
    createdAt: new Date().toISOString(),
    cycleId: "test-cycle",
    trainingDayId: "day-a",
    exercises: [
      {
        id: "ex-a",
        exerciseLibraryId: "stable-a",
        name: "胸推",
        plannedSets: 3,
        restSeconds: 120,
        reps: "8–12",
        allowRestPause: true,
        allowDropSet: true,
        sets: [],
      },
      {
        id: "ex-b",
        exerciseLibraryId: "stable-b",
        name: "划船",
        plannedSets: 3,
        restSeconds: 90,
        sets: [],
      },
    ],
  };
  state.sessions = [
    {
      ...structuredClone(session),
      id: "legacy-session",
      status: "completed",
      createdAt: testTime,
      completedAt: testTime,
      cycleId: undefined,
      trainingDayId: undefined,
      exercises: [
        {
          id: "old-ex",
          exerciseLibraryId: "stable-a",
          name: "改名前的胸推",
          sets: [{ ...segment("legacy-set"), rir: 2 }],
        },
      ],
    },
    session,
  ];
  return state;
}
