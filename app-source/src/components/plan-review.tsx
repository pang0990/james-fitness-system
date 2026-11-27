import type { AppState, CycleDay } from "@/lib/domain";
import { dateInZone } from "@/lib/domain";
import { activeCycle } from "@/lib/training-model";
import { exerciseDescription, versionReview } from "@/lib/plan-version-review";
import { Sheet } from "./daily";

function dayLines(day: CycleDay) {
  return [
    day.notes && "備註 · " + day.notes,
    ...(day.exercises ?? []).map(
      (e, i) => i + 1 + ". " + exerciseDescription(e),
    ),
    day.secondSession && "第二場 · " + day.secondSession.name,
    ...(day.secondSession?.exercises ?? []).map(
      (e, i) => i + 1 + ". " + exerciseDescription(e),
    ),
  ].filter(Boolean);
}
export function PlanReview({
  state,
  name,
  days,
  close,
  confirm,
}: {
  state: AppState;
  name: string;
  days: CycleDay[];
  close: () => void;
  confirm: () => void;
}) {
  const review = versionReview(
    state,
    days,
    dateInZone(state.profile?.timezone),
  );
  const old = activeCycle(state);
  return (
    <Sheet title="檢閱課表變更" onClose={close}>
      <p>
        {old?.name ?? "新計畫"} → {name}
      </p>
      <table className="plan-diff">
        <caption>按訓練日比對順序、動作與目標</caption>
        <thead>
          <tr>
            <th>目前版本</th>
            <th>新版本</th>
          </tr>
        </thead>
        <tbody>
          {[
            ...new Set([
              ...days.map((d) => d.id),
              ...review.oldDays.map((d) => d.id),
            ]),
          ].map((id) => (
            <tr key={id}>
              {[review.oldDays, days].map((list, column) => {
                const i = list.findIndex((d) => d.id === id),
                  day = list[i];
                return (
                  <td key={column}>
                    {day ? (
                      <>
                        <strong>
                          Day {i + 1} · {day.name}
                        </strong>
                        <ul>
                          {dayLines(day).map((line, k) => (
                            <li key={k}>{line}</li>
                          ))}
                        </ul>
                      </>
                    ) : column ? (
                      "移除"
                    ) : (
                      "新增"
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        週期輪次 {old?.round ?? 1} → {review.nextRound}
      </p>
      <p>
        目前待練順序：
        {review.before
          .map((id) => review.oldDays.find((d) => d.id === id)?.name ?? id)
          .join(" → ") || "無"}
      </p>
      <p>
        新版本待練順序：
        {review.pending
          .map((id) => days.find((d) => d.id === id)?.name ?? id)
          .join(" → ")}
      </p>
      {!!review.affected.length && (
        <p role="status">
          以下日期原排定的訓練日已移除，請到行事曆重新指定：
          {review.affected.join("、")}
        </p>
      )}
      <button type="button" className="button" onClick={confirm}>
        確認建立新版本
      </button>
      <button type="button" onClick={close}>
        返回編輯
      </button>
    </Sheet>
  );
}
