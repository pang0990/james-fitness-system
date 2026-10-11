"use client";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  AdditiveBlending,
  AnimationMixer,
  Color,
  Group,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  PointLight,
  ShaderMaterial,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export type CompanionState =
  | "idle"
  | "training"
  | "resting"
  | "drinking"
  | "reading"
  | "celebrating";

const labels: Record<CompanionState, string> = {
  idle: "Idle",
  training: "Training",
  resting: "Resting",
  drinking: "Drinking",
  reading: "Reading",
  celebrating: "Celebrating",
};

const clipHints: Record<CompanionState, string[]> = {
  idle: ["idle", "breath", "stand"],
  training: ["training", "workout", "lift", "exercise"],
  resting: ["resting", "rest", "sleep"],
  drinking: ["drinking", "drink"],
  reading: ["reading", "read"],
  celebrating: ["celebrating", "celebrate", "victory", "cheer"],
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

function ProceduralModel({
  state,
  reduced,
}: {
  state: CompanionState;
  reduced: boolean;
}) {
  const body = useRef<Group>(null);
  const face = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);

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
    <group ref={body}>
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
            <meshStandardMaterial color="#acb9bc" metalness={0.65} roughness={0.2} />
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

function GLTFModel({
  url,
  state,
  reduced,
}: {
  url: string;
  state: CompanionState;
  reduced: boolean;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new AnimationMixer(scene), [scene]);
  const root = useRef<Group>(null);

  useEffect(() => {
    if (!gltf.animations.length) return;
    mixer.stopAllAction();
    const hints = clipHints[state];
    const clip =
      gltf.animations.find((c) =>
        hints.some((h) => c.name.toLowerCase().includes(h)),
      ) ?? gltf.animations[0];
    const action = mixer.clipAction(clip);
    action.reset().fadeIn(0.22);
    if (state === "celebrating") {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(LoopRepeat, Infinity);
    }
    action.play();
    return () => {
      action.fadeOut(0.18);
    };
  }, [gltf.animations, mixer, state]);

  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);

  useFrame(({ pointer }, delta) => {
    if (!reduced) mixer.update(delta);
    if (!root.current || reduced) return;
    root.current.rotation.y = MathUtils.damp(
      root.current.rotation.y,
      pointer.x * 0.12,
      5,
      delta,
    );
    root.current.rotation.x = MathUtils.damp(
      root.current.rotation.x,
      -pointer.y * 0.03,
      5,
      delta,
    );
  });

  return (
    <group ref={root} position={[0, -0.75, 0]} scale={1.25}>
      <primitive object={scene} />
    </group>
  );
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float pulse = 0.56 + 0.26 * sin(uTime * 1.7 + vUv.x * 8.0);
  float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
  gl_FragColor = vec4(uColor, pulse * edge * 0.52);
}`;

function EnergyRing({ reduced }: { reduced: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current && !reduced)
      material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.765, 0]}>
      <ringGeometry args={[0.72, 0.78, 128, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new Color("#e0c783") },
        }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function Particles({ reduced }: { reduced: boolean }) {
  const points = useRef<Group>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      const a = i * 2.399;
      const radius = 0.8 + ((i * 37) % 100) / 45;
      data[i * 3] = Math.cos(a) * radius;
      data[i * 3 + 1] = -0.5 + ((i * 53) % 100) / 55;
      data[i * 3 + 2] = -1.4 + Math.sin(a) * radius;
    }
    return data;
  }, []);

  useFrame(({ clock }) => {
    if (points.current && !reduced)
      points.current.rotation.y = clock.elapsedTime * 0.025;
  });

  return (
    <group ref={points}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#c5a461"
          size={0.018}
          transparent
          opacity={0.24}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}

function Environment({ reduced }: { reduced: boolean }) {
  const light = useRef<PointLight>(null);
  useFrame(({ pointer }) => {
    if (light.current && !reduced) {
      light.current.position.x = pointer.x * 2.3;
      light.current.position.z = 2 + pointer.y * 0.8;
    }
  });
  return (
    <>
      <pointLight ref={light} position={[0, 2, 2]} color="#c5a461" intensity={4.2} />
      <pointLight position={[-3, 0, -2]} color="#6377c6" intensity={1.8} />
      <pointLight position={[3, 0, -2]} color="#775396" intensity={1.6} />
      <EnergyRing reduced={reduced} />
      <Particles reduced={reduced} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, 0]}>
        <circleGeometry args={[1.15, 64]} />
        <meshStandardMaterial
          color="#111113"
          metalness={0.75}
          roughness={0.3}
          transparent
          opacity={0.68}
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
  const gltfUrl = process.env.NEXT_PUBLIC_COMPANION_GLTF_URL || "";
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0.42, 3.7], fov: 39 }}
      frameloop={reduced ? "demand" : "always"}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 4, 5]} intensity={2.8} />
      <pointLight position={[-3, 1, -2]} color="#dfc794" intensity={9} />
      {gltfUrl ? (
        <GLTFModel url={gltfUrl} state={state} reduced={reduced} />
      ) : (
        <ProceduralModel state={state} reduced={reduced} />
      )}
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
  const [webgl, setWebgl] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    try {
      const c = document.createElement("canvas");
      const g = c.getContext("webgl2");
      setWebgl(Boolean(g));
      g?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {}
    return () => m.removeEventListener("change", update);
  }, []);

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