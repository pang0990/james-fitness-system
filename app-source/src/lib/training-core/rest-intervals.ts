import type { Session } from "./types";

export type RestKind = "standard" | "rp";

export function startRestInterval(session: Session, kind: RestKind, now: string, targetSeconds: number) {
  if (session.status !== "in_progress" || session.pausedAt) throw Error("暫停中的訓練不能開始休息計時");
  if (!Number.isInteger(targetSeconds) || targetSeconds < 1 || targetSeconds > 3600) throw Error("休息秒數不正確");
  endRestInterval(session, kind === "rp" ? "standard" : "rp", now);
  if (kind === "rp") {
    if (session.rpRestStartedAt) return false;
    session.rpRestStartedAt = now;
    session.rpRestTargetSeconds = targetSeconds;
  } else {
    if (session.restStartedAt) return false;
    session.restStartedAt = now;
    session.restTargetSeconds = targetSeconds;
  }
  return true;
}

export function endRestInterval(session: Session, kind: RestKind, now: string) {
  const start = kind === "rp" ? session.rpRestStartedAt : session.restStartedAt;
  if (!start) return false;
  const pausedEnd = session.pausedAt ? Math.min(Date.parse(now), Date.parse(session.pausedAt)) : Date.parse(now);
  const endedAt = new Date(Math.max(Date.parse(start), pausedEnd)).toISOString();
  const target = kind === "rp" ? session.rpRestTargetSeconds : session.restTargetSeconds;
  const record = {
    startedAt: start, endedAt,
    elapsedSeconds: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(start)) / 1000)),
    targetSeconds: target ?? (kind === "rp" ? 20 : 120),
  };
  if (kind === "rp") {
    (session.rpRestHistory ??= []).push(record);
    delete session.rpRestStartedAt;
    delete session.rpRestTargetSeconds;
  } else {
    (session.restHistory ??= []).push(record);
    delete session.restStartedAt;
    delete session.restTargetSeconds;
  }
  return true;
}
