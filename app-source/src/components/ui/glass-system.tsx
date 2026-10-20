"use client";

import Link from "next/link";
import {
  useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { UiProgressTrack } from "./design-system";

/**
 * Glass Design System 2.0. Visual primitives only — no access to fitness rules,
 * authentication or saved user data. Material is controlled by CSS tokens.
 */
export function GlassCard({
  children, className = "", raised = false, ...rest
}: HTMLAttributes<HTMLElement> & { children: ReactNode; raised?: boolean }) {
  return <section {...rest} data-glass-level={raised ? "raised" : "surface"}
    className={`jfs-glass-card ${className}`.trim()}>{children}</section>;
}

export function GlassButton({
  children, className = "", kind = "primary", busy = false, disabled, type = "button", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "quiet"; busy?: boolean;
}) {
  return <button
    type={type} disabled={disabled || busy} aria-busy={busy || undefined}
    className={`jfs-glass-button jfs-glass-button--${kind} ${className}`.trim()}
    {...rest}
  >{children}</button>;
}

export function GlassInput({
  label, id, className = "", ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <div className={`jfs-glass-field ${className}`.trim()}>
    <label htmlFor={inputId}>{label}</label>
    <input {...rest} id={inputId} className="jfs-glass-input" />
  </div>;
}

export function GlassProgress({
  value, target, label, className = "",
}: { value: number; target?: number | null; label: string; className?: string }) {
  return <div className={`jfs-glass-progress ${className}`.trim()}>
    <UiProgressTrack label={label} value={value} target={target}/>
  </div>;
}

export function GlassNavigation({
  options, value, onChange, label,
}: {
  options: ReadonlyArray<{ key: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return <div className="jfs-glass-segments" role="group" aria-label={label}>
    {options.map(option => <GlassButton key={option.key} kind="quiet"
      className={value === option.key ? "selected" : ""}
      aria-pressed={value === option.key}
      onClick={() => onChange(option.key)}>
      {option.label}
    </GlassButton>)}
  </div>;
}

/** Working accessible modal surface. Native app data remains with its caller. */
export function GlassSheet({
  title, children, onClose,
}: { title: string; children: ReactNode; onClose: () => void }) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? []).filter(el => el.getClientRects().length > 0);
      if (!focusables.length) { event.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(<div className="jfs-glass-sheet-layer" data-testid="glass-sheet">
    <div className="jfs-glass-sheet-backdrop" aria-hidden="true" onClick={onClose}/>
    <div className="jfs-glass-sheet" role="dialog" aria-modal="true"
      aria-labelledby={headingId} ref={dialogRef}>
      <div className="jfs-glass-sheet-handle" aria-hidden="true"/>
      <header className="jfs-glass-sheet-heading">
        <h2 id={headingId}>{title}</h2>
        <button type="button" className="jfs-glass-sheet-close" ref={closeRef}
          onClick={() => { if (!closing.current) { closing.current = true; onClose(); } }}
          aria-label="關閉視窗"><X size={20} aria-hidden="true"/></button>
      </header>
      <div className="jfs-glass-sheet-content">{children}</div>
    </div>
  </div>, document.body);
}

/** Link variant of primary navigation for portable UI demonstrations. */
export function GlassNavLink({href, children, active}:{
  href: string; children: ReactNode; active?: boolean;
}) {
  return <Link href={href} className={`jfs-glass-nav-link${active ? " active" : ""}`}
    aria-current={active ? "page" : undefined}>{children}</Link>;
}
