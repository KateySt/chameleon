# Performance, debugging, verification

Installed: no r3f-perf, leva, postprocessing, Playwright or vitest. Adding any is a dependency decision — ask first.

## Measure before optimizing
- `gl.info.render.calls` / `.triangles`, `gl.info.memory.geometries` / `.textures`. `info.autoReset` is true → read inside `useFrame` after render (or `autoReset = false` + `gl.info.reset()`).
- In dev, `useThree((s) => s.gl)` and log, or drei `<StatsGl />` (bundled, lightweight). Dev-only tools: `process.env.NODE_ENV !== "production"` + `dynamic(..., { ssr: false })` so prod tree-shakes them.
- Spector.js (browser extension) for per-draw-call state and shader source; three.js DevTools extension for the scene graph.

## Budgets
| Item | Target |
|---|---|
| Draw calls | ≤ ~100 mobile, a few hundred desktop (each foliage leaf = 1 call) |
| DPR | cap 2 (`dpr={[1, 2]}`); lower on decline via drei `<PerformanceMonitor onDecline={() => setDpr(1)}>` |
| Textures | ≤ 2048²; 2048² RGBA ≈ 22 MB VRAM with mips; KTX2 4–8× less |
| Shadow maps | 512–1024 mobile; `gl.shadowMap.autoUpdate = false` for static |
| Near/far | keep ratio small (now 0.1/50) |

## Techniques
- Repeated mesh → `InstancedMesh` / drei `<Instances>`; different geometries one material → `BatchedMesh`; static parts → `BufferGeometryUtils.mergeGeometries` (old `mergeBufferGeometries` is gone).
- Transparency costs CPU sort + overdraw: prefer `alphaTest` where edges allow; else fixed `renderOrder`.
- Shader warmup (first-frame hitch): `await gl.compileAsync(scene, camera)` or drei `<Preload all />` (sync `gl.compile`).
- Pause when not visible: scene animates constantly so `frameloop="always"`; use IntersectionObserver + `visibilitychange` → `useThree((s) => s.setFrameloop)("never" | "always")`.
- Postprocessing: `@react-three/postprocessing` 3.x (needs fiber ≥9.7; `postprocessing` 6.39 supports three <0.187). Effects are merged into one pass; set `gl={{ antialias: false }}` and use composer `multisampling`. Fullscreen passes cost fill-rate × DPR². On this **alpha canvas over the page**, bloom/tone-mapping passes can produce halos/opaque edges — avoid unless asked, and test edges.

## Symptom → cause
| Symptom | Likely cause / fix |
|---|---|
| Washed-out / too dark custom material | ShaderMaterial missing `tonemapping_fragment` + `colorspace_fragment`; color texture without `SRGBColorSpace`; `setRGB` given sRGB values |
| Transparent planes flicker/pop | Distance re-sorting → unique fixed `renderOrder`, `depthWrite: false`; DoubleSide transparent self-sorts badly |
| Skinned model vanishes at some angles | Stale skinned bounding sphere → `frustumCulled = false` or recompute |
| Bones slowly drift / spin | Relative rotation on a clip-bound bone with paused/held clip (see `gltf-and-animation.md`) |
| Bind-pose (T-pose) flash on load | Actions started in `useEffect` instead of during render |
| Shader warning / black mesh | `.replace` target chunk renamed (`output_fragment`, `encodings_fragment`); NaN from `normalize(0)`, `pow(neg)`, `sqrt(neg)`, `/0` |
| Textures upside down | Self-loaded texture on glTF UVs needs `flipY = false` |
| Z-fighting | near/far ratio, `polygonOffset` |
| Shadow acne / peter-panning | `bias ≈ -0.0005`, `normalBias ≈ 0.02`; fit shadow camera |
| "PCFSoftShadowMap has been removed" | `<Canvas shadows>` default → `shadows="percentage"` |
| Memory grows across navigations | Undisposed imperative/primitive objects or cloned materials |
| Stutter every few seconds | Allocations in `useFrame` (GC) |
| Foliage parallax freezes | DOM covers the canvas wrapper → `eventSource={document.body}` + `eventPrefix="client"` |
| Black canvas after GPU reset | context lost → listen `webglcontextlost` on `gl.domElement`, show static fallback |

## UX / a11y
- `prefers-reduced-motion` → `stateRef.current.reducedMotion` (already wired); consider `frameloop="demand"` when reduced.
- No WebGL: `WebGL.isWebGL2Available()` from `three/addons/capabilities/WebGL.js` → static poster image.
- Canvas is decorative: `aria-hidden`; real content in DOM. Reserve its box (no CLS). Canvas isn't an LCP candidate — ship text/poster so LCP doesn't wait on the GLB.

## Verifying a visual change
1. `npx tsc --noEmit` + `npm run lint`.
2. `npm run dev`, open the page, check console for three/R3F warnings, scroll through all sections (color wave, walk, tail), toggle OS reduced motion.
3. Screenshots in headless Chromium need software GL: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (`--disable-gpu` breaks WebGL). Wait for the ready veil to fade + a few rAFs. `toDataURL` needs `preserveDrawingBuffer: true` (test builds only).
4. Pure math helpers (`branchGeometry`, `foliageLayout`, `lib/oklch`) are unit-testable in Node — three math needs no DOM.
