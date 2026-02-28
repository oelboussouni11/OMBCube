"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import Link from "next/link";
import Image from "next/image";
import {
  CubeState,
  FaceColor,
  createSolvedCube,
  applyMove,
  applyMoves,
} from "@/lib/cubeState";

const COLOR_MAP: Record<string, string> = {
  W: "#f5f5f5",
  Y: "#fdd835",
  R: "#d32f2f",
  O: "#fb8c00",
  B: "#1565c0",
  G: "#2e7d32",
};

/* ── Mini 3D Cube for algorithm demos ── */

function Sticker({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}) {
  return (
    <RoundedBox
      args={[0.74, 0.74, 0.02]}
      radius={0.08}
      smoothness={4}
      position={position}
      rotation={rotation}
    >
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.0} />
    </RoundedBox>
  );
}

function Cubie({
  position,
  faces,
}: {
  position: [number, number, number];
  faces: Record<string, string | undefined>;
}) {
  const s = 0.48;
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color="#1c1c1c"
          roughness={0.85}
          metalness={0.1}
        />
      </RoundedBox>
      {faces.right && (
        <Sticker
          position={[s, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          color={faces.right}
        />
      )}
      {faces.left && (
        <Sticker
          position={[-s, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          color={faces.left}
        />
      )}
      {faces.top && (
        <Sticker
          position={[0, s, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          color={faces.top}
        />
      )}
      {faces.bottom && (
        <Sticker
          position={[0, -s, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color={faces.bottom}
        />
      )}
      {faces.front && (
        <Sticker
          position={[0, 0, s]}
          rotation={[0, 0, 0]}
          color={faces.front}
        />
      )}
      {faces.back && (
        <Sticker
          position={[0, 0, -s]}
          rotation={[0, Math.PI, 0]}
          color={faces.back}
        />
      )}
    </group>
  );
}

function getCubieFaces(x: number, y: number, z: number, state: CubeState) {
  const faces: Record<string, string> = {};
  if (x === 1) {
    const row = 1 - y,
      col = 1 - z;
    faces.right = COLOR_MAP[state.R[row * 3 + col]];
  }
  if (x === -1) {
    const row = 1 - y,
      col = z + 1;
    faces.left = COLOR_MAP[state.L[row * 3 + col]];
  }
  if (y === 1) {
    const row = z + 1,
      col = x + 1;
    faces.top = COLOR_MAP[state.U[row * 3 + col]];
  }
  if (y === -1) {
    const row = 1 - z,
      col = x + 1;
    faces.bottom = COLOR_MAP[state.D[row * 3 + col]];
  }
  if (z === 1) {
    const row = 1 - y,
      col = x + 1;
    faces.front = COLOR_MAP[state.F[row * 3 + col]];
  }
  if (z === -1) {
    const row = 1 - y,
      col = 1 - x;
    faces.back = COLOR_MAP[state.B[row * 3 + col]];
  }
  return faces;
}

function MiniCube({ state }: { state: CubeState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current)
      ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.15) * 0.04;
  });

  const cubies = useMemo(() => {
    const arr = [];
    const gap = 1.005;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          arr.push(
            <Cubie
              key={`${x}${y}${z}`}
              position={[x * gap, y * gap, z * gap]}
              faces={getCubieFaces(x, y, z, state)}
            />,
          );
        }
    return arr;
  }, [state]);

  return <group ref={ref}>{cubies}</group>;
}

function MiniCubeScene({ state }: { state: CubeState }) {
  return (
    <Canvas
      camera={{ position: [6, 4.5, 6], fov: 28 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.85,
      }}
      dpr={[1, 2]}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[30, 40, 30]}
        intensity={0.6}
        color="#ffffff"
      />
      <directionalLight
        position={[-30, 20, -20]}
        intensity={0.3}
        color="#c0ccdd"
      />
      <MiniCube state={state} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.6}
      />
      <Environment preset="studio" backgroundBlurriness={1} />
    </Canvas>
  );
}

/* ── Algorithm Visualizer ── */

function AlgorithmVisualizer({
  moves,
  setupMoves,
  label,
}: {
  moves: string;
  setupMoves?: string;
  label?: string;
}) {
  const moveList = moves.split(" ").filter(Boolean);
  const setupList = setupMoves ? setupMoves.split(" ").filter(Boolean) : [];

  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build state: apply setup + moves up to current step
  const cubeState = useMemo(() => {
    let state = createSolvedCube();
    state = applyMoves(state, setupList);
    for (let i = 0; i <= step; i++) {
      if (i < moveList.length) state = applyMove(state, moveList[i]);
    }
    return state;
  }, [step, moveList, setupList]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPlaying(false);
    setStep(-1);
  }, []);

  const play = useCallback(() => {
    if (playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    let s = step;
    intervalRef.current = setInterval(() => {
      s++;
      if (s >= moveList.length) {
        clearInterval(intervalRef.current!);
        setPlaying(false);
        return;
      }
      setStep(s);
    }, 500);
  }, [playing, step, moveList.length]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isDone = step >= moveList.length - 1;

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      {label && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-white/40 text-[10px] uppercase tracking-wider font-semibold">
            {label}
          </span>
        </div>
      )}
      <div className="h-48 relative">
        <MiniCubeScene state={cubeState} />
      </div>
      <div className="px-4 pb-3 space-y-2">
        {/* Move tags */}
        <div className="flex flex-wrap gap-1">
          {moveList.map((m, i) => (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                i <= step
                  ? "bg-green-500/20 text-green-300"
                  : i === step + 1
                    ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30"
                    : "bg-white/[0.04] text-white/30"
              }`}
            >
              {m}
            </span>
          ))}
        </div>
        {/* Controls */}
        <div className="flex gap-1.5">
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-[10px] hover:text-white/60 transition-all"
          >
            Reset
          </button>
          <button
            onClick={() => {
              if (step < moveList.length - 1) setStep(step + 1);
            }}
            disabled={playing || isDone}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-[10px] hover:text-white/60 transition-all disabled:opacity-30"
          >
            Step
          </button>
          <button
            onClick={play}
            disabled={isDone}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${playing ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300" : "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300"} disabled:opacity-30`}
          >
            {playing ? "Pause" : "Play"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step Card ── */

function StepCard({
  number,
  title,
  description,
  algorithm,
  setupMoves,
  tips,
}: {
  number: number;
  title: string;
  description: string;
  algorithm?: string;
  setupMoves?: string;
  tips?: string[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-8 border-b border-white/[0.04]">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {number}
          </div>
          <h3 className="text-white text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-white/50 text-sm leading-relaxed mb-4">
          {description}
        </p>
        {algorithm && (
          <div className="inline-block px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-white/30 text-[10px] uppercase tracking-wider">
              Algorithm
            </span>
            <p className="text-indigo-300 font-mono font-bold text-sm mt-0.5">
              {algorithm}
            </p>
          </div>
        )}
        {tips && tips.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-indigo-400 text-xs mt-0.5">•</span>
                <span className="text-white/40 text-xs leading-relaxed">
                  {tip}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {algorithm && (
        <div>
          <AlgorithmVisualizer
            moves={algorithm}
            setupMoves={setupMoves}
            label="Try it"
          />
        </div>
      )}
    </div>
  );
}

/* ── Main Content Data ── */

const BEGINNER_STEPS = [
  {
    title: "White Cross",
    description:
      "Start by making a white cross on the top face. The edge pieces must also match the center colors of the adjacent sides. Hold the cube with white center on top and find white edge pieces to bring them up.",
    algorithm: "F U R U' R' F'",
    setupMoves: "F R U R' U' F'",
    tips: [
      "Find white edges and move them to the top",
      "Match the other color of each edge with the side center",
      "If an edge is flipped, use F U R U' R' F' to fix it",
    ],
  },
  {
    title: "White Corners",
    description:
      "Place the four white corner pieces to complete the first layer. Find each white corner piece and position it below where it needs to go, then use the algorithm to insert it.",
    algorithm: "R' D' R D",
    setupMoves: "D' R' D R",
    tips: [
      "Hold the cube with white on top",
      "Find a white corner in the bottom layer",
      "Position it directly below its target spot",
      "Repeat R' D' R D until the corner is solved (up to 5 times)",
    ],
  },
  {
    title: "Second Layer Edges",
    description:
      "Solve the middle layer by inserting edge pieces that don't have yellow. Move each edge from the top layer into its correct position in the middle layer.",
    algorithm: "U R U' R' U' F' U F",
    setupMoves: "F' U' F U R U R' U'",
    tips: [
      "Hold the cube with yellow center on top now",
      "Find an edge in the top layer that has no yellow",
      "Match its front color to the center, then use the algorithm",
      "For right-side insertion: U R U' R' U' F' U F",
      "For left-side insertion: U' L' U L U F U' F'",
    ],
  },
  {
    title: "Yellow Cross",
    description:
      "Make a yellow cross on the top face (yellow on top). You may see a dot, an L-shape, or a line — each needs a different number of algorithm applications.",
    algorithm: "F R U R' U' F'",
    setupMoves: "F U R U' R' F'",
    tips: [
      "Dot → apply once to get L, again to get line, again to get cross",
      "L-shape → hold it at top-left, apply algorithm",
      "Line → hold it horizontal, apply algorithm",
      "This only orients the yellow — edges may not match sides yet",
    ],
  },
  {
    title: "Yellow Edges",
    description:
      "Position the yellow cross edges so they match the center colors of each side. You may need to apply the algorithm once or twice.",
    algorithm: "R U R' U R U2 R'",
    setupMoves: "R U2 R' U' R U' R'",
    tips: [
      "Turn the top layer until at least 2 edges match their centers",
      "If 2 adjacent edges match: hold solved edges at back and right",
      "If 2 opposite edges match: apply once to get adjacent, then repeat",
    ],
  },
  {
    title: "Position Yellow Corners",
    description:
      "Move the yellow corners to their correct positions (colors may still be wrong). Find corners that are already in the right position and use the algorithm to cycle the others.",
    algorithm: "U R U' L' U R' U' L",
    setupMoves: "L' U R U' L U R' U'",
    tips: [
      "A corner is 'correct' if its 3 colors match the 3 adjacent centers",
      "If no corners are correct: apply from any angle",
      "If 1 corner is correct: hold it at front-right, then apply",
    ],
  },
  {
    title: "Orient Yellow Corners",
    description:
      "The final step! Twist each corner so yellow faces up. Hold the cube still and only use R' D' R D, cycling through corners with U moves.",
    algorithm: "R' D' R D R' D' R D",
    setupMoves: "D' R' D R D' R' D R",
    tips: [
      "Hold the unsolved corner at front-right",
      "Apply R' D' R D until that corner's yellow faces up",
      "Turn ONLY the top layer (U) to bring the next unsolved corner to front-right",
      "NEVER rotate the whole cube during this step!",
      "The cube will look scrambled mid-process — this is normal, trust it",
    ],
  },
];

const CFOP_STEPS = [
  {
    title: "Cross",
    description:
      "Solve the white cross on the bottom face in under 8 moves. Plan the entire cross during inspection. Advanced solvers do this in 5-6 moves by planning all 4 edges simultaneously.",
    algorithm: "R' D' F D",
    tips: [
      "Plan all 4 edges during inspection (15 seconds)",
      "Solve cross on the BOTTOM (not top) — saves a rotation later",
      "Practice until you can solve cross in under 2 seconds",
    ],
  },
  {
    title: "F2L — First Two Layers",
    description:
      "Solve the first two layers simultaneously by pairing corner + edge pieces and inserting them together. There are 42 cases but they all follow intuitive patterns once you understand the basic insert.",
    algorithm: "U R U' R'",
    setupMoves: "R U R' U'",
    tips: [
      "Basic case: pair corner + edge in top layer, then insert",
      "Learn the 4 basic inserts first, then build intuition",
      "If a pair is already in the slot but wrong → take it out first",
      "Average F2L: 28 moves across 4 slots",
    ],
  },
  {
    title: "OLL — Orient Last Layer",
    description:
      "Orient all pieces on the last layer so yellow faces up. There are 57 OLL algorithms. Start with 2-look OLL (just 9 algorithms) to orient edges first, then corners.",
    algorithm: "R U2 R' U' R U' R'",
    setupMoves: "R U R' U R U2 R'",
    tips: [
      "2-Look OLL: first orient edges (3 algs), then corners (7 algs)",
      "Full OLL: 57 algorithms to do it in one step",
      "Most common: Sune (R U R' U R U2 R') and Anti-Sune",
    ],
  },
  {
    title: "PLL — Permute Last Layer",
    description:
      "Permute all last layer pieces to their correct positions. There are 21 PLL algorithms. Start with 2-look PLL (6 algorithms) to permute corners first, then edges.",
    algorithm: "R U' R U R U R U' R' U' R2",
    setupMoves: "R2 U R U R' U' R' U' R' U R'",
    tips: [
      "2-Look PLL: permute corners (2 algs) then edges (4 algs)",
      "Full PLL: 21 algorithms to do it in one step",
      "T-perm and Y-perm are the most useful to learn first",
      "Advanced: learn AUF (adjustment of U face) for each case",
    ],
  },
];

/* ── Page ── */

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<"beginner" | "cfop" | "notation">(
    "beginner",
  );

  return (
    <div className="min-h-screen bg-[#08080f]">
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <nav className="relative z-50 border-b border-white/[0.06]">
        <div className="backdrop-blur-xl bg-[#08080f]/70">
          <div className="flex items-center justify-between px-8 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <span className="text-white text-lg font-semibold tracking-tight">
                OMBCube
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/solve"
                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.04] text-sm transition-all duration-300"
              >
                Solve
              </Link>
              <Link
                href="/learn"
                className="px-4 py-2 rounded-xl text-white bg-white/[0.06] text-sm"
              >
                Learn
              </Link>
              <Link
                href="/timer"
                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.04] text-sm transition-all duration-300"
              >
                Timer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Learn to Solve</h1>
          <p className="text-white/40 text-sm max-w-lg mx-auto">
            From complete beginner to advanced speedcuber. Each step includes
            interactive 3D visualizations you can play, pause, and step through.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 mb-10 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] w-fit mx-auto">
          {[
            { id: "beginner" as const, label: "Beginner", icon: "🟢" },
            { id: "cfop" as const, label: "CFOP", icon: "🔴" },
            { id: "notation" as const, label: "Notation", icon: "📖" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-white/[0.08] text-white shadow-lg"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Beginner Tab */}
        {activeTab === "beginner" && (
          <div>
            <div className="mb-8 px-5 py-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/10">
              <h2 className="text-green-300 font-semibold text-sm mb-1">
                Layer-by-Layer Method
              </h2>
              <p className="text-white/40 text-xs">
                The classic beginner method. Solve the cube in 7 steps, one
                layer at a time. Each step builds on the previous one. Estimated
                learning time: 1-2 hours.
              </p>
            </div>

            {BEGINNER_STEPS.map((step, i) => (
              <StepCard key={i} number={i + 1} {...step} />
            ))}

            <div className="mt-8 text-center">
              <p className="text-white/30 text-sm mb-3">
                Ready for more speed?
              </p>
              <button
                onClick={() => setActiveTab("cfop")}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/20 text-red-300 text-sm font-medium hover:shadow-lg transition-all"
              >
                Learn CFOP →
              </button>
            </div>
          </div>
        )}

        {/* CFOP Tab */}
        {activeTab === "cfop" && (
          <div>
            <div className="mb-8 px-5 py-4 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/10">
              <h2 className="text-red-300 font-semibold text-sm mb-1">
                CFOP Method (Fridrich)
              </h2>
              <p className="text-white/40 text-xs">
                The most popular speedcubing method, used by most world record
                holders. Cross → F2L → OLL → PLL. Mastering full CFOP requires
                learning ~78 algorithms but starts with just a few.
              </p>
            </div>

            {/* Difficulty progression */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                {
                  level: "2-Look",
                  algs: "~15 algs",
                  time: "Sub-45s",
                  color: "yellow",
                },
                {
                  level: "Full OLL",
                  algs: "~57 algs",
                  time: "Sub-25s",
                  color: "orange",
                },
                {
                  level: "Full PLL",
                  algs: "~78 algs",
                  time: "Sub-15s",
                  color: "red",
                },
              ].map((l) => (
                <div
                  key={l.level}
                  className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center"
                >
                  <p
                    className={`font-semibold text-sm ${l.color === "yellow" ? "text-yellow-300" : l.color === "orange" ? "text-orange-300" : "text-red-300"}`}
                  >
                    {l.level}
                  </p>
                  <p className="text-white/30 text-[10px] mt-0.5">
                    {l.algs} · {l.time}
                  </p>
                </div>
              ))}
            </div>

            {CFOP_STEPS.map((step, i) => (
              <StepCard key={i} number={i + 1} {...step} />
            ))}
          </div>
        )}

        {/* Notation Tab */}
        {activeTab === "notation" && (
          <div>
            <div className="mb-8 px-5 py-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/10">
              <h2 className="text-blue-300 font-semibold text-sm mb-1">
                Move Notation
              </h2>
              <p className="text-white/40 text-xs">
                Standard Rubik&apos;s Cube notation used worldwide. Master this
                first before learning any algorithms.
              </p>
            </div>

            {/* Notation image */}
            <div className="rounded-2xl overflow-hidden bg-white mb-8">
              <Image
                src={`${process.env.NODE_ENV === "production" ? "/OMBCube" : ""}/notation-guide.png`}
                alt="Rubik's Cube Move Notation"
                width={810}
                height={637}
                className="w-full h-auto"
              />
            </div>

            {/* Explanation grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-white font-semibold text-sm mb-2">
                  Clockwise (90°)
                </h3>
                <p className="text-white/40 text-xs mb-3">
                  A single letter means turn that face 90° clockwise (when
                  looking at it directly).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["R", "L", "U", "D", "F", "B"].map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 rounded-md bg-indigo-500/15 text-indigo-300 text-xs font-mono font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-white font-semibold text-sm mb-2">
                  Counter-clockwise (90°)
                </h3>
                <p className="text-white/40 text-xs mb-3">
                  An apostrophe (prime) means turn that face 90°
                  counter-clockwise.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["R'", "L'", "U'", "D'", "F'", "B'"].map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 rounded-md bg-orange-500/15 text-orange-300 text-xs font-mono font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h3 className="text-white font-semibold text-sm mb-2">
                  Double Turn (180°)
                </h3>
                <p className="text-white/40 text-xs mb-3">
                  A number 2 means turn that face 180° (direction doesn&apos;t
                  matter).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["R2", "L2", "U2", "D2", "F2", "B2"].map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 rounded-md bg-green-500/15 text-green-300 text-xs font-mono font-bold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Face colors */}
            <div className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <h3 className="text-white font-semibold text-sm mb-3">
                The 6 Faces
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { letter: "R", name: "Right", color: "#d32f2f" },
                  { letter: "L", name: "Left", color: "#fb8c00" },
                  { letter: "U", name: "Up", color: "#e0e0e0" },
                  { letter: "D", name: "Down", color: "#fdd835" },
                  { letter: "F", name: "Front", color: "#2e7d32" },
                  { letter: "B", name: "Back", color: "#1565c0" },
                ].map((f) => (
                  <div
                    key={f.letter}
                    className="flex flex-col items-center gap-2 py-3"
                  >
                    <div
                      className="w-10 h-10 rounded-lg"
                      style={{ backgroundColor: f.color }}
                    />
                    <div className="text-center">
                      <span className="text-white font-mono font-bold text-sm">
                        {f.letter}
                      </span>
                      <p className="text-white/30 text-[10px]">{f.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive demo */}
            <div className="mt-8">
              <h3 className="text-white font-semibold text-sm mb-3">
                Try It — Sune Algorithm
              </h3>
              <div className="max-w-sm">
                <AlgorithmVisualizer
                  moves="R U R' U R U2 R'"
                  setupMoves="R U2 R' U' R U' R'"
                  label="R U R' U R U2 R'"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.04] text-center">
          <p className="text-white/20 text-xs">
            OMBCube — Built by Omar El Boussouni
          </p>
        </div>
      </div>
    </div>
  );
}
