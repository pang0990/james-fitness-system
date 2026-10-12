"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { latestRecovery, safetyText } from "@/lib/recovery";
import { addDays, visibleMeasurements, resolveDay } from "@/lib/domain";
export function NoticeCarousel({
  date,
  onLog,
}: {
  date: string;
  onLog?: (date: string) => void;
}) {
  const { state, save } = useStore();
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false);
  const touch = useRef(0);
  const current = state.sessions.find((s) => s.status === "in_progress");
  const pain = latestRecovery(state, date)
    .filter((r) => r.type === "pain" && (r.safetyLevel ?? 0) >= 3)
    .sort((a, b) => (b.safetyLevel ?? 0) - (a.safetyLevel ?? 0))[0];
  const notices: {
    text: string;
    href: string;
    safety: boolean;
    logDate?: string;
  }[] = [
    ...(pain
      ? [
          {
            text: safetyText[pain.safetyLevel!],
            href: "/today",
            safety: true,
            logDate: date,
          },
        ]
      : []),
    ...(!state.profile?.eligible && state.profile
      ? [
          {
            text: "請先確認個人適用狀態",
            href: "/settings/profile",
            safety: true,
          },
        ]
      : []),
    ...(!resolveDay(state, date).target
      ? [
          {
            text:
              state.profile?.goal === "GAIN"
                ? "確認你的 GAIN 飲食基準"
                : "設定營養計畫",
            href:
              state.profile?.goal === "GAIN"
                ? "/nutrition/plan"
                : "/onboarding",
            safety: false,
          },
        ]
      : []),
    ...(state.recommendations.some((r) => r.status === "pending")
      ? [
          {
            text: "有一項計畫調整待你決定",
            href: "/progress/review",
            safety: false,
          },
        ]
      : []),
    ...(current
      ? [
          {
            text: `繼續 ${current.name}`,
            href: "/training/session",
            safety: false,
          },
        ]
      : []),
    ...(state.preferences?.reminders === false
      ? []
      : [0, 1, 2].flatMap((offset) => {
          const d = addDays(date, -offset),
            r = latestRecovery(state, d);
          const missing = [
            ...(!visibleMeasurements(state).some((m) => m.date === d)
              ? ["體重"]
              : []),
            ...(["sleep", "fatigue", "stress", "soreness"] as const)
              .filter(
                (t) =>
                  state.preferences?.[
                    "track" + t[0].toUpperCase() + t.slice(1)
                  ] !== false && !r.some((x) => x.type === t),
              )
              .map(
                (t) =>
                  ({
                    sleep: "睡眠",
                    fatigue: "疲勞",
                    stress: "壓力",
                    soreness: "痠痛",
                  })[t],
              ),
            ...(!resolveDay(state, d).complete ? ["飲食完整度"] : []),
          ];
          return missing.length && state.dismissedNotices?.[d] !== date
            ? [
                {
                  text: `${["今天", "昨天", "前天"][offset]} · ${missing.join("、")}`,
                  href: "/today",
                  safety: false,
                  logDate: d,
                },
              ]
            : [];
        })),
  ];
  const pinned = notices[0]?.safety;
  useEffect(() => {
    if (
      paused ||
      pinned ||
      notices.length < 2 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % notices.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [paused, pinned, notices.length]);
  if (!notices.length) return null;
  const at = pinned ? 0 : index % notices.length;
  const move = (n: number) =>
    setIndex((at + n + notices.length) % notices.length);
  return (
    <div
      className={`notice-carousel ${pinned ? "safety" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (
          !pinned &&
          Math.abs(e.changedTouches[0].clientX - touch.current) > 35
        )
          move(e.changedTouches[0].clientX < touch.current ? 1 : -1);
      }}
      aria-roledescription="輪播提醒"
    >
      {notices[at].logDate && onLog ? (
        <div className="grow">
          <button
            className="text-link"
            onClick={() => onLog(notices[at].logDate!)}
          >
            {notices[at].text} →
          </button>
          {!notices[at].safety && (
            <button
              className="text-link"
              onClick={() =>
                save("今天不再提醒", (s) => {
                  (s.dismissedNotices ??= {})[notices[at].logDate!] = date;
                })
              }
            >
              今天不再提醒
            </button>
          )}
        </div>
      ) : (
        <Link key={notices[at].text} href={notices[at].href}>
          {notices[at].text}
          <ChevronRight size={16} />
        </Link>
      )}
      {notices.length > 1 && !pinned && (
        <div>
          <button aria-label="上一則提醒" onClick={() => move(-1)}>
            <ChevronLeft size={16} />
          </button>
          <small>
            {at + 1} / {notices.length}
          </small>
          <button aria-label="下一則提醒" onClick={() => move(1)}>
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "播放提醒" : "暫停提醒"}
          >
            {paused ? "▶" : "Ⅱ"}
          </button>
        </div>
      )}
    </div>
  );
}
