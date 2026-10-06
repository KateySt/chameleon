# GLTF assets, skinned meshes, AnimationMixer

Source of truth for bone names, axes, clips, UVs: `docs/CHAMELEON_MODEL_CONTRACT.md` (Russian). If the model changes, update the contract first.

## Current asset (`npx @gltf-transform/cli inspect public/models/chameleon.glb`)
1.76 MB, glTF-Transform 4.5. Required extensions: `EXT_meshopt_compression`, `KHR_mesh_quantization`, `EXT_texture_webp`. Body 34k verts, eyes 1.5k. 2 skins × 35 joints, clips `walk` (2 s) and `eyes_look` (6 s). Textures WebP 2048² — small download but ~22 MB VRAM each (WebP doesn't reduce GPU memory; KTX2 would).

## Optimizing a new model
```bash
npx @gltf-transform/cli optimize in.glb public/models/chameleon-v2.glb \
  --compress meshopt --texture-compress webp --simplify false
```
- Write to a **new filename** (immutable cache) and update `MODEL_PATH`.
- `--simplify false` always for the hero model (simplify is not skin-aware; distorts weights and the `uv1` BodyAxis).
- Safe for rigs: `flatten`, `join`, `instance`, `palette`, `resample`, `weld` (they skip skinned/animated nodes). Risky: `prune` removes non-joint, un-animated empty leaf nodes — `HeadLook` survives only because it is in `skin.joints`.
- meshopt also compresses animation; Draco doesn't. Prefer meshopt.
- KTX2 (`gltf-transform uastc` for normal maps, `etc1s` for baseColor) needs the `ktx` binary and a `KTX2Loader` with `.detectSupport(gl)` — not configured by drei automatically.

**Verify after every export/optimize** — `inspect` output must show: 35 joints, node `HeadLook`, animations `walk` + `eyes_look`, `TEXCOORD_1` on `Chameleon_Body`.

## Loading
- drei `useGLTF(path, useDraco = true, useMeshopt = true, extendLoader?)` — uses **three-stdlib**'s GLTFLoader (the `GLTF` type imported from `three/examples/jsm` is only a cast). Meshopt decoder is embedded WASM; Draco defaults to the gstatic CDN — if a model is ever Draco'd, self-host: copy `node_modules/three/examples/jsm/libs/draco` to `public/draco/` and pass `"/draco/"`.
- KTX2: `useGLTF(path, true, true, (loader) => loader.setKTX2Loader(new KTX2Loader().setTranscoderPath("/basis/").detectSupport(gl)))` — needs `gl`, so it can't be done in module-level `preload`.
- `three/addons/*` and `three/examples/jsm/*` both resolve to the same files.
- `useGLTF.preload(path)` at module bottom + `preload(path, { as: "fetch", crossOrigin: "anonymous" })` in the layout.
- gltfjsx (6.5) — for types only on rigs: `npx gltfjsx model.glb --types` (no `--transform`; run gltf-transform yourself).

## Skinned meshes
- `useGLTF` returns a **shared cached** scene. Before mutating materials/bones: `const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])` then `useGraph(clone)` for `nodes`/`materials`. Geometry stays shared (don't dispose it).
- Node names are sanitized by `PropertyBinding`: whitespace → `_`, `[ ] . : /` stripped (`Bone.001` → `Bone001`). Look up by the sanitized name.
- Don't re-parent bones out of the clone — the mixer finds them under its root.
- **Culling**: `SkinnedMesh` bounding sphere is computed once from the pose at that moment and never refreshed. If the posed mesh leaves it (coiled tail, big moves) it gets culled → set `frustumCulled = false` on the skinned meshes, or call `computeBoundingSphere()` after posing (CPU cost, 34k verts).
- GLTFLoader already normalizes skin weights; textures on glTF UVs need `flipY = false` if you load them yourself.

## AnimationMixer
- Own mixer on the clone (`new AnimationMixer(clone)` in `useMemo`) — not drei `useAnimations`, which runs `mixer.update` in its own `useFrame` so you can't control order.
- Per frame: **set action times → `mixer.update(delta)` → code on top (look-at, tail, IK, colliders)**.
- Scrub: `action.paused = true; action.play(); action.time = phase * clip.duration`. Don't use `mixer.setTime()` — it resets **all** actions.
- `clipAction` is cached per clip+root+blendMode. `makeClipAdditive` **mutates** the clip in place — clone the clip first.
- Start actions in `useMemo` (render) to avoid a bind-pose flash on frame 1; replay idempotently in `useEffect` (StrictMode cleanup does `stopAllAction()`). On final unmount: `stopAllAction()` + `uncacheRoot(clone)`.

### ⚠ The mixer does not reset unchanged bones
`PropertyMixer.apply` calls `binding.setValue` **only when the blended value differs from last frame**. For a paused clip, or a held keyframe (`eyes_look` between jumps), the mixer writes nothing — so `bone.quaternion.multiply(delta)` on a clip-bound bone **accumulates every frame** and drifts/spins.

Safe patterns for bones a clip animates (the mixer compares against its **own** buffer, not the bone — so you must keep the bone holding the clip value yourself):
1. **Absolute from a cached base** (current tail code): `bone.quaternion.copy(rest[i]).multiply(offset)`.
2. **Restore → update → capture** (for blending with a clip):
```ts
for (const e of eyes) e.bone.quaternion.copy(e.clipPose); // bone holds clip value even if mixer skips the write
mixer.update(delta);
for (const e of eyes) e.clipPose.copy(e.bone.quaternion); // fresh clip pose
// ...then code:
e.bone.quaternion.copy(e.clipPose).slerp(e.aim, attention); // 0 = clip, 1 = code — never slerp from the bone's current value
```
Bones without tracks (`HeadLook`) are never touched by the mixer — write them absolutely every frame.

Note: the comment at `startClips` in `Chameleon.tsx` ("mixer restores the rest pose each frame and code offsets never accumulate") is **wrong** — don't rely on it.

### Pose order within the frame
mixer → `HeadLook` (absolute) → `head.updateMatrixWorld(true)` → eyes (they use `Head` space via `worldToLocal`, which needs this frame's matrices) → tail → colliders. Clamp angles (eyes ±40°, HeadLook yaw ±30° / pitch ±15°) relative to the **bind rest** quaternion captured during render before the first `mixer.update`.

## Procedural bones
- Bones point along local **+Y**; `Object3D.lookAt` aims +Z — don't use it on bones.
- Look-at in parent space: `target → parent.worldToLocal(p)`, `dir = p - bone.position`, normalize; `q.setFromUnitVectors(restDirInParent, dir)`; `bone.quaternion.copy(q).multiply(restQuat)`.
- Clamp: `Quaternion.angleTo` / `rotateTowards(target, maxStep)`; smooth with `MathUtils.damp(x, y, λ, dt)` or `slerp(target, 1 - Math.exp(-λ * dt))`. Contract limits: HeadLook yaw ±30° (local Z), pitch ±15° (local X); eyes ±40°.
- IK: `three/addons/animation/CCDIKSolver.js` (`new CCDIKSolver(skinnedMesh, iks)`, `update()` after `mixer.update`; indices into `skeleton.bones`).
- World-space math needs `updateMatrixWorld(true)` first (see `keepTailOutOfBranch`).
