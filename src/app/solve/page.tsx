"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  CubeState,
  FaceColor,
  FaceName,
  createSolvedCube,
  applyMove,
  applyMoves,
  generateScramble,
} from "@/lib/cubeState";
import {
  initSolver,
  isSolverReady,
  solveCube,
  validateState,
} from "@/lib/cubeSolver";

const CameraScanner = dynamic(
  () => import("@/components/scanner/CameraScanner"),
  { ssr: false },
);

const COLOR_MAP: Record<string, string> = {
  W: "#f5f5f5",
  Y: "#fdd835",
  R: "#d32f2f",
  O: "#fb8c00",
  B: "#1565c0",
  G: "#2e7d32",
};

const ALL_COLORS: FaceColor[] = ["W", "Y", "R", "O", "B", "G"];

const COLOR_LABEL: Record<string, string> = {
  W: "White",
  Y: "Yellow",
  R: "Red",
  O: "Orange",
  B: "Blue",
  G: "Green",
};

/* ── Notation Popup with reference image ── */
function NotationPopup({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#12121e] rounded-3xl border border-white/[0.08] w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Move Notation</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Reference image */}
        <div className="rounded-2xl overflow-hidden bg-white mb-4">
          <Image
            src="/notation-guide.png"
            alt="Rubik's Cube Move Notation Guide"
            width={810}
            height={637}
            className="w-full h-auto"
          />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="px-3 py-2 rounded-lg bg-white/[0.03]">
              <span className="text-indigo-300 font-mono font-bold text-sm">
                R
              </span>
              <p className="text-white/40 text-[10px]">Clockwise 90°</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.03]">
              <span className="text-indigo-300 font-mono font-bold text-sm">
                R&apos;
              </span>
              <p className="text-white/40 text-[10px]">Counter-clockwise 90°</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.03]">
              <span className="text-indigo-300 font-mono font-bold text-sm">
                R2
              </span>
              <p className="text-white/40 text-[10px]">180° double turn</p>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 text-xs">
              <span className="font-semibold">Keyboard:</span> R L U D F B ·
              Hold Shift for reverse (&apos;)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Verify Colors: 2D Cube Net Editor ── */
function CubeNetEditor({
  state,
  onChange,
}: {
  state: CubeState;
  onChange: (state: CubeState) => void;
}) {
  const [selectedCell, setSelectedCell] = useState<{
    face: FaceName;
    index: number;
  } | null>(null);

  const handleCellClick = (face: FaceName, index: number) => {
    // Don't allow editing center stickers (index 4)
    if (index === 4) return;
    setSelectedCell(
      selectedCell?.face === face && selectedCell?.index === index
        ? null
        : { face, index },
    );
  };

  const handleColorPick = (color: FaceColor) => {
    if (!selectedCell) return;
    const newState = {
      ...state,
      [selectedCell.face]: state[selectedCell.face].map(
        (c: FaceColor, i: number) => (i === selectedCell.index ? color : c),
      ),
    };
    onChange(newState);
    setSelectedCell(null);
  };

  const FaceGrid = ({ face, label }: { face: FaceName; label: string }) => (
    <div className="flex flex-col items-center gap-0.5">
      <div className="grid grid-cols-3 gap-[2px]">
        {state[face].map((color: FaceColor, i: number) => {
          const isSelected =
            selectedCell?.face === face && selectedCell?.index === i;
          const isCenter = i === 4;
          return (
            <button
              key={`${face}-${i}`}
              onClick={() => handleCellClick(face, i)}
              className={`w-7 h-7 rounded-[3px] border transition-all ${
                isCenter
                  ? "border-white/20 cursor-default"
                  : isSelected
                    ? "border-white scale-110 shadow-lg shadow-white/20 z-10"
                    : "border-white/10 hover:border-white/30 hover:scale-105 cursor-pointer"
              }`}
              style={{ backgroundColor: COLOR_MAP[color] }}
            />
          );
        })}
      </div>
      <span className="text-white/30 text-[9px] font-mono">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Cross/T layout for cube net */}
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: "auto auto auto auto",
          gridTemplateRows: "auto auto auto",
        }}
      >
        {/* Row 1: empty - U - empty - empty */}
        <div className="w-[90px]" />
        <FaceGrid face="U" label="Up" />
        <div className="w-[90px]" />
        <div className="w-[90px]" />

        {/* Row 2: L - F - R - B */}
        <FaceGrid face="L" label="Left" />
        <FaceGrid face="F" label="Front" />
        <FaceGrid face="R" label="Right" />
        <FaceGrid face="B" label="Back" />

        {/* Row 3: empty - D - empty - empty */}
        <div />
        <FaceGrid face="D" label="Down" />
        <div />
        <div />
      </div>

      {/* Color picker */}
      {selectedCell ? (
        <div className="flex flex-col items-center gap-2 mt-1">
          <p className="text-white/40 text-[10px]">Pick color:</p>
          <div className="flex gap-1.5">
            {ALL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorPick(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 active:scale-95 ${
                  state[selectedCell.face][selectedCell.index] === c
                    ? "border-white scale-105"
                    : "border-white/10 hover:border-white/40"
                }`}
                style={{ backgroundColor: COLOR_MAP[c] }}
                title={COLOR_LABEL[c]}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-white/20 text-[10px] mt-1">
          Tap any sticker to change its color (centers are locked)
        </p>
      )}
    </div>
  );
}

/* ── 3D Cube Components ── */

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
  faces: {
    right?: string;
    left?: string;
    top?: string;
    bottom?: string;
    front?: string;
    back?: string;
  };
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

function RubiksCube({ state }: { state: CubeState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current)
      ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.12) * 0.03;
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

function CubeScene({ state }: { state: CubeState }) {
  return (
    <Canvas
      camera={{ position: [8.5, 6, 8.5], fov: 30 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.85,
      }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[30, 40, 30]}
        intensity={0.6}
        color="#ffffff"
      />
      <directionalLight
        position={[-30, 20, -20]}
        intensity={0.4}
        color="#c0ccdd"
      />
      <directionalLight
        position={[10, -30, 20]}
        intensity={0.25}
        color="#b0bbd0"
      />
      <directionalLight
        position={[-20, 10, 30]}
        intensity={0.25}
        color="#b8c4d8"
      />
      <RubiksCube state={state} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={4}
        maxDistance={14}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.6}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
      <Environment preset="studio" backgroundBlurriness={1} />
    </Canvas>
  );
}

/* ── Page ── */

export default function SolvePage() {
  const [cubeState, setCubeState] = useState<CubeState>(createSolvedCube);
  const [scrambleMoves, setScrambleMoves] = useState<string[]>([]);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [currentSolveStep, setCurrentSolveStep] = useState(-1);
  const [lastMove, setLastMove] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [solverReady, setSolverReady] = useState(false);
  const [solving, setSolving] = useState(false);
  const [solverError, setSolverError] = useState<string>("");
  const [showHelp, setShowHelp] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(400); // ms per move
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initSolver().then(() => setSolverReady(true));
  }, []);

  const handleScramble = useCallback(() => {
    stopAnimation();
    const moves = generateScramble(20);
    setScrambleMoves(moves);
    setCubeState(applyMoves(createSolvedCube(), moves));
    setSolutionMoves([]);
    setCurrentSolveStep(-1);
    setSolverError("");
    setLastMove("");
    setHasScanned(true);
  }, []);

  const handleReset = useCallback(() => {
    stopAnimation();
    setCubeState(createSolvedCube());
    setScrambleMoves([]);
    setSolutionMoves([]);
    setCurrentSolveStep(-1);
    setSolverError("");
    setLastMove("");
    setHasScanned(false);
    setShowVerify(false);
  }, []);

  const handleMove = useCallback((move: string) => {
    setCubeState((prev) => applyMove(prev, move));
    setLastMove(move);
  }, []);

  const handleSolve = useCallback(() => {
    if (!solverReady) return;
    setSolving(true);
    setSolverError("");
    setTimeout(() => {
      try {
        const validation = validateState(cubeState);
        if (!validation.valid) {
          setSolverError(validation.error || "Invalid cube state");
          setSolving(false);
          return;
        }
        const solution = solveCube(cubeState);
        if (solution.length === 0) {
          setSolverError("Cube is already solved!");
          setSolving(false);
          return;
        }
        setSolutionMoves(solution);
        setCurrentSolveStep(-1);
        setSolving(false);
        setShowVerify(false);
      } catch (e) {
        setSolverError((e as Error).message);
        setSolving(false);
      }
    }, 50);
  }, [cubeState, solverReady]);

  const handleNextStep = useCallback(() => {
    if (solutionMoves.length === 0) return;
    const nextStep = currentSolveStep + 1;
    if (nextStep >= solutionMoves.length) return;
    const move = solutionMoves[nextStep];
    setCubeState((prev) => applyMove(prev, move));
    setCurrentSolveStep(nextStep);
    setLastMove(move);
  }, [solutionMoves, currentSolveStep]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animRef.current) {
      clearInterval(animRef.current);
      animRef.current = null;
    }
    setAnimating(false);
  }, []);

  // Animated solve - steps through moves with delay
  const handleSolveAll = useCallback(() => {
    if (solutionMoves.length === 0) return;
    if (animating) {
      stopAnimation();
      return;
    } // toggle pause

    setAnimating(true);
    // Use a ref-based counter so interval always reads latest step
    let step = currentSolveStep;

    animRef.current = setInterval(() => {
      step++;
      if (step >= solutionMoves.length) {
        stopAnimation();
        return;
      }
      const move = solutionMoves[step];
      setCubeState((prev) => applyMove(prev, move));
      setCurrentSolveStep(step);
      setLastMove(move);
    }, animSpeed);
  }, [solutionMoves, currentSolveStep, animating, animSpeed, stopAnimation]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, []);

  // Restart animation when speed changes while animating
  useEffect(() => {
    if (animating && animRef.current) {
      stopAnimation();
      // Small delay then restart
      setTimeout(() => handleSolveAll(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animSpeed]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleScanComplete = useCallback((faces: any) => {
    setCubeState((prev) => ({ ...prev, ...faces }));
    setScannerOpen(false);
    setScrambleMoves([]);
    setSolutionMoves([]);
    setCurrentSolveStep(-1);
    setSolverError("");
    setHasScanned(true);
    setShowVerify(true);
  }, []);

  useEffect(() => {
    const VALID_MOVES = ["R", "L", "U", "D", "F", "B"];
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (scannerOpen || showHelp || showVerify) return;
      const key = e.key.toUpperCase();
      if (VALID_MOVES.includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        handleMove(e.shiftKey ? key + "'" : key);
      }
    };
    window.addEventListener("keydown", handleKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKey, { capture: true });
  }, [handleMove, scannerOpen, showHelp, showVerify]);

  const hasSolution = solutionMoves.length > 0;
  const isSolved =
    currentSolveStep >= 0 && currentSolveStep >= solutionMoves.length - 1;
  const stepsRemaining = hasSolution
    ? solutionMoves.length - (currentSolveStep + 1)
    : 0;

  // Determine active step: 0=scan, 1=verify, 2=solve, 3=all done
  const activeStep = isSolved ? 3 : hasSolution ? 2 : hasScanned ? 1 : 0;

  const stepItems = [
    { label: "Scan Cube", desc: "Camera or scramble" },
    { label: "Verify Colors", desc: "Check & fix stickers" },
    { label: "Solve", desc: "Find solution" },
  ];

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col">
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
                className="px-4 py-2 rounded-xl text-white bg-white/[0.06] text-sm"
              >
                Solve
              </Link>
              <Link
                href="/learn"
                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.04] text-sm transition-all duration-300"
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

      <div className="flex-1 flex relative">
        <aside className="w-80 border-r border-white/[0.06] px-5 py-4 flex flex-col gap-3 relative z-10 bg-[#08080f]/80 backdrop-blur-sm overflow-y-auto">
          {/* Steps */}
          <div>
            <h2 className="text-white font-semibold text-xs mb-2 tracking-wide uppercase opacity-50">
              Steps
            </h2>
            <div className="space-y-1.5">
              {stepItems.map((step, i) => {
                const isDone = i < activeStep;
                const isCurrent = i === activeStep;
                return (
                  <button
                    key={step.label}
                    onClick={() => {
                      if (i === 0) setScannerOpen(true);
                      if (i === 1 && hasScanned) setShowVerify(true);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-left ${
                      isCurrent
                        ? "bg-white/[0.06] border border-white/[0.1]"
                        : isDone
                          ? "bg-green-500/[0.04] border border-green-500/[0.1]"
                          : "opacity-30"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isDone
                          ? "bg-green-500/20 text-green-400"
                          : isCurrent
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                            : "bg-white/[0.06] text-white/50"
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div>
                      <span className="text-white text-sm">{step.label}</span>
                      {isCurrent && (
                        <p className="text-white/30 text-[10px]">{step.desc}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scan */}
          <button
            onClick={() => setScannerOpen(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Scan with Camera
          </button>

          <div className="border-t border-white/[0.06]" />

          {/* Solution / Scramble display */}
          <div>
            <h2 className="text-white font-semibold text-xs mb-2 tracking-wide uppercase opacity-50">
              {hasSolution
                ? "Solution"
                : scrambleMoves.length > 0
                  ? "Scramble"
                  : "Solution"}
            </h2>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 min-h-[60px]">
              {hasSolution ? (
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {solutionMoves.map((move, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-all ${i <= currentSolveStep ? "bg-green-500/20 text-green-300" : i === currentSolveStep + 1 ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40" : "bg-white/[0.04] text-white/40"}`}
                      >
                        {move}
                      </span>
                    ))}
                  </div>
                  <p className="text-white/30 text-xs mt-3">
                    {isSolved
                      ? "✓ Solved!"
                      : `${solutionMoves.length} moves · ${stepsRemaining} remaining`}
                  </p>
                </div>
              ) : scrambleMoves.length > 0 ? (
                <p className="text-white/70 text-sm text-center font-mono leading-relaxed">
                  {scrambleMoves.join("  ")}
                </p>
              ) : (
                <p className="text-white/30 text-sm text-center">
                  Scan or scramble to begin
                </p>
              )}
            </div>
          </div>

          {/* Solve button */}
          {!hasSolution && (
            <button
              onClick={handleSolve}
              disabled={!solverReady || solving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {!solverReady ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing solver...
                </>
              ) : solving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Solving...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  Solve Cube
                </>
              )}
            </button>
          )}

          {/* Step controls */}
          {hasSolution && !isSolved && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handleNextStep}
                  disabled={animating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                  Next
                </button>
                <button
                  onClick={handleSolveAll}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${animating ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300" : "bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {animating ? (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </>
                  )}
                </button>
              </div>
              {/* Speed control */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-white/30 text-[10px]">Speed:</span>
                {[
                  { label: "0.5×", ms: 800 },
                  { label: "1×", ms: 400 },
                  { label: "2×", ms: 200 },
                  { label: "4×", ms: 100 },
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setAnimSpeed(s.ms)}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono transition-all ${animSpeed === s.ms ? "bg-indigo-500/20 text-indigo-300" : "text-white/30 hover:text-white/50"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {solverError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-300 text-xs">{solverError}</p>
            </div>
          )}

          <div className="border-t border-white/[0.06]" />

          {/* Move Controls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold text-xs tracking-wide uppercase opacity-50">
                Moves
              </h2>
              <div className="flex items-center gap-2">
                {lastMove && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                    {lastMove}
                  </span>
                )}
                <button
                  onClick={() => setShowHelp(true)}
                  className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-all text-xs font-bold"
                >
                  ?
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {["R", "L", "U", "D", "F", "B"].map((f) => (
                <button
                  key={f}
                  onClick={() => handleMove(f)}
                  className="py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 text-[10px] font-mono font-bold hover:bg-white/[0.1] hover:text-white transition-all duration-200 active:scale-95"
                >
                  {f}
                </button>
              ))}
              {["R", "L", "U", "D", "F", "B"].map((f) => (
                <button
                  key={f + "'"}
                  onClick={() => handleMove(f + "'")}
                  className="py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 text-[10px] font-mono font-bold hover:bg-white/[0.1] hover:text-white transition-all duration-200 active:scale-95"
                >
                  {f}&apos;
                </button>
              ))}
              {["R", "L", "U", "D", "F", "B"].map((f) => (
                <button
                  key={f + "2"}
                  onClick={() => handleMove(f + "2")}
                  className="py-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 text-[10px] font-mono font-bold hover:bg-white/[0.1] hover:text-white transition-all duration-200 active:scale-95"
                >
                  {f}2
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
            <div
              className={`w-2 h-2 rounded-full ${solverReady ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`}
            />
            <span className="text-white/30 text-[10px]">
              {solverReady ? "Solver ready (Kociemba)" : "Loading solver..."}
            </span>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={handleScramble}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.06] hover:text-white transition-all duration-300"
            >
              Scramble
            </button>
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.06] hover:text-white transition-all duration-300"
            >
              Reset
            </button>
          </div>
        </aside>

        <main className="flex-1 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[400px] rounded-full bg-indigo-500/4 blur-[100px]" />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] backdrop-blur-xl shadow-lg shadow-black/20">
            <svg
              className="w-3.5 h-3.5 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            <span className="text-white/40 text-[11px] font-light">
              Drag to rotate · Scroll to zoom
            </span>
          </div>

          <CubeScene state={cubeState} />
        </main>
      </div>

      {scannerOpen && (
        <CameraScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onComplete={handleScanComplete}
        />
      )}

      {showHelp && <NotationPopup onClose={() => setShowHelp(false)} />}

      {/* Verify Colors Modal */}
      {showVerify && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowVerify(false)}
        >
          <div
            className="bg-[#12121e] rounded-3xl border border-white/[0.08] w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">
                Verify Colors
              </h3>
              <button
                onClick={() => setShowVerify(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="text-white/40 text-xs mb-4">
              Check that each sticker matches your physical cube. Tap any
              sticker to change its color.
            </p>

            <CubeNetEditor state={cubeState} onChange={setCubeState} />

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowVerify(false)}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowVerify(false);
                  handleSolve();
                }}
                disabled={!solverReady}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-40"
              >
                Confirm & Solve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
