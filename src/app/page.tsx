"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, RoundedBox } from "@react-three/drei";
import { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import Link from "next/link";

/* ─── Glassmorphic Cubie ─── */
function GlassCubie({
  position,
  color,
  delay,
}: {
  position: [number, number, number];
  color: string;
  delay: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.8 + delay) * 0.08;
  });

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        transmission: 0.92,
        roughness: 0.05,
        metalness: 0.0,
        thickness: 1.5,
        ior: 1.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.5,
        transparent: true,
        opacity: 0.85,
      }),
    [color],
  );

  return (
    <RoundedBox
      ref={meshRef}
      args={[0.9, 0.9, 0.9]}
      radius={0.08}
      smoothness={4}
      position={position}
      material={material}
    />
  );
}

/* ─── 3D Cube Grid ─── */
function CubeGrid() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.3 + 0.5;
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.2) * 0.15 + 0.3;
  });

  const cubies = useMemo(() => {
    const items: {
      pos: [number, number, number];
      color: string;
      delay: number;
    }[] = [];
    const colors = [
      "#4a9eff",
      "#3b82f6",
      "#6366f1",
      "#818cf8",
      "#60a5fa",
      "#38bdf8",
      "#7c3aed",
      "#a78bfa",
      "#93c5fd",
    ];
    let i = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          items.push({
            pos: [x * 1.05, y * 1.05, z * 1.05],
            color: colors[i % colors.length],
            delay: i * 0.4,
          });
          i++;
        }
      }
    }
    return items;
  }, []);

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={groupRef}>
        {cubies.map((c, i) => (
          <GlassCubie
            key={i}
            position={c.pos}
            color={c.color}
            delay={c.delay}
          />
        ))}
      </group>
    </Float>
  );
}

/* ─── 3D Scene ─── */
function Scene() {
  return (
    <Canvas
      camera={{ position: [5, 3.5, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        color="#c4d4ff"
      />
      <directionalLight
        position={[-5, -5, -5]}
        intensity={0.4}
        color="#818cf8"
      />
      <pointLight position={[0, 5, 0]} intensity={0.8} color="#60a5fa" />
      <CubeGrid />
      <Environment preset="city" />
    </Canvas>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({
  href,
  icon,
  title,
  description,
  gradient,
  delay,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  delay: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative overflow-hidden rounded-3xl border border-white/[0.08] backdrop-blur-xl p-8 cursor-pointer transition-all duration-500"
        style={{
          background: hovered
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.03)",
          animationDelay: delay,
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 20px 60px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(255,255,255,0.1)"
            : "none",
        }}
      >
        {/* Gradient glow on hover */}
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${gradient}`}
          style={{ filter: "blur(40px)", transform: "scale(0.8)" }}
        />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
            {icon}
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">
            {title}
          </h3>
          <p className="text-white/50 text-base leading-relaxed mb-6">
            {description}
          </p>
          <div className="flex items-center gap-2 text-white/70 group-hover:text-white transition-colors duration-300">
            <span className="text-sm font-medium">Get started</span>
            <svg
              className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Landing Page ─── */
export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#06060e] overflow-hidden">
      {/* Background noise texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gradient orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
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
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/solve"
            className="text-white/50 hover:text-white text-sm transition-colors duration-300"
          >
            Solve
          </Link>
          <Link
            href="/learn"
            className="text-white/50 hover:text-white text-sm transition-colors duration-300"
          >
            Learn
          </Link>
          <Link
            href="/solve"
            className="px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white text-sm hover:bg-white/[0.1] transition-all duration-300"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[70vh]">
          {/* Left: Text */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI-Powered Cube Solver
            </div>

            <h1 className="text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight">
              Solve any
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Rubik&apos;s Cube
              </span>
              <br />
              in seconds.
            </h1>

            <p className="text-lg text-white/40 max-w-md leading-relaxed">
              Scan your cube with your camera, get the optimal solution, and
              learn to solve it yourself — step by step, level by level.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/solve"
                className="group px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 flex items-center gap-2"
              >
                Start Solving
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
              <Link
                href="/learn"
                className="px-7 py-3.5 rounded-2xl border border-white/[0.1] text-white/70 font-medium text-sm hover:bg-white/[0.04] hover:text-white transition-all duration-300"
              >
                Learn to Solve
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-10 pt-6 border-t border-white/[0.06]">
              <div>
                <div className="text-2xl font-bold text-white">≤20</div>
                <div className="text-xs text-white/30 mt-0.5">Max moves</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">&lt;1s</div>
                <div className="text-xs text-white/30 mt-0.5">Solve time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">5</div>
                <div className="text-xs text-white/30 mt-0.5">
                  Learning levels
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3D Cube */}
          <div className="relative h-[550px] lg:h-[600px]">
            {/* Glow behind cube */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 rounded-full bg-indigo-500/15 blur-[80px]" />
            </div>
            <Scene />
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4">
            Choose your path
          </h2>
          <p className="text-white/40 max-w-lg mx-auto">
            Whether you want to solve your cube instantly or master it yourself
            — we&apos;ve got you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <FeatureCard
            href="/solve"
            icon={
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
                />
              </svg>
            }
            title="Solve"
            description="Scan your cube, get the optimal solution in under 20 moves, and watch it solve itself in stunning 3D."
            gradient="bg-gradient-to-br from-blue-600/20 to-cyan-600/20"
            delay="0ms"
          />
          <FeatureCard
            href="/learn"
            icon={
              <svg
                className="w-6 h-6 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                />
              </svg>
            }
            title="Learn"
            description="Master the Rubik's Cube step by step with interactive 3D lessons, from complete beginner to advanced."
            gradient="bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20"
            delay="100ms"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-8">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <span className="text-white/20 text-sm">
            © 2026 OMBCube. Built by Omar El Boussouni.
          </span>
          <a
            href="https://github.com/omarelboussouni"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/50 transition-colors text-sm"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
