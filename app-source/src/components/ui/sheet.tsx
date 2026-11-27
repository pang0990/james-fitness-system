"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Sheet({
  title,
  children,
  onClose,
  mode = "standard",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  mode?: "standard" | "nutrition-logger";
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement as HTMLElement;
    el?.showModal();
    return () => {
      el?.close();
      prev?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (mode !== "nutrition-logger") return;
    const viewport = window.visualViewport;
    const el = ref.current;
    if (!viewport || !el) return;
    const fit = () => {
      el.style.setProperty(
        "--nutrition-viewport-height",
        viewport.height + "px",
      );
      el.style.setProperty(
        "--nutrition-viewport-top",
        viewport.offsetTop + "px",
      );
    };
    fit();
    viewport.addEventListener("resize", fit);
    viewport.addEventListener("scroll", fit);
    return () => {
      viewport.removeEventListener("resize", fit);
      viewport.removeEventListener("scroll", fit);
    };
  }, [mode]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={
        mode === "nutrition-logger" ? "sheet sheet--nutrition-logger" : "sheet"
      }
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body">
        <header>
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="關閉">
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
