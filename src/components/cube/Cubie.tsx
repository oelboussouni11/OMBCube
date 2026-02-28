"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface CubieProps {
  position: [number, number, number];
  colors: [string, string, string, string, string, string];
}

export default function Cubie({ position, colors }: CubieProps) {
  const materials = useMemo(
    () =>
      colors.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color,
            roughness: 0.3,
            metalness: 0.1,
          }),
      ),
    [colors],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    // Round the edges
    return new THREE.BoxGeometry(0.95, 0.95, 0.95, 1, 1, 1);
  }, []);

  return <mesh position={position} material={materials} geometry={geometry} />;
}
