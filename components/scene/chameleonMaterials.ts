import * as THREE from "three";

export type SkinUniforms = {
  uFrom: THREE.IUniform<THREE.Color>;
  uTo: THREE.IUniform<THREE.Color>;
  /** Position of the color wave along BodyAxis: 0 = nose, WAVE_DONE = whole body already recolored. */
  uFront: THREE.IUniform<number>;
};

export type EyeUniforms = {
  /** Pupil scale: 1 = rest, >1 = dilated. */
  uPupil: THREE.IUniform<number>;
};

export const WAVE_DONE = 1.25;
const WAVE_SOFTNESS = 0.25;

/** Skin: hue wave from head to tail along BodyAxis (uv1), keeping the baked scale shading. */
export function createSkinMaterial(source: THREE.MeshStandardMaterial, geometry: THREE.BufferGeometry) {
  const bodyAxis = geometry.getAttribute("uv1");
  if (!bodyAxis) throw new Error("Chameleon_Body has no TEXCOORD_1 (BodyAxis)");
  // Three only declares `uv1` for materials that sample a second UV set, so expose it under our own name.
  if (!geometry.getAttribute("aBodyAxis")) geometry.setAttribute("aBodyAxis", bodyAxis);

  const uniforms: SkinUniforms = {
    uFrom: { value: new THREE.Color() },
    uTo: { value: new THREE.Color() },
    uFront: { value: WAVE_DONE },
  };
  const material = source.clone();
  // Matte skin: the baked scale shading should read, not a plastic highlight.
  material.roughness = 0.9;
  if (material instanceof THREE.MeshPhysicalMaterial) material.specularIntensity = 0.25;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aBodyAxis;\nvarying float vBodyAxis;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBodyAxis = aBodyAxis.x;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vBodyAxis;\nuniform vec3 uFrom;\nuniform vec3 uTo;\nuniform float uFront;"
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        {
          float waveMask = 1.0 - smoothstep(uFront - ${WAVE_SOFTNESS.toFixed(2)}, uFront, vBodyAxis);
          vec3 tint = mix(uFrom, uTo, waveMask);
          float shade = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(diffuseColor.rgb, tint * (0.3 + shade * 1.9), 0.68);
        }`
      );
  };
  material.customProgramCacheKey = () => "chameleon-skin-wave";
  return { material, uniforms };
}

const IRIS_OUTER = 0.47;
const PUPIL_REST = 0.1;

/** Eye: the iris texture is projected along the gaze, pupil centered at uv (0.5, 0.5). Dilation squeezes uv radially. */
export function createEyeMaterial(source: THREE.MeshStandardMaterial) {
  const uniforms: EyeUniforms = { uPupil: { value: 1 } };
  const material = source.clone();
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uPupil;")
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
        {
          vec2 fromCenter = vMapUv - 0.5;
          float radius = length(fromCenter);
          float pupil = min(${PUPIL_REST.toFixed(2)} * uPupil, ${(IRIS_OUTER - 0.05).toFixed(2)});
          float sourceRadius = radius;
          if (radius < ${IRIS_OUTER.toFixed(2)}) {
            sourceRadius = radius < pupil
              ? radius * (${PUPIL_REST.toFixed(2)} / pupil)
              : ${PUPIL_REST.toFixed(2)} + (radius - pupil) * (${(IRIS_OUTER - PUPIL_REST).toFixed(2)} / (${IRIS_OUTER.toFixed(2)} - pupil));
          }
          vec2 irisUv = 0.5 + fromCenter * (sourceRadius / max(radius, 1e-5));
          vec4 sampledDiffuseColor = texture2D( map, irisUv );
          diffuseColor *= sampledDiffuseColor;
        }
        #endif`
      );
  };
  material.customProgramCacheKey = () => "chameleon-iris-pupil";
  return { material, uniforms };
}
