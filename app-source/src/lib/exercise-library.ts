import catalog from "@/content/exercises.json";
import type { AppState } from "./domain";
import { warmups } from "./training-model";

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
  // Original warm-up presets live in the same searchable exercise library.
  // Warm-up-only movements are never auto-counted as Working Sets.
  const builtInWarmups:ExerciseLibraryEntry[]=warmups.map(item=>({
    id:"jfs-warmup:"+item.id,
    name:item.name,nameZh:item.name,brand:"JFS",equipment:"徒手／簡易器材",
    muscle:"Warm-up",usage:"warmup",
    allowRestPause:false,allowDropSet:false,source:"jfs",visibility:"public",
  }));
  const personal:ExerciseLibraryEntry[]=(state.customExercises??[]).map(x=>({
    ...x,nameZh:x.name,source:"personal",visibility:"private",
  }));
  return [...personal,...builtInWarmups,...builtIn];
}

export function searchExercises(items:ExerciseLibraryEntry[],query:string,muscle="",usage:"all"|"training"|"warmup"="all"){
  const q=query.trim().toLocaleLowerCase();
  return items.filter(x=>(!muscle||x.muscle===muscle) &&
    (usage==="all" || x.usage==="both" || x.usage===usage) &&
    (!q||[x.name,x.nameZh,x.brand,x.equipment,x.muscle]
      .some(v=>v.toLocaleLowerCase().includes(q))));
}
