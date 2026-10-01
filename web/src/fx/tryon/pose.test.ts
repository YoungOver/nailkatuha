import { describe, expect, it } from 'vitest'
import { handScale, nailPoses3d, showsNails, type Landmark } from './pose'

/*
 * A flat hand, back to the camera, fingers up, in MediaPipe conventions (y down,
 * smaller z closer). The image is the world scaled by 5000 px per metre on a
 * 1000 × 1000 frame, so every expected size is easy to check by hand.
 */
function hand(tilt = 0): { image: Landmark[]; world: Landmark[] } {
  const world: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  world[1] = { x: -0.03, y: -0.03, z: 0 }
  world[2] = { x: -0.05, y: -0.05, z: 0 }
  world[3] = { x: -0.065, y: -0.07, z: 0 }
  world[4] = { x: -0.075, y: -0.09, z: 0 }
  ;[-0.03, -0.01, 0.01, 0.03].forEach((x, i) => {
    const b = 5 + i * 4
    world[b] = { x, y: -0.09, z: 0 }
    world[b + 1] = { x, y: -0.135, z: 0 }
    /* `tilt` bends the last phalanx towards the camera, as when a finger points at it */
    world[b + 2] = { x, y: -0.16, z: 0 }
    world[b + 3] = { x, y: -0.16 - 0.025 * Math.cos(tilt), z: -0.025 * Math.sin(tilt) }
  })
  const image = world.map((p) => ({ x: 0.5 + p.x * 5, y: 0.9 + p.y * 5, z: p.z * 5 }))
  return { image, world }
}

const look = { shape: 'almond' as const, length: 'medium' as const }

describe('nails placed from hand landmarks', () => {
  it('measures pixels per metre from the bones', () => {
    const { image, world } = hand()
    expect(handScale(image, world, 1000, 1000)).toBeCloseTo(5000, -1)
  })

  it('lays every nail on the last phalanx, facing the camera, pointing along the finger', () => {
    const { image, world } = hand()
    const poses = nailPoses3d(image, world, 1000, 1000, look)
    expect(poses).toHaveLength(5)
    for (const p of poses.slice(1)) {
      expect(p.normal.z).toBeGreaterThan(0.99)
      expect(p.dir.y).toBeGreaterThan(0.99)
      /* the cuticle sits between the DIP joint (y 100 px) and the tip (y −25 px) */
      expect(p.cuticle.y).toBeLessThan(100)
      expect(p.cuticle.y).toBeGreaterThan(-25)
      expect(p.visible).toBe(1)
      expect(p.stretch).toBeCloseTo(1, 1)
    }
  })

  it('sizes a nail by the finger, not by how long the phalanx looks', () => {
    const { image, world } = hand()
    const [thumb, index, , , pinky] = nailPoses3d(image, world, 1000, 1000, look)
    expect(index.width * index.scale).toBeGreaterThan(45)
    expect(index.width * index.scale).toBeLessThan(75)
    expect(thumb.width).toBeGreaterThan(index.width)
    expect(pinky.width).toBeLessThan(index.width)
  })

  it('grows the free edge with the chosen length and shape', () => {
    const { image, world } = hand()
    const len = (shape: 'square' | 'stiletto', length: 'short' | 'long') => nailPoses3d(image, world, 1000, 1000, { shape, length })[2].length
    expect(len('square', 'long')).toBeGreaterThan(len('square', 'short') * 1.5)
    expect(len('stiletto', 'long')).toBeGreaterThan(len('square', 'long'))
  })

  it('fades a nail out as its finger turns edge-on to the camera', () => {
    const { image, world } = hand(1.45)
    const [, index] = nailPoses3d(image, world, 1000, 1000, look)
    expect(index.visible).toBeLessThan(0.5)
  })

  it('tells the back of a hand from the palm', () => {
    const { image } = hand()
    const mirrored = image.map((p) => ({ ...p, x: 1 - p.x }))
    expect(showsNails(image, 'Right')).not.toBe(showsNails(image, 'Left'))
    expect(showsNails(mirrored, 'Right')).toBe(showsNails(image, 'Left'))
  })

  it('stretches a nail along the finger when the image shows the phalanx longer than the metres say', () => {
    const { image, world } = hand()
    /* the image's index tip lies further out than its world landmark: a finger seen at a different angle */
    image[8] = { ...image[8], y: image[8].y - 0.06 }
    const [, index, middle] = nailPoses3d(image, world, 1000, 1000, look)
    expect(index.stretch).toBeGreaterThan(1.3)
    expect(middle.stretch).toBeCloseTo(1, 1)
  })
})
