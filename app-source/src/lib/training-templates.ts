export type PlannedExercise = {
  exerciseId: string;
  name: string;
  sets: number;
  reps: [number, number];
  rir: number;
  restSeconds: number;
  allowRestPause?: boolean;
  allowDropSet?: boolean;
};

export type TrainingDayTemplate = {
  id: string;
  name: string;
  exercises: PlannedExercise[];
};

export type TrainingPlanTemplate = {
  id: "upper-lower" | "ppl" | "five-day" | "blank";
  name: string;
  description: string;
  days: TrainingDayTemplate[];
};

const ex = (
  exerciseId: string,
  name: string,
  sets: number,
  reps: [number, number],
  rir: number,
  restSeconds: number,
  options: Partial<Pick<PlannedExercise, "allowRestPause" | "allowDropSet">> = {},
): PlannedExercise => ({ exerciseId, name, sets, reps, rir, restSeconds, ...options });

export const trainingTemplates: TrainingPlanTemplate[] = [
  {
    id: "upper-lower",
    name: "Upper / Lower",
    description: "四個訓練日；A/B 版本保留不同動作刺激。所有 Training Day 都可獨立修改。",
    days: [
      {
        id: "upper-a",
        name: "Upper A",
        exercises: [
          ex("exercise-1", "Barbell Bench Press", 3, [6, 10], 2, 150),
          ex("exercise-27", "Newtech · Lat Pulldown (High Pulley)", 3, [8, 12], 2, 120),
          ex("exercise-14", "Dumbbell Shoulder Press", 3, [6, 10], 2, 120),
          ex("exercise-28", "Newtech · Seated Row", 3, [8, 12], 2, 120),
          ex("exercise-15", "Dumbbell Lateral Raise", 3, [10, 15], 2, 75, { allowRestPause: true }),
          ex("exercise-18", "Dumbbell Curl", 2, [10, 15], 2, 75),
          ex("exercise-20", "Overhead Triceps Extension", 2, [10, 15], 2, 75),
        ],
      },
      {
        id: "lower-a",
        name: "Lower A",
        exercises: [
          ex("exercise-10", "Barbell Squat", 3, [6, 10], 2, 180),
          ex("exercise-9", "Romanian Deadlift", 3, [6, 10], 2, 150),
          ex("exercise-11", "Bulgarian Split Squat", 3, [8, 12], 2, 120),
          ex("exercise-13", "Barbell Hip Thrust", 3, [8, 12], 2, 120),
          ex("exercise-22", "Standing Calf Raise", 3, [10, 15], 2, 75),
        ],
      },
      {
        id: "upper-b",
        name: "Upper B",
        exercises: [
          ex("exercise-3", "Incline Dumbbell Press", 3, [8, 12], 2, 120),
          ex("exercise-8", "Pull-up", 3, [6, 10], 2, 150),
          ex("exercise-6", "Barbell Row", 3, [6, 10], 2, 150),
          ex("exercise-2", "Dumbbell Bench Press", 3, [8, 12], 2, 120),
          ex("exercise-16", "Dumbbell Reverse Fly", 3, [10, 15], 2, 75),
          ex("exercise-17", "Barbell Curl", 2, [8, 12], 2, 75),
          ex("exercise-21", "Lying Triceps Extension", 2, [8, 12], 2, 75),
        ],
      },
      {
        id: "lower-b",
        name: "Lower B",
        exercises: [
          ex("exercise-9", "Romanian Deadlift", 3, [6, 10], 2, 150),
          ex("exercise-10", "Barbell Squat", 3, [8, 10], 2, 180),
          ex("exercise-12", "Dumbbell Lunge", 3, [8, 12], 2, 120),
          ex("exercise-13", "Barbell Hip Thrust", 3, [8, 12], 2, 120),
          ex("exercise-22", "Standing Calf Raise", 3, [10, 15], 2, 75),
        ],
      },
    ],
  },
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    description: "三個基本 Training Day，可直接重排、複製或與自訂日混搭。",
    days: [
      {
        id: "push",
        name: "Push",
        exercises: [
          ex("exercise-1", "Barbell Bench Press", 3, [6, 10], 2, 150),
          ex("exercise-3", "Incline Dumbbell Press", 3, [8, 12], 2, 120),
          ex("exercise-14", "Dumbbell Shoulder Press", 3, [6, 10], 2, 120),
          ex("exercise-15", "Dumbbell Lateral Raise", 3, [10, 15], 2, 75, { allowRestPause: true }),
          ex("exercise-20", "Overhead Triceps Extension", 3, [10, 15], 2, 75),
        ],
      },
      {
        id: "pull",
        name: "Pull",
        exercises: [
          ex("exercise-8", "Pull-up", 3, [6, 10], 2, 150),
          ex("exercise-6", "Barbell Row", 3, [6, 10], 2, 150),
          ex("exercise-27", "Newtech · Lat Pulldown (High Pulley)", 3, [8, 12], 2, 120),
          ex("exercise-28", "Newtech · Seated Row", 3, [8, 12], 2, 120),
          ex("exercise-16", "Dumbbell Reverse Fly", 3, [10, 15], 2, 75),
          ex("exercise-17", "Barbell Curl", 3, [8, 12], 2, 75),
        ],
      },
      {
        id: "legs",
        name: "Legs",
        exercises: [
          ex("exercise-10", "Barbell Squat", 3, [6, 10], 2, 180),
          ex("exercise-9", "Romanian Deadlift", 3, [6, 10], 2, 150),
          ex("exercise-11", "Bulgarian Split Squat", 3, [8, 12], 2, 120),
          ex("exercise-13", "Barbell Hip Thrust", 3, [8, 12], 2, 120),
          ex("exercise-22", "Standing Calf Raise", 3, [10, 15], 2, 75),
        ],
      },
    ],
  },
  {
    id: "five-day",
    name: "五分化",
    description: "Chest / Back / Legs / Shoulders / Arms 五個可獨立修改的 Training Day。",
    days: [
      { id: "chest", name: "Chest", exercises: [
        ex("exercise-1", "Barbell Bench Press", 4, [6, 10], 2, 150),
        ex("exercise-3", "Incline Dumbbell Press", 4, [8, 12], 2, 120),
        ex("exercise-30", "Newtech · Chest Fly", 3, [10, 15], 2, 75, { allowDropSet: true }),
      ]},
      { id: "back", name: "Back", exercises: [
        ex("exercise-8", "Pull-up", 3, [6, 10], 2, 150),
        ex("exercise-24", "Hammer Strength · Iso-Lateral Row", 4, [8, 12], 2, 120),
        ex("exercise-27", "Newtech · Lat Pulldown (High Pulley)", 4, [8, 12], 2, 120),
        ex("exercise-28", "Newtech · Seated Row", 3, [10, 15], 2, 90),
      ]},
      { id: "legs", name: "Legs", exercises: [
        ex("exercise-10", "Barbell Squat", 4, [6, 10], 2, 180),
        ex("exercise-9", "Romanian Deadlift", 4, [6, 10], 2, 150),
        ex("exercise-11", "Bulgarian Split Squat", 3, [8, 12], 2, 120),
        ex("exercise-13", "Barbell Hip Thrust", 3, [8, 12], 2, 120),
        ex("exercise-22", "Standing Calf Raise", 4, [10, 15], 2, 75),
      ]},
      { id: "shoulders", name: "Shoulders", exercises: [
        ex("exercise-14", "Dumbbell Shoulder Press", 4, [6, 10], 2, 120),
        ex("exercise-15", "Dumbbell Lateral Raise", 4, [10, 15], 2, 75, { allowRestPause: true }),
        ex("exercise-16", "Dumbbell Reverse Fly", 4, [10, 15], 2, 75),
      ]},
      { id: "arms", name: "Arms", exercises: [
        ex("exercise-17", "Barbell Curl", 3, [8, 12], 2, 75),
        ex("exercise-19", "Hammer Curl", 3, [10, 15], 2, 75),
        ex("exercise-20", "Overhead Triceps Extension", 3, [10, 15], 2, 75),
        ex("exercise-21", "Lying Triceps Extension", 3, [8, 12], 2, 75),
      ]},
    ],
  },
  { id: "blank", name: "Build from Scratch", description: "從空白 Training Day 開始。", days: [] },
];

export const trainingTemplateById = (id: TrainingPlanTemplate["id"]) =>
  trainingTemplates.find((t) => t.id === id) ?? trainingTemplates.at(-1)!;
