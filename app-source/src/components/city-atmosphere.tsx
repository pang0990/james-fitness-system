"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

type Drop = {
  x: number; y: number; length: number; speed: number; alpha: number; near: boolean;
};
type Fog = { x: number; y: number; radius: number; speed: number; phase: number };

const wrap = (value: number, range: number) => ((value % range) + range) % range;

/** Stable scenery: random motion only affects rain and diffuse fog, not the city art. */
function makeRandom(seed: number) {
  let n = seed >>> 0;
  return () => ((n = (Math.imul(1664525, n) + 1013904223) >>> 0) / 4294967296);
}

/**
 * Atmospheric overlay for existing Today artwork. Do not draw extra buildings,
 * signs, flying vehicles, or pavement reflections: the background already
 * contains these, and a second layer creates visible double images.
 *
 * Decorative canvas cannot intercept any UI interaction. Offscreen, hidden,
 * data-saving, and reduced-motion states stop rendering completely.
 */
export function CityAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state } = useStore();
  const enabled = state.preferences?.cityAnimation !== false &&
    state.preferences?.reduceMotion !== true;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & {
      connection?: { saveData?: boolean };
    }).connection?.saveData === true;
    if (saveData) return;

    const compact = window.matchMedia("(max-width: 560px)").matches;
    const limitedCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
    const lightweight = compact || limitedCpu;
    const fps = lightweight ? 24 : 30;
    const frameInterval = 1000 / fps;
    const random = makeRandom(20771);

    const drops: Drop[] = Array.from({ length: lightweight ? 62 : 96 }, () => ({
      x: random(), y: random(), length: 9 + random() * 20,
      speed: 0.15 + random() * 0.29,
      alpha: 0.045 + random() * 0.14, near: random() > 0.76,
    }));
    const fog: Fog[] = Array.from({ length: lightweight ? 2 : 4 }, () => ({
      x: random() * 1.4 - 0.2,
      y: 0.3 + random() * 0.48,
      radius: 0.15 + random() * 0.16,
      speed: 0.001 + random() * 0.0014,
      phase: random() * Math.PI * 2,
    }));

    let width = 1, height = 1, ratio = 1;
    let frame = 0, last = 0, elapsed = 0;
    let active = false, visible = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      ratio = Math.min(window.devicePixelRatio || 1, lightweight ? 1.25 : 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const paint = (dt: number) => {
      ctx.clearRect(0, 0, width, height);

      // Very thin rain, in front of the art but behind all interface elements.
      ctx.save();
      ctx.lineCap = "round";
      for (const drop of drops) {
        drop.y += drop.speed * dt;
        drop.x += (drop.near ? 0.022 : 0.01) * dt;
        if (drop.y > 1.05) { drop.y = -0.05; drop.x = random(); }
        if (drop.x > 1.04) drop.x = -0.04;
        const x = drop.x * width, y = drop.y * height;
        const length = drop.length * height / 850 * (drop.near ? 1.1 : 0.7);
        ctx.strokeStyle = drop.x > 0.72 ? "#b5cde3" : "#c3c8d4";
        ctx.globalAlpha = drop.alpha * (drop.near ? 0.88 : 0.58);
        ctx.lineWidth = drop.near ? 1 : 0.65;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - length * 0.13, y + length);
        ctx.stroke();
      }
      ctx.restore();

      // Diffuse low-opacity city haze. Never animate the image or warrior.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const cloud of fog) {
        const x = (wrap(cloud.x + elapsed * cloud.speed + 0.2, 1.55) - 0.2) * width;
        const y = (cloud.y + 0.009 * Math.sin(elapsed * 0.22 + cloud.phase)) * height;
        const radius = cloud.radius * width;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(115,134,164,0.12)");
        gradient.addColorStop(0.5, "rgba(72,92,128,0.05)");
        gradient.addColorStop(1, "rgba(55,72,102,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const tick = (now: number) => {
      if (!active) return;
      frame = requestAnimationFrame(tick);
      if (now - last < frameInterval) return;
      const dt = Math.min((now - last) / 1000 || 0, 0.08);
      last = now;
      elapsed += dt;
      paint(dt);
    };
    const update = () => {
      const shouldPlay = visible && !document.hidden && !reduceMotion.matches;
      if (active === shouldPlay) return;
      active = shouldPlay;
      if (active) { last = performance.now(); frame = requestAnimationFrame(tick); }
      else { cancelAnimationFrame(frame); frame = 0; ctx.clearRect(0, 0, width, height); }
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting === true;
      update();
    }, { threshold: 0.05 });
    const dimensions = new ResizeObserver(resize);
    resize();
    dimensions.observe(canvas);
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", update);
    reduceMotion.addEventListener("change", update);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      dimensions.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduceMotion.removeEventListener("change", update);
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className="jfs-city-atmosphere" aria-hidden="true" />;
}
