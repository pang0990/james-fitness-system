"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { resolveDay } from "@/lib/domain";
export function NoticeCarousel({ date }: { date: string }) {
  const { state } = useStore();
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false);
  const touch = useRef(0);
  const current = state.sessions.find((s) => s.status === "in_progress");
  const notices = [
    ...(!state.profile?.eligible && state.profile
      ? [{ text: "請先確認個人適用狀態", href: "/profile", safety: true }]
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
            href: "/progress/recommendations",
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
    ...(!state.recoveries.some((r) => r.date === date)
      ? [
          {
            text: "記錄今天的睡眠與恢復",
            href: "/progress/recovery",
            safety: false,
          },
        ]
      : []),
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
      <Link key={notices[at].text} href={notices[at].href}>
        {notices[at].text}
        <ChevronRight size={16} />
      </Link>
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
