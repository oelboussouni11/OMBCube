/**
 * Solver utility using cubejs (Kociemba two-phase algorithm)
 * Solves any 3x3 cube state in ≤22 moves
 *
 * Install: npm install cubejs
 */

import Cube from "cubejs";

let initialized = false;

/**
 * Initialize solver lookup tables.
 * Takes ~2-5 seconds on first call, then instant.
 * Call this early (e.g. on page load) so solving is fast later.
 */
export function initSolver(): Promise<void> {
  return new Promise((resolve) => {
    if (initialized) {
      resolve();
      return;
    }
    // initSolver is synchronous and blocks, so we wrap in setTimeout
    // to let the UI update first
    setTimeout(() => {
      Cube.initSolver();
      initialized = true;
      resolve();
    }, 50);
  });
}

export function isSolverReady(): boolean {
  return initialized;
}

/**
 * Our CubeState uses:
 *   U/D/R/L/F/B faces, each with 9 stickers
 *   Colors: W, Y, R, O, B, G
 *
 * cubejs uses a facelet string of 54 chars in order:
 *   U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
 *   Where each char is U/R/F/D/L/B (representing which face's color it is)
 *
 * Our color-to-face mapping (standard orientation):
 *   W = U (white = up)
 *   Y = D (yellow = down)
 *   R = R (red = right)
 *   O = L (orange = left)
 *   G = F (green = front)
 *   B = B (blue = back)
 */

type FaceColor = "W" | "Y" | "R" | "O" | "B" | "G";

interface CubeState {
  U: FaceColor[];
  D: FaceColor[];
  R: FaceColor[];
  L: FaceColor[];
  F: FaceColor[];
  B: FaceColor[];
}

const COLOR_TO_FACE: Record<string, string> = {
  W: "U",
  Y: "D",
  R: "R",
  O: "L",
  G: "F",
  B: "B",
};

/**
 * Convert our CubeState to a cubejs facelet string.
 * Order: U(0-8), R(0-8), F(0-8), D(0-8), L(0-8), B(0-8)
 */
export function stateToFaceletString(state: CubeState): string {
  const faces = ["U", "R", "F", "D", "L", "B"] as const;
  let result = "";
  for (const face of faces) {
    for (let i = 0; i < 9; i++) {
      result += COLOR_TO_FACE[state[face][i]];
    }
  }
  return result;
}

/**
 * Solve the cube from the given state.
 * Returns an array of moves like ["R", "U'", "F2", "D", ...]
 * Returns empty array if already solved.
 * Throws if the state is invalid.
 */
export function solveCube(state: CubeState): string[] {
  if (!initialized) {
    throw new Error("Solver not initialized. Call initSolver() first.");
  }

  // Check if already solved
  const centers = { U: "W", D: "Y", R: "R", L: "O", F: "G", B: "B" };
  let isSolved = true;
  for (const face of Object.keys(centers) as Array<keyof typeof centers>) {
    for (let i = 0; i < 9; i++) {
      if (state[face][i] !== centers[face]) {
        isSolved = false;
        break;
      }
    }
    if (!isSolved) break;
  }
  if (isSolved) return [];

  const faceletString = stateToFaceletString(state);

  try {
    const cube = Cube.fromString(faceletString);
    const solution = cube.solve();

    if (!solution || solution.trim() === "") return [];

    // cubejs returns space-separated moves like "R U' F2 D"
    // Convert to our format (already compatible)
    return solution
      .trim()
      .split(/\s+/)
      .filter((m: string) => m.length > 0);
  } catch (e) {
    throw new Error(`Invalid cube state: ${(e as Error).message}`);
  }
}

/**
 * Validate that a cube state has exactly 9 of each color.
 */
export function validateState(state: CubeState): {
  valid: boolean;
  error?: string;
} {
  const counts: Record<string, number> = { W: 0, Y: 0, R: 0, O: 0, B: 0, G: 0 };
  const faces = ["U", "D", "R", "L", "F", "B"] as const;

  for (const face of faces) {
    if (!state[face] || state[face].length !== 9) {
      return {
        valid: false,
        error: `Face ${face} must have exactly 9 stickers`,
      };
    }
    for (const color of state[face]) {
      if (!(color in counts)) {
        return { valid: false, error: `Invalid color: ${color}` };
      }
      counts[color]++;
    }
  }

  for (const [color, count] of Object.entries(counts)) {
    if (count !== 9) {
      return {
        valid: false,
        error: `Expected 9 ${color} stickers, found ${count}`,
      };
    }
  }

  // Check centers match standard orientation
  if (state.U[4] !== "W")
    return { valid: false, error: "Up center must be White" };
  if (state.D[4] !== "Y")
    return { valid: false, error: "Down center must be Yellow" };
  if (state.R[4] !== "R")
    return { valid: false, error: "Right center must be Red" };
  if (state.L[4] !== "O")
    return { valid: false, error: "Left center must be Orange" };
  if (state.F[4] !== "G")
    return { valid: false, error: "Front center must be Green" };
  if (state.B[4] !== "B")
    return { valid: false, error: "Back center must be Blue" };

  return { valid: true };
}
