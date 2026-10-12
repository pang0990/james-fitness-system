"use client";
import { useStore } from "@/lib/store";
import { PageTitle } from "./daily";
export function MealSettings({ notify }: { notify: (s?: string) => void }) {
  const { state, save } = useStore();
  return (
    <div className="daily-page">
      <PageTitle title="餐次設定" />
      <p>
        每行一餐，可改名、新增、刪除或調整順序。之後每日沿用，歷史紀錄保留原餐次。
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const names = String(new FormData(e.currentTarget).get("meals"))
            .split("\n")
            .map((n) => n.trim())
            .filter(Boolean);
          if (!names.length || new Set(names).size !== names.length) {
            notify("至少保留一餐，名稱不可重複");
            return;
          }
          if (
            save("更新每日餐次", (s) => {
              s.mealSlots = names;
            })
          )
            notify("餐次已儲存");
        }}
      >
        <textarea
          name="meals"
          aria-label="每日餐次"
          defaultValue={state.mealSlots.join("\n")}
          maxLength={300}
          required
        />
        <button className="button">保存餐次</button>
      </form>
    </div>
  );
}
