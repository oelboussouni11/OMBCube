"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { generateScramble } from "@/lib/cubeState";

/* ── Types ── */
interface SolveRecord {
  id: string;
  time: number; // ms
  scramble: string;
  date: number; // timestamp
  dnf: boolean;
  plusTwo: boolean;
}

/* ── Helpers ── */
function formatTime(ms: number, plusTwo = false): string {
  const total = plusTwo ? ms + 2000 : ms;
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const centis = Math.floor((total % 1000) / 10);
  if (minutes > 0)
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
  return `${seconds}.${centis.toString().padStart(2, "0")}`;
}

function getEffectiveTime(s: SolveRecord): number {
  if (s.dnf) return Infinity;
  return s.plusTwo ? s.time + 2000 : s.time;
}

function calcAvg(solves: SolveRecord[], n: number): number | null {
  if (solves.length < n) return null;
  const last = solves.slice(0, n);
  const times = last.map(getEffectiveTime);
  if (times.filter((t) => t === Infinity).length > 1) return Infinity; // >1 DNF in avg = DNF
  // Remove best and worst
  const sorted = [...times].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

function loadHistory(): SolveRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("ombcube-timer-history");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: SolveRecord[]) {
  try {
    localStorage.setItem("ombcube-timer-history", JSON.stringify(history));
  } catch {}
}

/* ── Page ── */

export default function TimerPage() {
  const [scramble, setScramble] = useState<string[]>([]);
  const [timerState, setTimerState] = useState<
    "idle" | "holding" | "ready" | "running" | "stopped"
  >("idle");
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [holdStart, setHoldStart] = useState(0);
  const [history, setHistory] = useState<SolveRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const animRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history + generate first scramble
  useEffect(() => {
    setHistory(loadHistory());
    setScramble(generateScramble(20));
  }, []);

  const newScramble = useCallback(() => {
    setScramble(generateScramble(20));
  }, []);

  // Timer animation loop
  useEffect(() => {
    if (timerState === "running") {
      const tick = () => {
        setElapsed(Date.now() - startTime);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animRef.current);
    }
  }, [timerState, startTime]);

  // Save solve
  const saveSolve = useCallback(
    (time: number) => {
      const record: SolveRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        time,
        scramble: scramble.join(" "),
        date: Date.now(),
        dnf: false,
        plusTwo: false,
      };
      const newHistory = [record, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);
      newScramble();
    },
    [history, scramble, newScramble],
  );

  // Toggle DNF / +2 for last solve
  const toggleDNF = useCallback(() => {
    if (history.length === 0) return;
    const updated = [...history];
    updated[0] = { ...updated[0], dnf: !updated[0].dnf, plusTwo: false };
    setHistory(updated);
    saveHistory(updated);
  }, [history]);

  const togglePlusTwo = useCallback(() => {
    if (history.length === 0) return;
    const updated = [...history];
    updated[0] = { ...updated[0], plusTwo: !updated[0].plusTwo, dnf: false };
    setHistory(updated);
    saveHistory(updated);
  }, [history]);

  const deleteLast = useCallback(() => {
    if (history.length === 0) return;
    const updated = history.slice(1);
    setHistory(updated);
    saveHistory(updated);
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  // Keyboard: Space to start/stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code !== "Space") return;
      e.preventDefault();

      if (timerState === "running") {
        // Stop
        const finalTime = Date.now() - startTime;
        setElapsed(finalTime);
        setTimerState("stopped");
        saveSolve(finalTime);
        return;
      }

      if (timerState === "idle" || timerState === "stopped") {
        // Start holding
        setTimerState("holding");
        setHoldStart(Date.now());
        holdTimerRef.current = setTimeout(() => {
          setTimerState("ready");
        }, 300);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();

      if (timerState === "holding") {
        // Released too early
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        setTimerState("idle");
        return;
      }

      if (timerState === "ready") {
        // Start timer
        const now = Date.now();
        setStartTime(now);
        setElapsed(0);
        setTimerState("running");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [timerState, startTime, saveSolve]);

  // Touch support
  const handleTouchStart = useCallback(() => {
    if (timerState === "running") {
      const finalTime = Date.now() - startTime;
      setElapsed(finalTime);
      setTimerState("stopped");
      saveSolve(finalTime);
      return;
    }
    if (timerState === "idle" || timerState === "stopped") {
      setTimerState("holding");
      setHoldStart(Date.now());
      holdTimerRef.current = setTimeout(() => setTimerState("ready"), 300);
    }
  }, [timerState, startTime, saveSolve]);

  const handleTouchEnd = useCallback(() => {
    if (timerState === "holding") {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      setTimerState("idle");
      return;
    }
    if (timerState === "ready") {
      setStartTime(Date.now());
      setElapsed(0);
      setTimerState("running");
    }
  }, [timerState]);

  // Stats
  const best =
    history.length > 0
      ? Math.min(
          ...history
            .filter((s) => !s.dnf)
            .map((s) => (s.plusTwo ? s.time + 2000 : s.time)),
        )
      : null;
  const ao5 = calcAvg(history, 5);
  const ao12 = calcAvg(history, 12);
  const sessionAvg =
    history.length > 0
      ? history
          .filter((s) => !s.dnf)
          .reduce((a, s) => a + (s.plusTwo ? s.time + 2000 : s.time), 0) /
        history.filter((s) => !s.dnf).length
      : null;

  const timerColor =
    timerState === "holding"
      ? "text-red-400"
      : timerState === "ready"
        ? "text-green-400"
        : "text-white";

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col select-none">
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
                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.04] text-sm transition-all duration-300"
              >
                Learn
              </Link>
              <Link
                href="/timer"
                className="px-4 py-2 rounded-xl text-white bg-white/[0.06] text-sm"
              >
                Timer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main timer area */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Scramble */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/30 text-[10px] uppercase tracking-wider">
              Scramble
            </span>
            <button
              onClick={newScramble}
              className="text-white/20 hover:text-white/40 text-[10px] transition-colors"
            >
              New
            </button>
          </div>
          <div className="px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
            <p className="text-white/70 text-sm font-mono text-center tracking-wide">
              {scramble.join("  ")}
            </p>
          </div>
        </div>

        {/* Timer display */}
        <div className="flex flex-col items-center">
          <p
            className={`font-mono font-bold tracking-tight transition-colors duration-150 ${timerColor} ${timerState === "running" ? "text-8xl" : "text-9xl"}`}
          >
            {timerState === "idle" && history.length === 0
              ? "0.00"
              : formatTime(
                  elapsed,
                  history.length > 0 && timerState !== "running"
                    ? history[0]?.plusTwo
                    : false,
                )}
          </p>

          {/* State hint */}
          <p className="text-white/20 text-xs mt-4">
            {timerState === "idle" || timerState === "stopped"
              ? "Hold SPACE to start"
              : timerState === "holding"
                ? "Keep holding..."
                : timerState === "ready"
                  ? "Release to start!"
                  : "Press SPACE to stop"}
          </p>

          {/* Last solve actions */}
          {history.length > 0 &&
            (timerState === "idle" || timerState === "stopped") && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={togglePlusTwo}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${history[0]?.plusTwo ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-300" : "bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/50"}`}
                >
                  +2
                </button>
                <button
                  onClick={toggleDNF}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${history[0]?.dnf ? "bg-red-500/20 border border-red-500/30 text-red-300" : "bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/50"}`}
                >
                  DNF
                </button>
                <button
                  onClick={deleteLast}
                  className="px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-red-300 transition-all"
                >
                  ✕ Delete
                </button>
              </div>
            )}
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6">
          <div className="flex items-center justify-between">
            {/* Stats */}
            <div className="flex gap-6">
              {[
                {
                  label: "Best",
                  value:
                    best !== null && best !== Infinity ? formatTime(best) : "-",
                },
                {
                  label: "Ao5",
                  value:
                    ao5 !== null
                      ? ao5 === Infinity
                        ? "DNF"
                        : formatTime(ao5)
                      : "-",
                },
                {
                  label: "Ao12",
                  value:
                    ao12 !== null
                      ? ao12 === Infinity
                        ? "DNF"
                        : formatTime(ao12)
                      : "-",
                },
                {
                  label: "Avg",
                  value: sessionAvg !== null ? formatTime(sessionAvg) : "-",
                },
                { label: "Solves", value: history.length.toString() },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-white/20 text-[10px] uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-white/60 font-mono text-sm font-semibold">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* History toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs hover:text-white/60 transition-all flex items-center gap-2"
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
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              History
            </button>
          </div>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="bg-[#12121e] rounded-3xl border border-white/[0.08] w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-white font-semibold text-lg">
                Solve History
              </h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-red-400/50 hover:text-red-400 text-xs transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
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
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-5">
              {history.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-10">
                  No solves yet
                </p>
              ) : (
                <div className="space-y-1">
                  {history.map((solve, i) => (
                    <div
                      key={solve.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white/20 text-[10px] font-mono w-6 text-right">
                          {history.length - i}
                        </span>
                        <span
                          className={`font-mono font-semibold text-sm ${solve.dnf ? "text-red-400 line-through" : solve.plusTwo ? "text-yellow-300" : "text-white/70"}`}
                        >
                          {solve.dnf
                            ? "DNF"
                            : formatTime(solve.time, solve.plusTwo)}
                          {solve.plusTwo && (
                            <span className="text-yellow-500/50 text-[10px] ml-1">
                              +2
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-white/15 text-[9px] font-mono truncate max-w-[180px]">
                        {solve.scramble}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
