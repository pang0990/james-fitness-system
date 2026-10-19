"use client";

import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  level?: "flat" | "card" | "raised";
};
export function UiSurface({ children, level = "card", className = "", ...rest }: SurfaceProps) {
  return (
    <section className={`jfs-ui-surface jfs-ui-surface--${level} ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
}

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  tone?: "primary" | "secondary" | "quiet";
  children: ReactNode;
};
export function UiButton({
  tone = "secondary", loading = false, disabled = false, className = "",
  children, type = "button", ...props
}: ActionProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`jfs-ui-action jfs-ui-action--${tone} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function UiActionLink({
  href, children, tone = "primary", className = "", ariaLabel,
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "secondary" | "quiet";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link href={href}
      aria-label={ariaLabel}
      className={`jfs-ui-action jfs-ui-action--${tone} ${className}`.trim()}>
      {children}
    </Link>
  );
}

export function UiSectionHeading({
  title, icon: Icon, action, id, className = "",
}: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`jfs-ui-section-heading ${className}`.trim()}>
      <h2 id={id}>{Icon && <Icon size={17} aria-hidden="true" />}{title}</h2>
      {action}
    </div>
  );
}

export function UiProgressTrack({
  value, target, label, className = "",
}: {
  value: number;
  target?: number | null;
  label: string;
  className?: string;
}) {
  const hasTarget = typeof target === "number" && target > 0;
  const percent = hasTarget ? Math.min(100, Math.max(0, value / target * 100)) : 0;
  return (
    <div
      className={`jfs-ui-progress ${className}`.trim()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={hasTarget ? target : undefined}
      aria-valuenow={hasTarget ? Math.min(target, Math.max(0, value)) : undefined}
      aria-valuetext={hasTarget ? `${value} / ${target}` : `${value}，目標未設定`}
      data-target-set={hasTarget ? "true" : "false"}
    >
      <span style={{ width: percent + "%" }} />
    </div>
  );
}

export function UiEmptyState({
  title, description, action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="jfs-ui-empty" role="status">
      <strong>{title}</strong>
      <p>{description}</p>
      {action && <div className="jfs-ui-empty-action">{action}</div>}
    </div>
  );
}
