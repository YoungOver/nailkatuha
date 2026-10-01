import type { Finish, Shape } from '../lacquer'

export type Pt = { x: number; y: number; z?: number }
export type NailPose = { cx: number; cy: number; angle: number; len: number; width: number }
export type Look = { hex: string; finish: Finish; shape: Shape }

/* MediaPipe hand landmarks: fingertip and the joint below it, and how wide the nail is relative to that phalanx */
export const FINGERS = [
  { tip: 4, dip: 3, width: 0.64 },
  { tip: 8, dip: 7, width: 0.56 },
  { tip: 12, dip: 11, width: 0.58 },
  { tip: 16, dip: 15, width: 0.54 },
  { tip: 20, dip: 19, width: 0.48 },
]

/** How far past the fingertip the nail grows, as a share of the natural nail length. */
export function shapeReach(shape: Shape) {
  return { square: 0.18, almond: 0.38, coffin: 0.46, stiletto: 0.72 }[shape]
}

/**
 * Where each nail plate sits in pixels. The plate covers the outer part of the
 * last phalanx: from about 40 % of the way from the joint to the tip and a
 * little past the tip landmark, which marks the pad, not the free edge.
 */
export function nailPoses(lm: Pt[], w: number, h: number): NailPose[] {
  return FINGERS.map((f) => {
    const tx = lm[f.tip].x * w
    const ty = lm[f.tip].y * h
    const dx = tx - lm[f.dip].x * w
    const dy = ty - lm[f.dip].y * h
    const seg = Math.hypot(dx, dy) || 1
    const start = 0.42
    const end = 1.08
    const len = seg * (end - start)
    const mid = start + (end - start) / 2
    return {
      cx: tx - dx + dx * mid,
      cy: ty - dy + dy * mid,
      angle: Math.atan2(dy, dx),
      len,
      width: seg * f.width,
    }
  })
}

/**
 * The back of the hand faces the camera when the turn from the index knuckle to
 * the little-finger knuckle (seen from the wrist) goes one way for a left hand
 * and the other way for a right hand. Only then are the nails visible.
 * `label` is MediaPipe's handedness for the frame as it was given to the model.
 */
export function showsNails(lm: Pt[], label: string) {
  const w = lm[0]
  const a = { x: lm[5].x - w.x, y: lm[5].y - w.y }
  const b = { x: lm[17].x - w.x, y: lm[17].y - w.y }
  const turn = a.x * b.y - a.y * b.x
  return label === 'Right' ? turn > 0 : turn < 0
}

/** Outline of one nail in its own frame: x from the cuticle (−len/2) towards the free edge, y across. */
export function tracePlate(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, pose: NailPose, shape: Shape) {
  const L = pose.len
  const hw = pose.width / 2
  const x0 = -L / 2
  const x1 = L / 2 + L * shapeReach(shape)
  ctx.beginPath()
  ctx.moveTo(x0 + hw * 0.55, -hw)
  ctx.lineTo(x1 - (shape === 'square' ? hw * 0.25 : L * 0.35), -hw)
  if (shape === 'square') {
    ctx.quadraticCurveTo(x1, -hw, x1, -hw * 0.6)
    ctx.lineTo(x1, hw * 0.6)
    ctx.quadraticCurveTo(x1, hw, x1 - hw * 0.25, hw)
  } else if (shape === 'coffin') {
    ctx.lineTo(x1, -hw * 0.45)
    ctx.lineTo(x1, hw * 0.45)
    ctx.lineTo(x1 - L * 0.35, hw)
  } else {
    const sharp = shape === 'stiletto' ? 0.02 : 0.22
    ctx.bezierCurveTo(x1 - L * 0.1, -hw, x1, -hw * sharp * 2, x1, 0)
    ctx.bezierCurveTo(x1, hw * sharp * 2, x1 - L * 0.1, hw, x1 - L * 0.35, hw)
  }
  ctx.lineTo(x0 + hw * 0.55, hw)
  /* the cuticle end is a soft arc */
  ctx.bezierCurveTo(x0 - hw * 0.15, hw, x0 - hw * 0.15, -hw, x0 + hw * 0.55, -hw)
  ctx.closePath()
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${c((n >> 16) & 255)} ${c((n >> 8) & 255)} ${c(n & 255)})`
}

/** Paints one lacquered nail: colour across the C-curve, then the finish (gloss streak, chrome sheen, cat-eye band). */
export function paintNail(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, pose: NailPose, look: Look, time: number) {
  ctx.save()
  ctx.translate(pose.cx, pose.cy)
  ctx.rotate(pose.angle)
  tracePlate(ctx, pose, look.shape)
  const hw = pose.width / 2
  const across = ctx.createLinearGradient(0, -hw, 0, hw)
  if (look.finish === 'chrome') {
    across.addColorStop(0, shade(look.hex, 0.55))
    across.addColorStop(0.3, '#ffffff')
    across.addColorStop(0.55, shade(look.hex, 1.15))
    across.addColorStop(1, shade(look.hex, 0.5))
  } else {
    const dark = look.finish === 'cateye' ? 0.35 : 0.72
    across.addColorStop(0, shade(look.hex, dark))
    across.addColorStop(0.45, shade(look.hex, look.finish === 'cateye' ? 0.55 : 1))
    across.addColorStop(1, shade(look.hex, dark * 0.9))
  }
  ctx.fillStyle = across
  ctx.globalAlpha = 0.94
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.clip()
  if (look.finish === 'gloss' || look.finish === 'chrome') {
    const L = pose.len
    ctx.fillStyle = `rgb(255 255 255 / ${look.finish === 'chrome' ? 0.55 : 0.42})`
    ctx.beginPath()
    ctx.ellipse(L * 0.05, -hw * 0.38, L * 0.42, hw * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  if (look.finish === 'cateye') {
    const band = Math.sin(time * 1.2) * hw * 0.5
    const g = ctx.createLinearGradient(0, band - hw * 0.45, 0, band + hw * 0.45)
    g.addColorStop(0, 'rgb(255 255 255 / 0)')
    g.addColorStop(0.5, shade(look.hex, 1.6))
    g.addColorStop(1, 'rgb(255 255 255 / 0)')
    ctx.fillStyle = g
    ctx.fillRect(-pose.len, -hw, pose.len * 3, hw * 2)
  }
  if (look.finish === 'matte') {
    ctx.fillStyle = 'rgb(255 255 255 / 0.08)'
    ctx.fillRect(-pose.len, -hw, pose.len * 3, hw * 2)
  }
  ctx.restore()
}
