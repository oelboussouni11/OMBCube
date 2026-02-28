// Cube state management
// Each face has 9 stickers indexed 0-8:
//   0 1 2
//   3 4 5
//   6 7 8
// Faces: U (white), D (yellow), R (red), L (orange), F (green), B (blue)

export type FaceColor = "W" | "Y" | "R" | "O" | "B" | "G";
export type FaceName = "U" | "D" | "R" | "L" | "F" | "B";
export type CubeState = Record<FaceName, FaceColor[]>;

// Solved state
export function createSolvedCube(): CubeState {
  return {
    U: Array(9).fill("W") as FaceColor[],
    D: Array(9).fill("Y") as FaceColor[],
    R: Array(9).fill("R") as FaceColor[],
    L: Array(9).fill("O") as FaceColor[],
    F: Array(9).fill("G") as FaceColor[],
    B: Array(9).fill("B") as FaceColor[],
  };
}

// Rotate a face 90° clockwise
function rotateFaceCW(face: FaceColor[]): FaceColor[] {
  return [
    face[6],
    face[3],
    face[0],
    face[7],
    face[4],
    face[1],
    face[8],
    face[5],
    face[2],
  ];
}

// Rotate a face 90° counter-clockwise
function rotateFaceCCW(face: FaceColor[]): FaceColor[] {
  return [
    face[2],
    face[5],
    face[8],
    face[1],
    face[4],
    face[7],
    face[0],
    face[3],
    face[6],
  ];
}

// Clone state
function clone(state: CubeState): CubeState {
  return {
    U: [...state.U],
    D: [...state.D],
    R: [...state.R],
    L: [...state.L],
    F: [...state.F],
    B: [...state.B],
  };
}

// Apply a single move (supports R, R', R2, etc.)
export function applyMove(state: CubeState, move: string): CubeState {
  // Handle double moves (R2, U2, etc.) — apply the base move twice
  if (move.endsWith("2")) {
    const base = move[0];
    return applyMove(applyMove(state, base), base);
  }

  const s = clone(state);
  let temp: FaceColor[];

  switch (move) {
    case "R":
      s.R = rotateFaceCW(s.R);
      temp = [s.F[2], s.F[5], s.F[8]];
      s.F[2] = s.D[2];
      s.F[5] = s.D[5];
      s.F[8] = s.D[8];
      s.D[2] = s.B[6];
      s.D[5] = s.B[3];
      s.D[8] = s.B[0];
      s.B[6] = s.U[2];
      s.B[3] = s.U[5];
      s.B[0] = s.U[8];
      s.U[2] = temp[0];
      s.U[5] = temp[1];
      s.U[8] = temp[2];
      break;
    case "R'":
      s.R = rotateFaceCCW(s.R);
      temp = [s.F[2], s.F[5], s.F[8]];
      s.F[2] = s.U[2];
      s.F[5] = s.U[5];
      s.F[8] = s.U[8];
      s.U[2] = s.B[6];
      s.U[5] = s.B[3];
      s.U[8] = s.B[0];
      s.B[6] = s.D[2];
      s.B[3] = s.D[5];
      s.B[0] = s.D[8];
      s.D[2] = temp[0];
      s.D[5] = temp[1];
      s.D[8] = temp[2];
      break;
    case "L":
      s.L = rotateFaceCW(s.L);
      temp = [s.F[0], s.F[3], s.F[6]];
      s.F[0] = s.U[0];
      s.F[3] = s.U[3];
      s.F[6] = s.U[6];
      s.U[0] = s.B[8];
      s.U[3] = s.B[5];
      s.U[6] = s.B[2];
      s.B[8] = s.D[0];
      s.B[5] = s.D[3];
      s.B[2] = s.D[6];
      s.D[0] = temp[0];
      s.D[3] = temp[1];
      s.D[6] = temp[2];
      break;
    case "L'":
      s.L = rotateFaceCCW(s.L);
      temp = [s.F[0], s.F[3], s.F[6]];
      s.F[0] = s.D[0];
      s.F[3] = s.D[3];
      s.F[6] = s.D[6];
      s.D[0] = s.B[8];
      s.D[3] = s.B[5];
      s.D[6] = s.B[2];
      s.B[8] = s.U[0];
      s.B[5] = s.U[3];
      s.B[2] = s.U[6];
      s.U[0] = temp[0];
      s.U[3] = temp[1];
      s.U[6] = temp[2];
      break;
    case "U":
      s.U = rotateFaceCW(s.U);
      temp = [s.F[0], s.F[1], s.F[2]];
      s.F[0] = s.R[0];
      s.F[1] = s.R[1];
      s.F[2] = s.R[2];
      s.R[0] = s.B[0];
      s.R[1] = s.B[1];
      s.R[2] = s.B[2];
      s.B[0] = s.L[0];
      s.B[1] = s.L[1];
      s.B[2] = s.L[2];
      s.L[0] = temp[0];
      s.L[1] = temp[1];
      s.L[2] = temp[2];
      break;
    case "U'":
      s.U = rotateFaceCCW(s.U);
      temp = [s.F[0], s.F[1], s.F[2]];
      s.F[0] = s.L[0];
      s.F[1] = s.L[1];
      s.F[2] = s.L[2];
      s.L[0] = s.B[0];
      s.L[1] = s.B[1];
      s.L[2] = s.B[2];
      s.B[0] = s.R[0];
      s.B[1] = s.R[1];
      s.B[2] = s.R[2];
      s.R[0] = temp[0];
      s.R[1] = temp[1];
      s.R[2] = temp[2];
      break;
    case "D":
      s.D = rotateFaceCW(s.D);
      temp = [s.F[6], s.F[7], s.F[8]];
      s.F[6] = s.L[6];
      s.F[7] = s.L[7];
      s.F[8] = s.L[8];
      s.L[6] = s.B[6];
      s.L[7] = s.B[7];
      s.L[8] = s.B[8];
      s.B[6] = s.R[6];
      s.B[7] = s.R[7];
      s.B[8] = s.R[8];
      s.R[6] = temp[0];
      s.R[7] = temp[1];
      s.R[8] = temp[2];
      break;
    case "D'":
      s.D = rotateFaceCCW(s.D);
      temp = [s.F[6], s.F[7], s.F[8]];
      s.F[6] = s.R[6];
      s.F[7] = s.R[7];
      s.F[8] = s.R[8];
      s.R[6] = s.B[6];
      s.R[7] = s.B[7];
      s.R[8] = s.B[8];
      s.B[6] = s.L[6];
      s.B[7] = s.L[7];
      s.B[8] = s.L[8];
      s.L[6] = temp[0];
      s.L[7] = temp[1];
      s.L[8] = temp[2];
      break;
    case "F":
      s.F = rotateFaceCW(s.F);
      temp = [s.U[6], s.U[7], s.U[8]];
      s.U[6] = s.L[8];
      s.U[7] = s.L[5];
      s.U[8] = s.L[2];
      s.L[2] = s.D[0];
      s.L[5] = s.D[1];
      s.L[8] = s.D[2];
      s.D[0] = s.R[6];
      s.D[1] = s.R[3];
      s.D[2] = s.R[0];
      s.R[0] = temp[0];
      s.R[3] = temp[1];
      s.R[6] = temp[2];
      break;
    case "F'":
      s.F = rotateFaceCCW(s.F);
      temp = [s.U[6], s.U[7], s.U[8]];
      s.U[6] = s.R[0];
      s.U[7] = s.R[3];
      s.U[8] = s.R[6];
      s.R[0] = s.D[2];
      s.R[3] = s.D[1];
      s.R[6] = s.D[0];
      s.D[0] = s.L[2];
      s.D[1] = s.L[5];
      s.D[2] = s.L[8];
      s.L[2] = temp[2];
      s.L[5] = temp[1];
      s.L[8] = temp[0];
      break;
    case "B":
      s.B = rotateFaceCW(s.B);
      temp = [s.U[0], s.U[1], s.U[2]];
      s.U[0] = s.R[2];
      s.U[1] = s.R[5];
      s.U[2] = s.R[8];
      s.R[2] = s.D[8];
      s.R[5] = s.D[7];
      s.R[8] = s.D[6];
      s.D[8] = s.L[6];
      s.D[7] = s.L[3];
      s.D[6] = s.L[0];
      s.L[0] = temp[2];
      s.L[3] = temp[1];
      s.L[6] = temp[0];
      break;
    case "B'":
      s.B = rotateFaceCCW(s.B);
      temp = [s.U[0], s.U[1], s.U[2]];
      s.U[0] = s.L[6];
      s.U[1] = s.L[3];
      s.U[2] = s.L[0];
      s.L[0] = s.D[6];
      s.L[3] = s.D[7];
      s.L[6] = s.D[8];
      s.D[6] = s.R[8];
      s.D[7] = s.R[5];
      s.D[8] = s.R[2];
      s.R[2] = temp[0];
      s.R[5] = temp[1];
      s.R[8] = temp[2];
      break;
  }

  return s;
}

// Apply a sequence of moves
export function applyMoves(state: CubeState, moves: string[]): CubeState {
  return moves.reduce((s, m) => applyMove(s, m), state);
}

// Generate a random scramble
export function generateScramble(length = 20): string[] {
  const faces = ["R", "L", "U", "D", "F", "B"];
  const modifiers = ["", "'", "2"];
  const scramble: string[] = [];
  let lastFace = "";

  for (let i = 0; i < length; i++) {
    let face: string;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
    } while (face === lastFace);
    lastFace = face;

    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(face + mod);
  }

  return scramble;
}
