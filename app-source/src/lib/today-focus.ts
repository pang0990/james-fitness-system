import type { AppState } from "./domain";
import { activeCycle, scheduleEntry } from "./training-model";
import { dayId } from "./training-queue";

export function todayFocus(state: AppState, date: string) {
  const current = state.sessions.find(session => session.status === "in_progress");
  if (current) return { title: current.name, status: current.pausedAt ? "已暫停" : "進行中", action: "繼續訓練", href: "/training/session" };
  const completed = state.sessions.filter(session =>
    session.status === "completed" && (session.workoutDate ?? session.date) === date
  ).sort((a,b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  for (const first of completed) {
    if (first.isExtra || first.parentSessionId || first.cycleCounted === false) continue;
    const cycle = state.cycles?.find(plan => plan.id === first.cycleId);
    const second = cycle?.days.find((_, i) => dayId(cycle, i) === first.trainingDayId)?.secondSession;
    if (second?.exercises?.length && !state.sessions.some(s => s.parentSessionId === first.id && s.status !== "discarded"))
      return { title: second.name, status: "第二場", action: "開始第二場", href: "/training#planned-second" };
  }
  if (completed.length) return { title: completed[0].name, status: "已完成", action: "查看訓練摘要", href: "/training/history/session?id=" + encodeURIComponent(completed[0].id) };
  const plan = activeCycle(state);
  const schedule = scheduleEntry(state, date);
  if (schedule.id || state.weeklySchedule !== undefined) {
    if (schedule.kind !== "train") return { title: "今天是休息日", status: "休息日", action: "開啟每日紀錄", href: "/nutrition" };
    if (plan?.days.length) {
      const day = plan.days.find((_, i) => dayId(plan, i) === schedule.trainingDayId);
      if (schedule.trainingDayId && !day) return { title: "排程的訓練日已移除", status: "待調整", action: "查看訓練行事曆", href: "/training/calendar" };
      return { title: day?.name ?? "今日有訓練安排", status: "已排定", action: "開始訓練", href: "/training" };
    }
  }
  return { title: plan ? "今天尚未排定訓練" : "尚無訓練計畫", status: "未排定", action: "查看訓練計畫", href: "/training/plan" };
}
