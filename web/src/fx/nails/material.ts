import { Color, MeshPhysicalMaterial } from 'three'
import type { Finish } from '../lacquer'

export type LacquerUniforms = {
  uFrom: { value: Color }
  uTo: { value: Color }
  uProgress: { value: number }
  uCat: { value: number }
  uBand: { value: number }
  uFrench: { value: number }
  uShimmer: { value: number }
  uPearl: { value: number }
  uVelvet: { value: number }
  uOmbre: { value: number }
  uShade: { value: number }
  uFade: { value: number }
  uGlint: { value: number }
  uTime: { value: number }
}

export type Look = {
  roughness: number
  metalness: number
  clearcoat: number
  iridescence: number
  shade: number
  cat: number
  shimmer: number
  pearl: number
  velvet: number
  french: number
  ombre: number
}

const BASE: Look = { roughness: 0.3, metalness: 0, clearcoat: 1, iridescence: 0.001, shade: 1, cat: 0, shimmer: 0, pearl: 0, velvet: 0, french: 0, ombre: 0 }

/* Target surface for each finish; scenes ease the live material towards it, so a
   switch melts from one coat into the next. Clearcoat and iridescence never reach
   exactly 0: at 0 three.js drops them from the shader and has to compile a new
   program, which froze the page on a click. */
export const FINISH_LOOK: Record<Finish, Look> = {
  gloss: BASE,
  matte: { ...BASE, roughness: 0.62, clearcoat: 0.001, shade: 0.9 },
  chrome: { ...BASE, roughness: 0.12, metalness: 1, iridescence: 1 },
  cateye: { ...BASE, roughness: 0.35, metalness: 0.1, shade: 0.45, cat: 1 },
  shimmer: { ...BASE, roughness: 0.26, metalness: 0.25, iridescence: 0.2, shade: 0.95, shimmer: 1 },
  pearl: { ...BASE, roughness: 0.24, metalness: 0.12, iridescence: 0.8, pearl: 1 },
  velvet: { ...BASE, roughness: 0.55, metalness: 0.2, clearcoat: 0.3, shade: 0.55, velvet: 1 },
  french: { ...BASE, french: 1 },
  ombre: { ...BASE, ombre: 1 },
}

/** Eases `look` towards the finish's target; `k` is the share of the way covered this frame. */
export function easeLook(look: Look, finish: Finish, k: number) {
  const goal = FINISH_LOOK[finish]
  for (const key of Object.keys(look) as (keyof Look)[]) look[key] += (goal[key] - look[key]) * k
}

/** Puts the eased look on one nail's material. */
export function applyLook(m: MeshPhysicalMaterial, u: LacquerUniforms, l: Look) {
  m.roughness = l.roughness
  m.metalness = l.metalness
  m.clearcoat = l.clearcoat
  m.iridescence = l.iridescence
  u.uShade.value = l.shade
  u.uCat.value = l.cat
  u.uShimmer.value = l.shimmer
  u.uPearl.value = l.pearl
  u.uVelvet.value = l.velvet
  u.uFrench.value = l.french
  u.uOmbre.value = l.ombre
}

/**
 * Physical lacquer with painted effects injected into the standard shader: a
 * wet coat that runs from cuticle (uv.y = 0) to free edge when the colour
 * changes; a cat-eye band of glitter that follows the pointer like magnetic
 * gel under a magnet; fine shimmer; a pearl sheen; velvet dust that glows at
 * grazing angles; a French tip with a curved smile line; and an ombre from
 * nude at the cuticle into the colour.
 */
export function createLacquerMaterial(hex: string) {
  const color = new Color(hex)
  const uniforms: LacquerUniforms = {
    uFrom: { value: color.clone() },
    uTo: { value: color.clone() },
    uProgress: { value: 1.2 },
    uCat: { value: 0 },
    uBand: { value: 0.5 },
    uFrench: { value: 0 },
    uShimmer: { value: 0 },
    uPearl: { value: 0 },
    uVelvet: { value: 0 },
    uOmbre: { value: 0 },
    uShade: { value: 1 },
    uFade: { value: 0 },
    uGlint: { value: 0 },
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
uniform float uShimmer;
uniform float uPearl;
uniform float uVelvet;
uniform float uOmbre;
uniform float uShade;
uniform float uFade;
uniform float uGlint;
uniform float uTime;
float nkHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
const vec3 nkNude = vec3(0.7, 0.34, 0.29);`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float nkWet = smoothstep(uProgress - 0.14, uProgress, vUv.y);
vec3 nkColor = mix(uTo, uFrom, nkWet) * uShade;
vec3 nkBase = mix(nkColor, mix(nkNude, nkColor, smoothstep(0.16, 0.88, vUv.y)), uOmbre);
nkBase = mix(nkBase, mix(nkBase, vec3(1.0), 0.42), uPearl);
float nkSide = abs(vUv.x * 2.0 - 1.0);
float nkSmile = 0.79 - 0.15 * nkSide * nkSide;
float nkTip = smoothstep(nkSmile - 0.012, nkSmile + 0.012, vUv.y);
nkBase = mix(nkBase, mix(nkNude, nkColor, nkTip), uFrench);
/* on a finger the plate rolls away at the sides, which reads as darker edges */
nkBase *= 1.0 - uFade * 0.3 * pow(nkSide, 2.2);
/* on a real finger the plate tucks under the cuticle and the side folds: those edges melt into the skin */
float nkEdge = smoothstep(0.0, 0.12, vUv.y) * mix(0.55, 1.0, smoothstep(0.0, 0.1, min(vUv.x, 1.0 - vUv.x)));
vec4 diffuseColor = vec4( nkBase, opacity * mix(1.0, nkEdge, uFade) );`,
      )
      .replace(
        '#include <opaque_fragment>',
        `vec3 nkView = normalize(vViewPosition);
float nkFres = pow(1.0 - clamp(dot(normal, nkView), 0.0, 1.0), 2.0);
float nkFront = max(0.0, 1.0 - abs(vUv.y - uProgress) * 9.0) * step(uProgress, 1.1);
outgoingLight += nkFront * 0.18;
float nkBandPos = (vUv.x - uBand) * 5.5 + (vUv.y - 0.55) * 1.4;
float nkBand = exp(-nkBandPos * nkBandPos);
vec2 nkCell = floor(vUv * vec2(90.0, 150.0));
float nkSpark = step(0.86, nkHash(nkCell + floor(uTime * 3.0)));
outgoingLight += uCat * nkBand * (0.55 * mix(vec3(1.0), uTo, 0.6) + nkSpark * 0.9);
vec2 nkFine = floor(vUv * vec2(170.0, 290.0));
float nkTwinkle = step(0.94, nkHash(nkFine)) * (0.5 + 0.5 * sin(uTime * 4.0 + nkHash(nkFine + 7.0) * 40.0));
outgoingLight += uShimmer * nkTwinkle * (0.7 * vec3(1.0) + 0.6 * uTo);
outgoingLight += uPearl * nkFres * vec3(0.3, 0.27, 0.33);
float nkDust = step(0.55, nkHash(nkFine + 3.0)) * nkHash(nkFine + 11.0);
float nkWide = exp(-pow((vUv.x - uBand) * 2.2 + (vUv.y - 0.5) * 0.8, 2.0));
outgoingLight += uVelvet * nkDust * (0.25 + 0.9 * nkFres + 0.5 * nkWide) * mix(vec3(1.0), uTo, 0.65);
/* the long window glint and a small dot near the free edge that a camera sees on any glossy nail */
float nkStreakX = 0.33 + 0.03 * sin(uTime * 0.6);
float nkStreak = exp(-pow((vUv.x - nkStreakX) / 0.07, 2.0)) * smoothstep(0.06, 0.3, vUv.y) * (1.0 - smoothstep(0.7, 0.95, vUv.y));
float nkDot = exp(-pow((vUv.x - 0.64) / 0.05, 2.0) - pow((vUv.y - 0.84) / 0.04, 2.0));
outgoingLight += uGlint * (nkStreak * 0.85 + nkDot * 0.5);
#include <opaque_fragment>`,
      )
  }

  return { material: m, uniforms }
}
