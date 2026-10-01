import type { Length, Shape } from '../lacquer'

/*
 * Where each nail goes, from MediaPipe's two sets of hand landmarks: the image
 * ones say where the finger is in the frame, the world ones (metres, roughly
 * camera-aligned) say how it is turned. Rendered with an orthographic camera
 * at `scale` pixels per metre, a nail built in metres along these axes lands on
 * the finger and foreshortens exactly as the finger does.
 *
 * Axes of the result: x right, y up, z towards the viewer. `cuticle` is in
 * image pixels (y down), like the landmarks.
 */

export type Landmark = { x: number; y: number; z: number }
export type V3 = { x: number; y: number; z: number }

export type NailPose3d = {
  finger: number
  cuticle: { x: number; y: number }
  depth: number
  lateral: V3
  dir: V3
  normal: V3
  /** metres */
  width: number
  /** metres, cuticle to free edge */
  length: number
  /** pixels per metre */
  scale: number
  /** extra scale along the finger, so the nail matches the phalanx as the image shows it */
  stretch: number
  /** 0..1: fades a nail out as its finger turns edge-on */
  visible: number
}

/* thumb, index, middle, ring, little finger: last joint, tip, and a nail plate width of an adult hand */
const FINGERS = [
  { dip: 3, tip: 4, width: 0.0145, cuticle: 0.2 },
  { dip: 7, tip: 8, width: 0.0115, cuticle: 0.24 },
  { dip: 11, tip: 12, width: 0.012, cuticle: 0.24 },
  { dip: 15, tip: 16, width: 0.011, cuticle: 0.24 },
  { dip: 19, tip: 20, width: 0.0092, cuticle: 0.24 },
]

/* free edge past the fingertip, as a share of the last phalanx */
const FREE_EDGE: Record<Length, number> = { short: 0.12, medium: 0.4, long: 0.78 }
const SHAPE_REACH: Record<Shape, number> = { square: 0.9, squoval: 0.9, oval: 0.95, almond: 1, coffin: 1.05, lipstick: 1.05, stiletto: 1.22 }

const BONES = [
  [0, 5], [5, 6], [6, 7], [0, 9], [9, 10], [10, 11], [0, 13], [13, 14], [0, 17], [17, 18], [1, 2], [2, 3],
] as const

const v = (x: number, y: number, z: number): V3 => ({ x, y, z })
const sub = (a: V3, b: V3) => v(a.x - b.x, a.y - b.y, a.z - b.z)
const add = (a: V3, b: V3) => v(a.x + b.x, a.y + b.y, a.z + b.z)
const mul = (a: V3, k: number) => v(a.x * k, a.y * k, a.z * k)
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: V3, b: V3) => v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)
const len = (a: V3) => Math.hypot(a.x, a.y, a.z)
const norm = (a: V3) => mul(a, 1 / (len(a) || 1))

/* MediaPipe world space (y down, smaller z closer) to ours (y up, z towards the viewer) */
const world = (p: Landmark) => v(p.x, -p.y, -p.z)

/** Pixels per metre, from the image length of several bones over their length across the image plane. */
export function handScale(image: Landmark[], wl: Landmark[], w: number, h: number) {
  let px = 0
  let m = 0
  for (const [a, b] of BONES) {
    px += Math.hypot((image[a].x - image[b].x) * w, (image[a].y - image[b].y) * h)
    m += Math.hypot(wl[a].x - wl[b].x, wl[a].y - wl[b].y)
  }
  return m > 1e-6 ? px / m : 0
}

export function nailPoses3d(image: Landmark[], wl: Landmark[], w: number, h: number, look: { shape: Shape; length: Length }): NailPose3d[] {
  const scale = handScale(image, wl, w, h)
  const W = wl.map(world)
  /* a bigger hand gets bigger nails; MediaPipe's metres are an estimate, so the range is kept sane */
  const size = Math.min(1.25, Math.max(0.8, len(sub(W[9], W[0])) / 0.09))

  let palm = norm(cross(sub(W[5], W[0]), sub(W[17], W[0])))
  if (palm.z < 0) palm = mul(palm, -1)
  const outward = norm(sub(W[2], W[5]))

  const px = (i: number) => ({ x: image[i].x * w, y: image[i].y * h })

  return FINGERS.map((f, finger) => {
    const dir = norm(sub(W[f.tip], W[f.dip]))
    /* the nail faces where the back of the hand faces; the thumb's nail is turned outwards as well */
    const facing = finger === 0 ? norm(add(mul(palm, 0.6), mul(outward, 0.8))) : palm
    let normal = norm(sub(facing, mul(dir, dot(facing, dir))))
    if (normal.z < 0) normal = mul(normal, -1)
    const lateral = norm(cross(dir, normal))

    const phalanx = len(sub(W[f.tip], W[f.dip]))
    let width = f.width * size
    /* fingers held together cannot carry nails wider than the gap between them */
    if (finger > 0) {
      const gaps = [finger - 1, finger + 1]
        .filter((n) => n >= 1 && n <= 4)
        .map((n) => {
          const a = px(f.dip)
          const b = px(FINGERS[n].dip)
          return Math.hypot(a.x - b.x, a.y - b.y)
        })
      const room = (Math.min(...gaps) * 0.9) / (scale || 1)
      if (room > 0) width = Math.min(width, room)
    }
    const length = phalanx * (1 - f.cuticle) + phalanx * FREE_EDGE[look.length] * SHAPE_REACH[look.shape]

    const a = px(f.dip)
    const b = px(f.tip)
    /* landmarks sit at the bone, the nail on top of the finger: lift it along its normal */
    const lift = width * 0.35 * scale
    const cuticle = { x: a.x + (b.x - a.x) * f.cuticle + normal.x * lift, y: a.y + (b.y - a.y) * f.cuticle - normal.y * lift }
    const depth = (W[f.dip].z + (W[f.tip].z - W[f.dip].z) * f.cuticle) * scale
    const visible = Math.min(1, Math.max(0, (normal.z - 0.15) / 0.2))
    /* MediaPipe's metres and the image disagree on how long a phalanx looks; the image wins */
    const seen = Math.hypot(b.x - a.x, b.y - a.y)
    const across = Math.max(0.35, Math.hypot(dir.x, dir.y))
    const stretch = Math.min(1.6, Math.max(0.5, seen / (phalanx * across * (scale || 1))))

    return { finger, cuticle, depth, lateral, dir, normal, width, length, scale, stretch, visible }
  })
}

/**
 * Whether the camera sees the back of the hand (where the nails are). Seen from
 * the back, a right hand runs index to little finger clockwise in the image.
 */
export function showsNails(lm: Landmark[], label: string) {
  const w = lm[0]
  const a = { x: lm[5].x - w.x, y: lm[5].y - w.y }
  const b = { x: lm[17].x - w.x, y: lm[17].y - w.y }
  const turn = a.x * b.y - a.y * b.x
  return label === 'Right' ? turn > 0 : turn < 0
}
