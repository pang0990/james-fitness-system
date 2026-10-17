import catalog from "@/content/exercises.json";
import type { AppState } from "./domain";

export type ExerciseLibraryEntry = {
  id:string; name:string; nameZh:string; brand:string; equipment:string;
  muscle:string; usage:"training"|"warmup"|"both";
  allowRestPause:boolean; allowDropSet:boolean;
  source:"jfs"|"personal";
  visibility:"public"|"private";
  videoAngles?: Partial<Record<"front"|"side"|"angle45"|"rear",string>>;
};

export function exerciseLibrary(state:AppState):ExerciseLibraryEntry[]{
  const builtIn:ExerciseLibraryEntry[]=catalog.map(item=>{
    const x=item as typeof item & {
      videoAngles?:Partial<Record<"front"|"side"|"angle45"|"rear",string>>;
    };
    return {
      id:x.id,name:x.name,nameZh:x.nameZh,brand:x.brand,
      equipment:x.brand,muscle:x.muscle,usage:"training",
      allowRestPause:x.allowRestPause,allowDropSet:x.allowDropSet,
      source:"jfs",visibility:"public",
      videoAngles:{
        ...(x.video_url?{front:x.video_url}:{}),...(x.videoAngles??{}),
      },
    };
  });
  const personal:ExerciseLibraryEntry[]=(state.customExercises??[]).map(x=>({
    ...x,nameZh:x.name,source:"personal",visibility:"private",
  }));
  return [...personal,...builtIn];
}

export function searchExercises(items:ExerciseLibraryEntry[],query:string,muscle=""){
  const q=query.trim().toLocaleLowerCase();
  return items.filter(x=>(!muscle||x.muscle===muscle) &&
    (!q||[x.name,x.nameZh,x.brand,x.equipment,x.muscle]
      .some(v=>v.toLocaleLowerCase().includes(q))));
}
