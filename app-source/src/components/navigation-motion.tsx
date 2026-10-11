"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const tabs = ["today", "nutrition", "training", "progress"];

function sectionOf(pathname: string) {
  return pathname.split("/").filter(Boolean).at(-1) === "james-fitness-system"
    ? ""
    : pathname.split("/").filter(Boolean).at(-1) ?? "";
}

function rootSection(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const baseIndex = parts.indexOf("james-fitness-system");
  return parts[baseIndex >= 0 ? baseIndex + 1 : 0] ?? "";
}

function transitionKind(from: string, to: string) {
  if (to.includes("/training/session")) return "immersive";
  const fromParts = from.split("/").filter(Boolean);
  const toParts = to.split("/").filter(Boolean);
  if (fromParts.length !== toParts.length || toParts.length > 2) return "detail";
  return rootSection(from) === rootSection(to) ? "detail" : "tab";
}

function direction(from: string, to: string) {
  const a = tabs.indexOf(rootSection(from));
  const b = tabs.indexOf(rootSection(to));
  if (a >= 0 && b >= 0 && a !== b) return b > a ? "forward" : "back";
  return "forward";
}

export function navigateWithMotion(
  push: (href: string) => void,
  href: string,
  fromPath?: string,
) {
  if (typeof document === "undefined") {
    push(href);
    return;
  }

  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const from = fromPath || location.pathname.slice(base.length) || "/";
  const to = href.startsWith("/") ? href : "/" + href;

  if (
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    push(to);
    return;
  }

  document.documentElement.dataset.transition = transitionKind(from, to);
  document.documentElement.dataset.direction = direction(from, to);
  document.documentElement.dataset.fromSection = rootSection(from);
  document.documentElement.dataset.toSection = rootSection(to);

  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout>;
        const done = () => {
          clearTimeout(timer);
          window.removeEventListener("james-route-ready", done);
          resolve();
        };
        window.addEventListener("james-route-ready", done, { once: true });
        timer = setTimeout(done, 1200);
        push(to);
      }),
  );

  transition.ready.catch(() => undefined);
  transition.updateCallbackDone.catch(() => undefined);
  transition.finished
    .catch(() => undefined)
    .finally(() => {
      delete document.documentElement.dataset.transition;
      delete document.documentElement.dataset.direction;
      delete document.documentElement.dataset.fromSection;
      delete document.documentElement.dataset.toSection;
    });
}

export function NavigationMotion() {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    window.dispatchEvent(new Event("james-route-ready"));
  }, [path]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;

      const a = (e.target as Element).closest("a");
      if (!a || a.target || a.hasAttribute("download")) return;

      const url = new URL(a.href);
      if (url.origin !== location.origin || url.pathname === location.pathname)
        return;

      const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
      if (!url.pathname.startsWith(base + "/")) return;

      e.preventDefault();
      navigateWithMotion(
        router.push,
        url.pathname.slice(base.length) + url.search + url.hash,
        path,
      );
    };

    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [router, path]);

  return null;
}
