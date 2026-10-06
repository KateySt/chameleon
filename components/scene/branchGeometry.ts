import * as THREE from "three";

/** Mean branch radius around the chameleon, and the Y of its axis (top surface of the branch is at Y = 0). */
export const BRANCH_RADIUS = 0.16;
export const BRANCH_AXIS_Y = -BRANCH_RADIUS;
/** Largest radius the surface bumps can reach; the tail collider uses it so nothing ever pokes through. */
export const BRANCH_RADIUS_MAX = BRANCH_RADIUS * 1.09;

/** Gentle vertical wave of the branch axis at branch-local X; feet follow it so they stay planted. */
export function branchSag(x: number): number {
  return 0.02 * Math.sin(x * 0.9);
}

/** Gnarled, slightly tapering branch along X whose top surface sits at Y = 0 (where the chameleon's feet are). */
export function createBranchGeometry(length: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(BRANCH_RADIUS * 0.94, BRANCH_RADIUS * 1.06, length, 28, 96, false);
  geometry.rotateZ(Math.PI / 2);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, y);
    const bump =
      1 + 0.04 * Math.sin(x * 9 + angle * 3) + 0.03 * Math.sin(x * 23 - angle * 5) + 0.015 * Math.sin(x * 51 + angle * 9);
    position.setXYZ(i, x, y * bump + branchSag(x) + BRANCH_AXIS_Y, z * bump);
  }
  geometry.computeVertexNormals();
  return geometry;
}
