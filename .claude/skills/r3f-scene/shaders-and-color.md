# Shaders, materials, color — three r186

Verified against `node_modules/three@0.186.1`. Paths relative to `node_modules/three/`.

## Color management
- `ColorManagement.enabled = true`, working space **linear sRGB**. Renderer output sRGB; R3F adds ACES tone mapping unless `<Canvas flat>`.
- `Texture.colorSpace` default `NoColorSpace`. Set `SRGBColorSpace` on **color** data only: `map`, `emissiveMap`, `sheenColorMap`, `specularColorMap`, LDR env. Normal/roughness/metalness/ao/alpha/displacement stay `NoColorSpace`.
- GLTFLoader already tags glTF color textures sRGB. Textures you load yourself (`useTexture`) and pass as **uniforms** are never converted — set it in the `useTexture` onLoad callback (see `Foliage.tsx`).
- `Color`: `setHex`/`setStyle`/`new Color('#hex')` assume sRGB input → convert to linear. `setRGB`/`setHSL` assume **linear** unless you pass the 4th arg (`THREE.SRGBColorSpace`). `setStyle` does **not** parse `oklch()` — use `lib/oklch.ts` (`oklchToLinearRgb`) then `setRGB(r, g, b, LinearSRGBColorSpace)`.
- Uniform `vec3` colors are linear.
- Old names that no longer exist: `texture.encoding`, `sRGBEncoding`, `renderer.outputEncoding`, `physicallyCorrectLights`, `useLegacyLights`. Light intensities are physical (point/spot in candela, `decay` 2). `ColorManagement.toWorkingColorSpace` → `colorSpaceToWorking` (old name warns).

## Custom ShaderMaterial
Non-raw ShaderMaterial is compiled as GLSL 3 (`#version 300 es`) with compat defines, so `gl_FragColor`, `texture2D`, `attribute`, `varying` still work. With `glslVersion: THREE.GLSL3` you declare `out vec4` yourself. RawShaderMaterial gets **nothing** (no prefix, no built-in uniforms, no chunks).

Output conversion is **not automatic**. End the fragment shader with:
```glsl
gl_FragColor = vec4(color, alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
Missing these → foliage/custom quads look washed-out or too dark next to standard materials. `toneMapped: false` opts out. Defaults: `lights: false`, `fog: false`; use `defines` for compile-time switches.

## onBeforeCompile (patching built-in materials)
Pattern used in `chameleonMaterials.ts`:
```ts
const uniforms = { uFront: { value: 0 } };           // keep this reference; mutate .value per frame
const material = source.clone();                       // clone FIRST — clone() drops onBeforeCompile
material.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform float uFront;")
    .replace("#include <map_fragment>", "#include <map_fragment>\n/* edit diffuseColor */");
};
material.customProgramCacheKey = () => "unique-name"; // else programs get shared wrongly
```
- `material.clone()`/`copy()` copy **neither** `onBeforeCompile` nor `customProgramCacheKey` — always assign after cloning.
- Default cache key is `onBeforeCompile.toString()`; if injected code depends on runtime values (template literals), give a unique key per variant.
- `shader.uniforms` exists only after first compile — never read it before; write through your own `uniforms` object.
- Verify every `.replace` target exists — a missed include fails silently. Check with `grep -l "<chunk>" node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js`.

### Chunk names in r186 (`src/renderers/shaders/ShaderChunk/`)
Vertex: `common`, `begin_vertex` (`transformed`), `beginnormal_vertex` (`objectNormal`), `skinbase_vertex`, `skinning_vertex`, `skinnormal_vertex`, `morphtarget_vertex`, `project_vertex`, `worldpos_vertex`, `uv_vertex`.
Fragment: `common`, `map_fragment` (`diffuseColor`), `color_fragment`, `alphamap_fragment`, `alphatest_fragment`, `roughnessmap_fragment`, `normal_fragment_begin`, `normal_fragment_maps`, `emissivemap_fragment`, `lights_fragment_begin`, `opaque_fragment`, `tonemapping_fragment`, `colorspace_fragment`, `fog_fragment`, `premultiplied_alpha_fragment`, `dithering_fragment`.
**Removed names**: `output_fragment` → `opaque_fragment`; `encodings_fragment` → `colorspace_fragment`.

### UV / attributes
- Attributes: `uv, uv1, uv2, uv3` (old `uv2` = today's `uv1`).
- Each map has its own varying: `vMapUv`, `vNormalMapUv`, `vAlphaMapUv`… `vUv` exists only under `USE_UV`.
- `attribute vec2 uv1` is declared only if some map uses channel 1 → for custom per-vertex data alias it: `geometry.setAttribute("aBodyAxis", geometry.getAttribute("uv1"))` and declare `attribute vec2 aBodyAxis;` yourself.
- Skinned meshes: edit `transformed` after `begin_vertex` (pre-skinning, model space); skinning applies after.

## WebGPU / TSL (don't migrate casually)
`three/webgpu` + `three/tsl` exist; R3F v9 can take an async `gl` factory. But WebGPURenderer **ignores `onBeforeCompile`** and has no ShaderMaterial mapping — every custom shader here would need a TSL rewrite. Stay on WebGLRenderer unless the task is that migration.

## Disposal
Dispose yourself: geometries, materials, textures, render targets you create or clone. `material.dispose()` does **not** dispose its textures. Loader-cached textures/models are shared — clear via `useGLTF.clear(path)` / `useTexture.clear(path)`, not `dispose()`.

## Transparency
- Glows / accent-colored effects: ACES tone mapping desaturates them — use `toneMapped: false` (and skip `tonemapping_fragment`) when the color must match the CSS accent exactly.
- The canvas is `alpha: true` (premultiplied) over the page: `AdditiveBlending` writes little alpha, so the result depends on the page background behind it. Prefer `NormalBlending` with a soft alpha falloff; if you use additive, check it over every section background.

Overlapping transparent quads: `depthWrite: false` + **unique, fixed `renderOrder`** per mesh, else they re-sort by distance each frame and flicker. Where edges allow, `alphaTest` + `depthWrite: true` is cheaper (no sorting). Objects repositioned by code outside their geometry bounds: `frustumCulled = false`.
