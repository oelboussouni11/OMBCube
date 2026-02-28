"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Cubie from "./Cubie";

const COLORS = {
  white: "#ffffff",
  yellow: "#ffd500",
  red: "#b71234",
  orange: "#ff5800",
  blue: "#0046ad",
  green: "#009b48",
  black: "#1a1a1a",
};

function getCubieColors(
  x: number,
  y: number,
  z: number,
): [string, string, string, string, string, string] {
  const right = x === 1 ? COLORS.red : COLORS.black;
  const left = x === -1 ? COLORS.orange : COLORS.black;
  const top = y === 1 ? COLORS.white : COLORS.black;
  const bottom = y === -1 ? COLORS.yellow : COLORS.black;
  const front = z === 1 ? COLORS.green : COLORS.black;
  const back = z === -1 ? COLORS.blue : COLORS.black;

  return [right, left, top, bottom, front, back];
}

function CubeGroup() {
  const cubies = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubies.push(
          <Cubie
            key={`${x}-${y}-${z}`}
            position={[x * 1.05, y * 1.05, z * 1.05]}
            colors={getCubieColors(x, y, z)}
          />,
        );
      }
    }
  }

  return <group>{cubies}</group>;
}

export default function RubiksCube() {
  return (
    <Canvas camera={{ position: [4, 3, 4], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <CubeGroup />
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
