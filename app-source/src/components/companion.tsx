"use client";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Canvas, useFrame } from "@react-three/fiber";
import { Group, MathUtils, PointLight } from "three";
export type CompanionState =
  "idle" | "training" | "resting" | "drinking" | "reading" | "celebrating";
const labels: Record<CompanionState, string> = {
  idle: "Idle",
  training: "Training",
  resting: "Resting",
  drinking: "Drinking",
  reading: "Reading",
  celebrating: "Celebrating",
};
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function SVGRenderer({ state }: { state: CompanionState }) {
  return (
    <svg
      viewBox="0 0 220 200"
      className={`companion-fallback pet-${state}`}
      role="img"
      aria-label={labels[state]}
    >
      <ellipse cx="110" cy="180" rx="55" ry="8" fill="#c6aa7040" />
      <g className="pet-body">
        <rect x="73" y="85" width="74" height="78" rx="32" fill="#ddd7ca" />
        <rect x="57" y="28" width="106" height="78" rx="32" fill="#f4eee3" />
        <rect x="67" y="49" width="86" height="38" rx="18" fill="#25272a" />
        <circle cx="92" cy="68" r="5" fill="#d5b87c" />
        <circle cx="129" cy="68" r="5" fill="#d5b87c" />
        <path
          d="M85 164v12m50-12v12"
          stroke="#d5b87c"
          strokeWidth="15"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
function Model({
  state,
  reduced,
}: {
  state: CompanionState;
  reduced: boolean;
}) {
  const body = useRef<Group>(null),
    face = useRef<Group>(null),
    left = useRef<Group>(null),
    right = useRef<Group>(null);
  useFrame(({ clock, pointer }, delta) => {
    if (!body.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    if (face.current)
      face.current.scale.y =
        state === "resting" ? 0.2 : !reduced && t % 5.2 < 0.12 ? 0.12 : 1;
    const resting = state === "resting";
    body.current.position.y = reduced ? 0 : Math.sin(t * 1.6) * 0.04;
    body.current.rotation.y = MathUtils.damp(
      body.current.rotation.y,
      state === "reading"
        ? -0.15
        : resting
          ? 0.2
          : Math.sin(t * 0.35) * 0.08 + (reduced ? 0 : pointer.x * 0.15),
      6,
      delta,
    );
    body.current.rotation.z = MathUtils.damp(
      body.current.rotation.z,
      resting ? -0.18 : 0,
      5,
      delta,
    );
    if (left.current)
      left.current.rotation.z = MathUtils.damp(
        left.current.rotation.z,
        state === "celebrating"
          ? 1.8
          : state === "reading"
            ? 0.65
            : state === "training"
              ? 0.7 + Math.sin(t * 3) * 0.5
              : 0.12,
        8,
        delta,
      );
    if (right.current)
      right.current.rotation.z = MathUtils.damp(
        right.current.rotation.z,
        state === "drinking"
          ? -1.7
          : state === "celebrating"
            ? -1.8
            : state === "training"
              ? -0.7 - Math.sin(t * 3) * 0.5
              : state === "reading"
                ? -0.65
                : -0.12,
        8,
        delta,
      );
  });
  const orb = (
    position: [number, number, number],
    scale: [number, number, number],
    color: string,
  ) => (
    <mesh position={position} scale={scale} castShadow>
      <sphereGeometry args={[1, 32, 24]} />
      <meshStandardMaterial color={color} metalness={0.25} roughness={0.28} />
    </mesh>
  );
  return (
    <group ref={body} position={[0, 0, 0]}>
      {orb([0, 0.65, 0], [0.55, 0.48, 0.43], "#eee8dc")}
      {orb([0, -0.05, 0], [0.4, 0.51, 0.3], "#d7d2c7")}
      {orb([0, 0.67, 0.35], [0.44, 0.22, 0.11], "#24262a")}
      <group ref={face}>
        {[-1, 1].map((n) => (
          <group key={n}>
            {orb(
              [n * 0.17, 0.69, 0.453],
              [0.045, state === "resting" ? 0.009 : 0.055, 0.025],
              "#dabc79",
            )}
          </group>
        ))}
      </group>
      {[-1, 1].map((n) => (
        <group key={n}>
          {orb([n * 0.22, -0.6, 0.1], [0.18, 0.14, 0.27], "#b99a5d")}
        </group>
      ))}
      <group ref={left} position={[-0.4, 0.1, 0]}>
        {orb([-0.12, -0.15, 0], [0.15, 0.3, 0.15], "#e5dfd2")}
      </group>
      <group ref={right} position={[0.4, 0.1, 0]}>
        {orb([0.12, -0.15, 0], [0.15, 0.3, 0.15], "#e5dfd2")}
        {state === "drinking" && (
          <mesh position={[0.15, -0.38, 0.08]}>
            <cylinderGeometry args={[0.09, 0.09, 0.3, 20]} />
            <meshStandardMaterial
              color="#acb9bc"
              metalness={0.65}
              roughness={0.2}
            />
          </mesh>
        )}
      </group>
      {state === "reading" && (
        <mesh position={[0, -0.12, 0.4]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.52, 0.34, 0.06]} />
          <meshStandardMaterial color="#b99a5d" />
        </mesh>
      )}
      {state === "training" && (
        <mesh position={[0.65, -0.17, 0.15]}>
          <boxGeometry args={[0.42, 0.12, 0.12]} />
          <meshStandardMaterial color="#b99a5d" />
        </mesh>
      )}
      <mesh position={[0, 0.17, 0.287]}>
        <torusGeometry args={[0.085, 0.015, 12, 32]} />
        <meshStandardMaterial color="#b99a5d" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}
function Environment({ reduced }: { reduced: boolean }) {
  const light = useRef<PointLight>(null);
  useFrame(({ pointer }) => {
    if (light.current && !reduced) {
      light.current.position.x = pointer.x * 2;
      light.current.position.z = 2 + pointer.y;
    }
  });
  return (
    <>
      <pointLight
        ref={light}
        position={[0, 2, 2]}
        color="#c5a461"
        intensity={4}
      />
      <pointLight position={[-3, 0, -2]} color="#6377c6" intensity={2} />
      <pointLight position={[3, 0, -2]} color="#775396" intensity={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.77, 0]}>
        <ringGeometry args={[0.7, 0.715, 96]} />
        <meshBasicMaterial color="#c5a461" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, 0]}>
        <circleGeometry args={[1.1, 64]} />
        <meshStandardMaterial
          color="#111113"
          metalness={0.7}
          roughness={0.35}
          transparent
          opacity={0.65}
        />
      </mesh>
    </>
  );
}
export function ThreeRenderer({
  state,
  reduced,
}: {
  state: CompanionState;
  reduced: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.45, 3.6], fov: 40 }}
      frameloop={reduced ? "demand" : "always"}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 4, 5]} intensity={3} />
      <pointLight position={[-3, 1, -2]} color="#dfc794" intensity={12} />
      <Model state={state} reduced={reduced} />
      <Environment reduced={reduced} />
    </Canvas>
  );
}
export function Companion({
  state,
  onTap,
}: {
  state: CompanionState;
  onTap: () => void;
}) {
  const { state: appState } = useStore();
  const [webgl, setWebgl] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    try {
      const c = document.createElement("canvas");
      const g = c.getContext("webgl2");
      setWebgl(!!g);
      g?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {}
    return () => m.removeEventListener("change", update);
  }, []);
  if (appState.appearance?.showCompanion === false) return null;
  const fallback = <SVGRenderer state={state} />;
  return (
    <button
      className="companion-three"
      onClick={onTap}
      aria-label={`電子寵物：${labels[state]}`}
    >
      <Boundary fallback={fallback}>
        {webgl ? <ThreeRenderer state={state} reduced={reduced} /> : fallback}
      </Boundary>
      <span>{labels[state]}</span>
    </button>
  );
}
