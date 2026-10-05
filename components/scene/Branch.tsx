"use client";

import { useEffect, useMemo } from "react";
import { createBranchGeometry } from "@/components/scene/branchGeometry";

type BranchProps = {
  length: number;
};

/** Procedural stand-in until public/models/branch.glb exists. Top surface is at Y = 0. */
export function Branch({ length }: BranchProps) {
  const geometry = useMemo(() => createBranchGeometry(length), [length]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#5b3f26" roughness={0.95} metalness={0} />
    </mesh>
  );
}
