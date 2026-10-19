"use client";

import Link from "next/link";
import { Activity, Dumbbell, Home, Utensils, type LucideIcon } from "lucide-react";

export const primaryNavigation: ReadonlyArray<{
  path: "today" | "nutrition" | "training" | "progress";
  label: string;
  zh: string;
  icon: LucideIcon;
}> = [
  { path: "today", label: "Today", zh: "今日", icon: Home },
  { path: "nutrition", label: "Nutrition", zh: "飲食", icon: Utensils },
  { path: "training", label: "Training", zh: "訓練", icon: Dumbbell },
  { path: "progress", label: "Progress", zh: "進度", icon: Activity },
];

export function AppSidebar({ section }: { section: string }) {
  return (
    <aside className="sidebar" aria-label="主要導覽側欄">
      <Link href="/today" className="brand" aria-label="James Fitness System，返回 Today">
        <div className="brand-mark" aria-hidden="true">J</div>
        <div>
          <strong>JAMES</strong>
          <small>FITNESS SYSTEM</small>
        </div>
      </Link>
      <nav aria-label="桌面主導覽">
        {primaryNavigation.map(({ path, label, icon: Icon }) => (
          <Link
            className={`nav-item ${section === path ? "active" : ""}`}
            href={"/" + path}
            key={path}
            aria-label={label}
            aria-current={section === path ? "page" : undefined}
            title={label}
          >
            <Icon size={17} aria-hidden="true" />
            <span className="rail-label">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function AppBottomNavigation({ section }: { section: string }) {
  return (
    <nav className="bottom-nav" aria-label="手機主導覽">
      {primaryNavigation.map(({ path, label, icon: Icon }) => (
        <Link
          key={path}
          href={"/" + path}
          className={section === path ? "active" : ""}
          aria-current={section === path ? "page" : undefined}
        >
          <Icon size={20} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
