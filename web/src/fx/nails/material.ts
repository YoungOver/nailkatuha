import { Color, MeshPhysicalMaterial } from 'three'
import type { Finish } from '../lacquer'

export type LacquerUniforms = {
  uFrom: { value: Color }
  uTo: { value: Color }
  uProgress: { value: number }
  uCat: { value: number }
  uBand: { value: number }
  uFrench: { value: number }
  uTime: { value: number }
}

/* Target surface for each finish; the scene eases the live material towards it.
   Clearcoat and iridescence never reach exactly 0: at 0 three.js drops them from
   the shader and has to compile a new program, which froze the page on a click. */
export const FINISH_LOOK: Record<Finish, { roughness: number; metalness: number; clearcoat: number; iridescence: number; cat: number; shade: number }> = {
  gloss: { roughness: 0.3, metalness: 0, clearcoat: 1, iridescence: 0.001, cat: 0, shade: 1 },
  cateye: { roughness: 0.35, metalness: 0.1, clearcoat: 1, iridescence: 0.001, cat: 1, shade: 0.45 },
  chrome: { roughness: 0.12, metalness: 1, clearcoat: 1, iridescence: 1, cat: 0, shade: 1 },
  matte: { roughness: 0.62, metalness: 0, clearcoat: 0.001, iridescence: 0.001, cat: 0, shade: 0.9 },
}

/**
 * Physical lacquer with two painted effects injected into the standard shader:
 * a wet coat that runs from cuticle (uv.y = 0) to free edge when the colour
 * changes, and a cat-eye band of glitter whose position follows the pointer,
 * the way magnetic gel moves under a magnet.
 */
export function createLacquerMaterial(hex: string, french = 0) {
  const color = new Color(hex)
  const uniforms: LacquerUniforms = {
    uFrom: { value: color.clone() },
    uTo: { value: color.clone() },
    uProgress: { value: 1.2 },
    uCat: { value: 0 },
    uBand: { value: 0.5 },
    uFrench: { value: french },
    uTime: { value: 0 },
  }

  const m = new MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    iridescence: 0.001,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [120, 480],
  })
  m.defines = { ...m.defines, USE_UV: '' }

  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uFrom;
uniform vec3 uTo;
uniform float uProgress;
uniform float uCat;
uniform float uBand;
uniform float uFrench;
uniform float uTime;
float nkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float nkWet = smoothstep(uProgress - 0.14, uProgress, vUv.y);
vec3 nkBase = mix(uTo, uFrom, nkWet);
float nkTip = smoothstep(0.8, 0.84, vUv.y) * uFrench;
nkBase = mix(nkBase, vec3(0.96, 0.94, 0.92), nkTip);
vec4 diffuseColor = vec4( nkBase, opacity );`,
      )
      .replace(
        '#include <opaque_fragment>',
        `float nkFront = max(0.0, 1.0 - abs(vUv.y - uProgress) * 9.0) * step(uProgress, 1.1);
outgoingLight += nkFront * 0.18;
float nkBandPos = (vUv.x - uBand) * 5.5 + (vUv.y - 0.55) * 1.4;
float nkBand = exp(-nkBandPos * nkBandPos);
vec2 nkCell = floor(vUv * vec2(90.0, 150.0));
float nkSpark = step(0.86, nkHash(nkCell + floor(uTime * 3.0)));
outgoingLight += uCat * nkBand * (0.55 * mix(vec3(1.0), uTo, 0.6) + nkSpark * 0.9);
#include <opaque_fragment>`,
      )
  }

  return { material: m, uniforms }
}
