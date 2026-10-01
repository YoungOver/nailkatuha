import { BufferGeometry, Float32BufferAttribute, Shape, type Vector2 } from 'three'

export type NailShape = 'square' | 'almond' | 'stiletto' | 'coffin'

export type NailSpec = { shape: NailShape; width: number; length: number }

/*
 * A press-on tip seen from above: cuticle at y = 0, free edge at y = length.
 * The cuticle end is a soft convex arc; the free edge depends on the shape.
 */
function outlineShape(shape: NailShape, w: number, l: number): Shape {
  const hw = w / 2
  const h0 = 0.16 * w
  const s = new Shape()
  s.moveTo(-hw, h0)
  s.bezierCurveTo(-hw, -0.04 * w, hw, -0.04 * w, hw, h0)

  switch (shape) {
    case 'square': {
      const r = 0.1 * w
      s.lineTo(hw, l - r)
      s.quadraticCurveTo(hw, l, hw - r, l)
      s.lineTo(-hw + r, l)
      s.quadraticCurveTo(-hw, l, -hw, l - r)
      break
    }
    case 'almond':
      s.lineTo(hw, 0.5 * l)
      s.bezierCurveTo(hw, 0.82 * l, 0.18 * w, l, 0, l)
      s.bezierCurveTo(-0.18 * w, l, -hw, 0.82 * l, -hw, 0.5 * l)
      break
    case 'stiletto':
      s.lineTo(hw, 0.38 * l)
      s.bezierCurveTo(hw, 0.7 * l, 0.05 * w, 0.93 * l, 0, l)
      s.bezierCurveTo(-0.05 * w, 0.93 * l, -hw, 0.7 * l, -hw, 0.38 * l)
      break
    case 'coffin':
      s.lineTo(hw, 0.55 * l)
      s.lineTo(0.27 * w, 0.975 * l)
      s.quadraticCurveTo(0.25 * w, l, 0.2 * w, l)
      s.lineTo(-0.2 * w, l)
      s.quadraticCurveTo(-0.25 * w, l, -0.27 * w, 0.975 * l)
      s.lineTo(-hw, 0.55 * l)
      break
  }
  s.lineTo(-hw, h0)
  return s
}

export function nailOutline(shape: NailShape, width: number, length: number): Vector2[] {
  return outlineShape(shape, width, length).getSpacedPoints(240)
}

/** Left and right edge of the outline polygon at height y. */
function extentsAt(poly: Vector2[], y: number): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue
    const x = a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x)
    lo = Math.min(lo, x)
    hi = Math.max(hi, x)
  }
  return lo === Infinity ? [0, 0] : [lo, hi]
}

/**
 * Builds the tip as a shell on a grid (rows along the nail, columns across it)
 * so the inside has vertices to bend: a transverse C-curve like a real nail,
 * a slight fall towards the free edge, a constant thickness and side walls.
 * uv.x runs across the nail, uv.y from cuticle to free edge.
 */
export function buildNailGeometry({ shape, width, length }: NailSpec): BufferGeometry {
  const ROWS = 72
  const COLS = 28
  const thickness = 0.045 * width
  const dome = 0.22 * width
  const poly = nailOutline(shape, width, length)
  let yMin = Infinity
  let yMax = -Infinity
  for (const p of poly) {
    yMin = Math.min(yMin, p.y)
    yMax = Math.max(yMax, p.y)
  }

  const positions: number[] = []
  const uvs: number[] = []
  const surface = (sign: 1 | -1) => {
    for (let j = 0; j <= ROWS; j++) {
      const v = j / ROWS
      const y = yMin + 1e-4 + (yMax - yMin - 2e-4) * v
      const [lo, hi] = extentsAt(poly, y)
      for (let i = 0; i <= COLS; i++) {
        const u = i / COLS
        const x = lo + (hi - lo) * u
        const t = Math.min(1, Math.abs(x) / (width / 2))
        const z = dome * (1 - t * t) - 0.07 * length * v * v + (sign * thickness) / 2
        positions.push(x, y - yMin, z)
        uvs.push(u, v)
      }
    }
  }
  surface(1)
  surface(-1)

  const idx = (layer: number, j: number, i: number) => layer * (ROWS + 1) * (COLS + 1) + j * (COLS + 1) + i
  const indices: number[] = []
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const [a, b, c, d] = [idx(0, j, i), idx(0, j, i + 1), idx(0, j + 1, i), idx(0, j + 1, i + 1)]
      indices.push(a, b, d, a, d, c)
      const [e, f, g, h] = [idx(1, j, i), idx(1, j, i + 1), idx(1, j + 1, i), idx(1, j + 1, i + 1)]
      indices.push(e, h, f, e, g, h)
    }
  }
  for (let j = 0; j < ROWS; j++) {
    for (const [i, flip] of [[0, true], [COLS, false]] as const) {
      const [a, b, c, d] = [idx(0, j, i), idx(0, j + 1, i), idx(1, j, i), idx(1, j + 1, i)]
      if (flip) indices.push(a, c, d, a, d, b)
      else indices.push(a, b, d, a, d, c)
    }
  }
  for (let i = 0; i < COLS; i++) {
    for (const [j, flip] of [[0, false], [ROWS, true]] as const) {
      const [a, b, c, d] = [idx(0, j, i), idx(0, j, i + 1), idx(1, j, i), idx(1, j, i + 1)]
      if (flip) indices.push(a, c, d, a, d, b)
      else indices.push(a, b, d, a, d, c)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}
