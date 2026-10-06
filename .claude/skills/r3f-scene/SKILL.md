---
name: r3f-scene
description: Use when writing, reviewing, or debugging 3D code in this repo — React Three Fiber v9 / drei v10 / three r186 components under components/scene, GLTF models and bones, shaders and materials, useFrame animation, scroll-driven scene state, or symptoms like jank, GC stutter, memory leaks, bind-pose flash, bones drifting, flickering transparency, washed-out colors, model culled/disappearing, or hydration errors around the Canvas.
---

# R3F in this repo

Stack (installed): next 16.3 · react 19.2 · @react-three/fiber 9.8 · drei 10.7 · three 0.186 · zustand 5. gsap/lenis are installed but **unused** — scroll is a native overflow panel (`components/landing/LandingPage.tsx`) writing `useProgressStore`.

Core rule: **React mounts the scene graph; per-frame change is imperative mutation in `useFrame`.** Training data is mostly r14x/R3F v8 — when unsure, grep `node_modules/three/src` or `node_modules/@react-three/*/dist` instead of guessing.

## Load the matching reference before editing
| Task | Read |
|---|---|
| Shader, `onBeforeCompile`, ShaderMaterial, colors, textures, tone mapping | `shaders-and-color.md` |
| GLB file, gltf-transform, `useGLTF`, skeleton, `AnimationMixer`, bone posing | `gltf-and-animation.md` (+ `docs/CHAMELEON_MODEL_CONTRACT.md`) |
| FPS, memory, draw calls, visual bugs, postprocessing, dev tools, screenshots, a11y | `performance-and-debugging.md` |

## Architecture (keep it)
- `SceneLoader` (client) → `dynamic(() => import("Scene"), { ssr: false })`. `ssr:false` is only legal in Client Components; never import `Canvas` from a Server Component.
- DOM → 3D: zustand `lib/progressStore` → `ScrollSync` reads `getState()` in `useFrame` → smooths into mutable `stateRef` (`SceneState`) → consumers read `stateRef.current` in `useFrame`. `ScrollSync` must mount before consumers (same-priority `useFrame`s run in subscription order).
- Discrete events (section change): `store.subscribe` in `useEffect`, write uniforms/refs, return the unsubscribe.
- Pure three builders in `*.ts` (`branchGeometry`, `foliageLayout`, `chameleonMaterials`); components only wire them. Imperative mutators live outside components (React lint can't follow them).
- `MODEL_PATH` (`modelPath.ts`) is shared by `preload()` in `app/[locale]/layout.tsx` and `useGLTF.preload`. `/models/*` is served `immutable` → **change a model = new filename**, never overwrite.
- `ReadySignal` placed last inside the `<Suspense>` mounts only after every suspended asset resolved — that is the "ready" event for the loading veil.

## Rules
| Do | Don't |
|---|---|
| Mutate refs / uniforms / `stateRef` in `useFrame` | `setState` or store `set` per frame; `useStore(selector)` for per-frame values |
| Module-scope scratch `Vector3`/`Quaternion` | `new THREE.*` inside `useFrame` (GC stutter) |
| Clamp delta (`Math.min(delta, 1/20)`); damping `x += (t - x) * (1 - Math.exp(-k * dt))` | `lerp(a, b, 0.1)` per frame (fps-dependent) |
| `useThree((s) => s.camera)` selectors | `const { camera, size } = useThree()` |
| `useMemo` for objects you `new` + `useEffect(() => () => x.dispose(), [x])` | Assuming R3F disposes `<primitive>` / imperative objects (it only disposes JSX-declared ones) |
| `dispose={null}` on groups holding cached `useGLTF` content | Disposing loader-cached geometry/textures another instance uses |
| Respect `stateRef.current.reducedMotion` in every animated thing | Animating unconditionally |
| Types: `ThreeElements['mesh']`, `declare module '@react-three/fiber' { interface ThreeElements {...} }` | v8 `MeshProps`/`Object3DNode`, global `JSX.IntrinsicElements` |
| `state.pointer` | `state.mouse` (deprecated) |
| Toggle `visible` | Mount/unmount scene parts at runtime (recompiles shaders) |

## R3F v9 facts that differ from v8
- Canvas defaults: `ACESFilmicToneMapping` (unless `flat`), sRGB output (unless `linear`), `antialias`, `dpr [1,2]`. Texture JSX props are **not** auto-converted to sRGB in general — set `colorSpace` yourself.
- `gl` prop accepts object, renderer, or `(defaults) => Renderer | Promise<Renderer>` (async → WebGPU possible, but this project's GLSL would not port; stay on WebGL).
- `extend(Class)` returns a component; `extend({...})` registers names. DOM-clashing elements renamed: `threeLine`, `threePath`, `threeAudio`.
- `useFrame(cb, priority)`: any **positive** priority disables auto-render — only use if you call `gl.render` yourself. Use negative to run earlier.
- `<Canvas shadows>` sets `PCFSoftShadowMap`, which r186 replaces with PCF + console warning → use `shadows="percentage"` / `"variance"` if shadows are ever added.
- Peers: react `>=19 <19.4`. StrictMode is inherited from the React tree — don't add another inside Canvas.

## Corner cases
- **StrictMode**: mount → cleanup → mount. Stopped actions, listeners, subscriptions must be restored in the effect body (idempotent).
- **First frames**: `matrixWorld` is stale before the first render — call `updateMatrixWorld(true)` or guard (`frames > N`) before world-space math.
- **Camera fit**: compute in `useLayoutEffect` on `size`, then `updateProjectionMatrix()`.
- **Events / cursor tracking**: canvas listens on its wrapper div inside `ChameleonStage`, so `state.pointer` only updates while the cursor is over the stage. Any page-wide cursor feature (head/eye look-at, parallax) needs `eventSource={document.body}` + `eventPrefix="client"` on the Canvas (or a window `pointermove` writing a ref).
- **Where state lives**: values shared by several scene components (scroll-derived, pointer-derived) → `SceneState`, written by one sync component. Values one component owns (springs, attention, wave clock) → local `useRef`.
- **renderOrder slots**: foliage uses 10–59 (back 10+, mid 30+, front 50+). Things behind the chameleon go below 10 (negative is fine); never reuse a slot for overlapping transparent meshes.
- **Shadows** (off now): `shadows="percentage"`, `castShadow` set **imperatively** on the cloned skinned meshes (JSX can't reach them), `receiveShadow` on the branch, tight `shadow-camera-*` bounds, `shadow-normalBias≈0.02`. A culled skinned mesh also loses its shadow — see culling in `gltf-and-animation.md`.
- **Scroll libs** (if adopted): GSAP/Lenis write plain numbers into the store; R3F reads them in `useFrame`. Don't tween three objects from `gsap.ticker`. drei `ScrollControls` conflicts with the native panel — don't use it.

## Before finishing
`npm run lint` and `npx tsc --noEmit`. In `npm run dev`: no console warnings (`THREE.WebGLProgram`, `WebGLShadowMap`, unknown uniforms), `gl.info.memory` flat across navigations. If the model changed, re-run the contract checks in `gltf-and-animation.md`.
