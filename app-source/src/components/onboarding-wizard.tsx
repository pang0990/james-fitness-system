"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { createInitialPlan, dateInZone, frequencies, type Profile } from "@/lib/domain";
import { asProfile, blankSafety, startingTarget, type OnboardingData } from "@/lib/onboarding";

const STEPS = ["basic","goal","activity","safety","result"] as const;
type Step = (typeof STEPS)[number];
const DRAFT_KEY = "jfs-onboarding-draft-v1";
const DEFAULT: OnboardingData = {
  name:"", age:18, height:170, weight:70, sex:"male", goal:"CUT",
  frequency: -1, resistanceDays:0, experiencedCut:false, safety:blankSafety(),
};
const stepHref = (step: Step) => "/onboarding/" + step;
const safeFloat = (value: string) => value === "" ? undefined : Number(value);

function fromProfile(profile: Profile | null): OnboardingData {
  if (!profile) return DEFAULT;
  return {
    ...DEFAULT, name:profile.name, age:profile.age,
    height:profile.height, weight:profile.weight,
    sex:profile.sex, goal:profile.goal, frequency:profile.frequency,
    resistanceDays:profile.resistanceDays ?? 0,
    bodyFat:profile.bodyFat, experiencedCut:profile.experiencedCut,
    safety:profile.safety ?? blankSafety(),
  };
}

export function OnboardingWizard({ path, notify }: { path:string; notify: (s?:string)=>void }) {
  const {state, save} = useStore();
  const router = useRouter();
  const requested = path.split("/")[1] as Step | undefined;
  const step = STEPS.includes(requested as Step) ? requested as Step : "basic";
  const index = STEPS.indexOf(step);
  const [data, setData] = useState<OnboardingData>(() => fromProfile(state.profile));
  const [hydrated, setHydrated] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OnboardingData>;
        setData({...fromProfile(state.profile),...parsed,
          safety:{...blankSafety(),...parsed.safety}});
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    setHydrated(true);
    // Restore draft only on the initial mount. Changes after that are kept in component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(DRAFT_KEY,JSON.stringify(data)); } catch { /* browser storage may be unavailable */ }
  },[data,hydrated]);

  const change = <K extends keyof OnboardingData>(key:K, value:OnboardingData[K]) => {
    setData(old => ({...old,[key]:value}));setError("");
  };
  const changeSafety = (key:keyof OnboardingData["safety"], checked:boolean) => {
    setData(old => ({...old,safety:{...old.safety,[key]:checked}}));setError("");
  };
  const target = startingTarget(data);

  function next() {
    if (step === "basic" && (!data.age || data.age<1 || data.age>100 ||
        !data.height || data.height<100 || data.height>250 ||
        !data.weight || data.weight<30 || data.weight>350 ||
        (data.bodyFat !== undefined && (data.bodyFat<1 || data.bodyFat>70)))) {
      setError("請確認年齡、身高、體重與體脂資料有效。");return;
    }
    if (step === "activity" && (data.resistanceDays<0 || data.resistanceDays>7)) {
      setError("每週阻力訓練天數應介於 0 到 7 天。");return;
    }
    if (step === "result") { confirm();return; }
    const nextStep = STEPS[index+1];
    if(nextStep) router.push(stepHref(nextStep));
  }
  function confirm() {
    const profile = asProfile(data,state.profile);
    const today = dateInZone(profile.timezone);
    if (save("完成新版 Onboarding", draft => {
      draft.profile = profile;
      if(!draft.measurements.length) {
        draft.measurements.push({id:crypto.randomUUID(), date:today, weight:profile.weight, createdAt:new Date().toISOString()});
      }
      if(!draft.versions.length && target.status === "cut") {
        createInitialPlan(draft,today,crypto.randomUUID(),new Date().toISOString());
      }
      if(!draft.versions.length && target.status === "gain-temporary" && target.targets) {
        draft.versions.push({
          id:crypto.randomUUID(),number:1,createdAt:new Date().toISOString(),
          effectiveDate:today,previousId:null,ruleId:target.ruleId!,
          inputs:structuredClone(profile),targets:structuredClone(target.targets),
          reason:"使用者確認 GAIN Temporary 42 kcal/kg，需至少 14 天真實資料後再評估。",
        });
      }
      (draft.goalHistory ??= []).push({id:crypto.randomUUID(),goal:profile.goal,date:today});
    })) {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* no storage */ }
      notify(target.status === "tracking" ? "已啟用紀錄模式" : "已建立起始目標");
      router.push("/today");
    }
  }
  return (
    <div className="daily-page onboarding-wizard">
      <div className="onboarding-title">
        <span className="eyebrow">JAMES FITNESS SYSTEM · INITIAL SETUP</span>
        <h1>{({basic:"Basic Information",goal:"Your Goal",activity:"Activity Profile",safety:"Safety Check",result:"Your Starting Point"} as Record<Step,string>)[step]}</h1>
        <p className="muted">設定起點，其餘訓練與生活偏好可以稍後在 Profile 補充。</p>
      </div>
      <nav className="onboarding-progress" aria-label="設定進度">
        {STEPS.map((s,i)=><span key={s} className={index>=i?"active":""} aria-label={s}/>)}
      </nav>
      {!hydrated ? <div className="card">正在恢復設定草稿…</div> : (
      <div className="card onboarding-content">
        {step === "basic" && (
          <div className="onboarding-fields">
            <label>稱呼（可選）<input value={data.name} maxLength={40} placeholder="Athlete" onChange={e=>change("name",e.target.value)}/></label>
            <label>年齡<input type="number" inputMode="numeric" min={1} max={100} value={data.age} onChange={e=>change("age",Number(e.target.value))}/></label>
            <label>性別／Numbers 計算預設<select value={data.sex} onChange={e=>change("sex",e.target.value as "male"|"female")}><option value="male">男性</option><option value="female">女性</option></select></label>
            <label>身高 cm<input type="number" inputMode="decimal" min={100} max={250} value={data.height} onChange={e=>change("height",Number(e.target.value))}/></label>
            <label>體重 kg<input type="number" inputMode="decimal" min={30} max={350} step="0.1" value={data.weight} onChange={e=>change("weight",Number(e.target.value))}/></label>
            <label>體脂率 %（選填）<input type="number" inputMode="decimal" min={1} max={70} step="0.1" placeholder="不知道可留空" value={data.bodyFat ?? ""} onChange={e=>change("bodyFat",safeFloat(e.target.value))}/></label>
          </div>
        )}
        {step === "goal" && (
          <div className="onboarding-goals">
            {(["CUT","GAIN"] as const).map(g=>(
              <button key={g} type="button" aria-pressed={data.goal===g} className={"onboarding-goal "+(data.goal===g?"selected":"")} onClick={()=>change("goal",g)}>
                <strong>{g}</strong><span>{g==="CUT"?"減脂｜依 Numbers 3.0 係數建立初始目標":"增肌｜符合條件時先提供 42 kcal/kg 暫時目標"}</span>
              </button>
            ))}
          </div>
        )}
        {step === "activity" && (
          <div className="onboarding-fields">
            <p className="muted">活動量與訓練頻率用於確認起始條件，不會依未確認的混合數據猜測你的運動級別。</p>
            <label>Numbers 3.0 運動級別（CUT 計算使用）
              <select value={data.frequency} onChange={e=>change("frequency",Number(e.target.value))}>
                <option value={-1}>無法符合／尚未確定（只紀錄）</option>
                {frequencies.map((label,i)=><option key={label} value={i}>Level {i+1} · {label}</option>)}
              </select>
            </label>
            <label>每週阻力訓練次數（GAIN 起始門檻）
              <select value={data.resistanceDays} onChange={e=>change("resistanceDays",Number(e.target.value))}>
                {Array.from({length:8},(_,i)=><option key={i} value={i}>{i} 次／週</option>)}
              </select>
            </label>
            <label className="check"><input type="checkbox" checked={data.experiencedCut} onChange={e=>change("experiencedCut",e.target.checked)}/>有減脂經驗</label>
            <p className="muted">Level 1：2–3 小時／2 次；Level 2：4–5 小時／3 次；Level 3：6–7 小時／4 次；Level 4：8–9 小時／5 次。</p>
          </div>
        )}
        {step === "safety" && (
          <div className="onboarding-fields">
            <p className="muted">以下資料只用於安全篩選，不作廣告或社交推薦。勾選任一情況仍可使用 Tracking Only。</p>
            {([
              ["pregnantOrBreastfeeding","懷孕／哺乳"],
              ["eatingDisorderHistory","有飲食失調史"],
              ["chronicConditionOrMedication","有慢性疾病或正在使用藥物"],
              ["otherMedicalConcern","其他需要專業人員評估的健康情況"],
            ] as const).map(([key,label])=>(
              <label className="check" key={key}>
                <input type="checkbox" checked={data.safety[key]} onChange={e=>changeSafety(key,e.target.checked)} />
                {label}
              </label>
            ))}
            <p className="muted">未滿 18 歲目前不產生標準減脂／增肌目標。若有疼痛、昏厥、胸痛或其他警訊，請停止誘發症狀的活動並尋求適當醫療評估。</p>
          </div>
        )}
        {step === "result" && (
          <div className="stack">
            <div className="onboarding-result-summary">
              <div><small>GOAL</small><strong>{data.goal}</strong></div>
              <div><small>WEIGHT</small><strong>{data.weight} kg</strong></div>
              <div><small>STATUS</small><strong>{target.status==="cut"?"CUT Target":target.status==="gain-temporary"?"Temporary GAIN":"Tracking Only"}</strong></div>
            </div>
            <p className="muted">{target.reason}</p>
            {target.targets ? (
              <div className="onboarding-target-table">
                {(Object.entries(target.targets) as [keyof typeof target.targets, typeof target.targets.training][]).map(([type,m])=>(
                  <div className="card" key={type}><h3>{type==="training"?"訓練日":type==="light"?"有氧／輕訓日":"休息日"}</h3>
                    <strong>{m.kcal} kcal</strong>
                    <span>P {m.p} g · C {m.c} g · F {m.f} g</span>
                  </div>
                ))}
              </div>
            ) : <p className="notice">尚不提供自動營養目標；飲食、體重、訓練和恢復紀錄仍可正常使用。</p>}
            {target.status==="gain-temporary" && <p className="muted">此為暫時起點，不是經個人資料驗證的維持熱量；14 天後收集足夠紀錄，再由使用者 Accept／Keep 決定是否調整。</p>}
            {data.bodyFat === undefined && <p className="muted">目前沒有體脂資料；GAIN 適用性已使用 BMI 作安全篩選。</p>}
          </div>
        )}
        {!!error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          {index > 0 && <Link className="button secondary" href={stepHref(STEPS[index-1])}>上一頁</Link>}
          <button type="button" className="button" onClick={next}>{step==="result"?"確認並開始":"下一步"}</button>
        </div>
      </div>
      )}
      <p className="muted">本裝置儲存設定草稿。正式 Google 登入及跨裝置雲端同步尚未接通；不會顯示假的「已同步」。</p>
    </div>
  );
}
