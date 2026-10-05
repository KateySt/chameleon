import * as THREE from "three";

export type LeafTextureName = "leaf-fern" | "leaf-palm2" | "monstera-a";

export const LEAF_TEXTURE_NAMES: readonly LeafTextureName[] = [
  "leaf-fern", "leaf-palm2", "monstera-a",
];

// Cut-outs cleaned of neighbouring leaf fragments, light fringes and hard rectangular edges (see public/images/landing/clean).
export const leafTexturePath = (name: LeafTextureName) => `/images/landing/clean/${name}.png`;

type Layer = "front" | "mid" | "back";

/** Per-layer look: depth as a fraction of the camera distance to the branch, tint, texture blur (mip bias), parallax. */
const LAYERS: Record<Layer, { depth: number; tint: [number, number, number]; bias: number; parallax: number; wind: number }> = {
  front: { depth: 0.55, tint: [0.3, 0.46, 0.3], bias: 2.4, parallax: 0.05, wind: 1.0 },
  mid: { depth: 0.85, tint: [0.5, 0.72, 0.46], bias: 0.9, parallax: 0.025, wind: 0.8 },
  back: { depth: 1.55, tint: [0.2, 0.36, 0.28], bias: 2.8, parallax: 0.01, wind: 0.5 },
};

type LeafSpec = {
  texture: LeafTextureName;
  layer: Layer;
  /** Horizontal anchor across the view: -1 = left edge, 1 = right edge. */
  x: number;
  /** Vertical anchor of the leaf base: -1 = bottom edge of the view. */
  y: number;
  /** Leaf height as a fraction of the view height. */
  size: number;
  /** Tilt around the view axis, radians (positive = counter-clockwise). */
  tilt: number;
  flip?: boolean;
};

const LEAVES: readonly LeafSpec[] = [
  { texture: "leaf-palm2", layer: "back", x: -0.55, y: -1.0, size: 0.50, tilt: -0.1 },
  { texture: "leaf-fern", layer: "back", x: 0.7, y: -1.0, size: 0.48, tilt: 0.1, flip: true },
  { texture: "monstera-a", layer: "mid", x: -0.15, y: -1.04, size: 0.19, tilt: 0.2 },
  { texture: "leaf-fern", layer: "mid", x: 0.4, y: -1.02, size: 0.24, tilt: -0.1 },
  { texture: "monstera-a", layer: "mid", x: -0.78, y: -1.02, size: 0.19, tilt: -0.25, flip: true },
  { texture: "leaf-palm2", layer: "front", x: -0.95, y: -1.08, size: 0.29, tilt: -0.15 },
  { texture: "monstera-a", layer: "front", x: -0.42, y: -1.12, size: 0.17, tilt: 0.12, flip: true },
  { texture: "monstera-a", layer: "front", x: 0.12, y: -1.14, size: 0.15, tilt: -0.2, flip: true },
  { texture: "leaf-fern", layer: "front", x: 0.62, y: -1.1, size: 0.26, tilt: 0.05, flip: true },
  { texture: "leaf-palm2", layer: "front", x: 0.98, y: -1.1, size: 0.26, tilt: 0.1, flip: true },
];

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform float uSpeed;
uniform float uPhase;
uniform float uScroll;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  // Sway grows toward the tip (uv.y); gusts come from a slow beat of two sines.
  float bend = uv.y * uv.y;
  float gust = sin(uTime * 0.31 + uPhase * 2.0) * sin(uTime * 0.17 + uPhase);
  gust = max(gust, 0.0);
  float sway = sin(uTime * uSpeed + uPhase + uv.y * 1.6) * 0.6
             + sin(uTime * uSpeed * 2.3 + uPhase * 1.7 + uv.y * 3.1) * 0.18
             + gust * 0.9;
  float offset = (sway * uWind + uScroll) * 0.09 * bend;
  p.x += offset;
  p.y -= abs(offset) * 0.35; // keep the leaf length roughly constant while it bends
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uTint;
uniform float uBias;
varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uMap, vUv, uBias);
  float alpha = smoothstep(0.3, 0.85, tex.a);
  // Darker toward the bottom edge, so the foliage melts into the undergrowth.
  float shade = mix(0.4, 1.0, smoothstep(0.0, 0.55, vUv.y));
  gl_FragColor = vec4(tex.rgb * uTint * shade, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export type FoliageLeaf = {
  mesh: THREE.Mesh;
  spec: LeafSpec;
  uniforms: {
    uTime: THREE.IUniform<number>;
    uScroll: THREE.IUniform<number>;
    uWind: THREE.IUniform<number>;
  };
  aspect: number;
};

export type Foliage = {
  root: THREE.Group;
  leaves: FoliageLeaf[];
  dispose: () => void;
};

export function buildFoliage(textures: Record<LeafTextureName, THREE.Texture>): Foliage {
  const root = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(1, 1, 6, 14);
  geometry.translate(0, 0.5, 0); // origin at the leaf base, uv.y = 0 there
  const materials: THREE.ShaderMaterial[] = [];

  const leaves = LEAVES.map((spec, index) => {
    const layer = LAYERS[spec.layer];
    const texture = textures[spec.texture];
    const image = texture.image as { width: number; height: number };
    const uniforms = {
      uMap: { value: texture },
      uTint: { value: new THREE.Vector3(...layer.tint) },
      uBias: { value: layer.bias },
      uTime: { value: 0 },
      uWind: { value: layer.wind },
      uSpeed: { value: 0.7 + (index % 4) * 0.13 },
      uPhase: { value: index * 1.9 },
      uScroll: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // positions are rewritten every frame from the camera
    // A unique order per leaf: otherwise three re-sorts overlapping transparent leaves by distance as they move, and they flicker.
    mesh.renderOrder = (spec.layer === "back" ? 10 : spec.layer === "mid" ? 30 : 50) + index;
    root.add(mesh);
    return { mesh, spec, uniforms, aspect: image.width / image.height };
  });

  return {
    root,
    leaves,
    dispose: () => {
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    },
  };
}

type FoliageFrame = {
  time: number;
  scrollSpeed: number;
  pointerX: number;
  pointerY: number;
  animate: boolean;
};

/** Pins the foliage to the camera and lays every leaf out in screen space, then advances the wind. */
export function updateFoliage(
  foliage: Foliage,
  camera: THREE.PerspectiveCamera,
  focusDistance: number,
  frame: FoliageFrame
) {
  foliage.root.position.copy(camera.position);
  foliage.root.quaternion.copy(camera.quaternion);
  const halfTan = Math.tan((camera.fov * Math.PI) / 360);

  for (const leaf of foliage.leaves) {
    const layer = LAYERS[leaf.spec.layer];
    const depth = focusDistance * layer.depth;
    const viewHeight = 2 * halfTan * depth;
    const viewWidth = viewHeight * camera.aspect;
    const height = viewHeight * leaf.spec.size;
    const parallaxX = frame.animate ? -frame.pointerX * layer.parallax * viewWidth : 0;
    const parallaxY = frame.animate ? -frame.pointerY * layer.parallax * viewHeight * 0.5 : 0;

    leaf.mesh.position.set((leaf.spec.x * viewWidth) / 2 + parallaxX, (leaf.spec.y * viewHeight) / 2 + parallaxY, -depth);
    leaf.mesh.rotation.set(0, 0, leaf.spec.tilt);
    leaf.mesh.scale.set(height * leaf.aspect * (leaf.spec.flip ? -1 : 1), height, 1);

    leaf.uniforms.uTime.value = frame.time;
    leaf.uniforms.uWind.value = frame.animate ? layer.wind : 0;
    leaf.uniforms.uScroll.value = frame.animate ? frame.scrollSpeed * layer.wind * 1.4 : 0;
  }
}
