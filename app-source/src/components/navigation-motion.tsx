"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
export function navigateWithMotion(push: (href: string) => void, href: string) {
  if (
    typeof document === "undefined" ||
    !document.startViewTransition ||
    document.documentElement.dataset.reduceMotion === "true" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    push(href);
    return;
  }
  document.documentElement.dataset.transition = href.includes(
    "/training/session",
  )
    ? "immersive"
    : href.split("/").filter(Boolean).length > 1
      ? "detail"
      : "tab";
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
        push(href);
      }),
  );
  transition.ready.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  transition.finished
    .catch(() => {})
    .finally(() => delete document.documentElement.dataset.transition);
}
export function NavigationMotion() {
  const router = useRouter(),
    path = usePathname();
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
      );
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [router]);
  return null;
}
