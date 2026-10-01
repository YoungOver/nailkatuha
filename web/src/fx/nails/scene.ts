import {
  ACESFilmicToneMapping,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
} from 'three'
import type { Finish, Shape } from '../lacquer'
import { buildNailGeometry } from './geometry'
import { createLacquerMaterial, FINISH_LOOK, type LacquerUniforms } from './material'

export type NailState = { hex: string; finish: Finish; shape: Shape }

type Finger = { x: number; y: number; angle: number; length: number; width: number }

/* A press-on set as if on an invisible hand: thumb low and wide, middle finger longest. */
const FINGERS: Finger[] = [
  { x: -1.62, y: -1.05, angle: 38, length: 1.3, width: 0.74 },
  { x: -0.8, y: 0.02, angle: 11, length: 1.62, width: 0.6 },
  { x: 0.02, y: 0.3, angle: 0, length: 1.78, width: 0.62 },
  { x: 0.84, y: 0.08, angle: -10, length: 1.66, width: 0.58 },
  { x: 1.56, y: -0.48, angle: -21, length: 1.36, width: 0.5 },
]

/* the set spans about x -2.5..2.0 and y -1.6..2.2 (the thumb reaches further left) */
const SET_WIDTH = 5.4
const SET_HEIGHT = 4.3
const CAMERA_Z = 7.2
const FOV = 30

/*
 * Studio light: a few emissive panels rendered once into a prefiltered
 * environment map, like softboxes in product photography. It gives the
 * lacquer its long glossy highlights without downloading an HDR file.
 */
function buildStudio(gl: WebGLRenderer) {
  const pmrem = new PMREMGenerator(gl)
  const room = new Scene()
  const add = (mesh: Mesh, pos: [number, number, number]) => {
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    room.add(mesh)
  }
  const light = (color: string, power: number) => new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power), side: DoubleSide })
  add(new Mesh(new PlaneGeometry(5, 2.5), light('#ffffff', 3.2)), [-3, 3, 4])
  add(new Mesh(new PlaneGeometry(1.2, 6), light('#ffffff', 2)), [4, 0.5, 3])
  add(new Mesh(new TorusGeometry(1.25, 0.09, 12, 64), light('#ffd6e6', 1.4)), [0, -3, 3])
  add(new Mesh(new PlaneGeometry(8, 2), light('#b9a6ff', 0.8)), [0, 4, -4])
  const target = pmrem.fromScene(room, 0.03)
  room.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose()
      ;(o.material as MeshBasicMaterial).dispose()
    }
  })
  pmrem.dispose()
  return target
}

/**
 * The hero scene in plain three.js, so it can run inside a Web Worker on an
 * OffscreenCanvas (and on the main thread as a fallback). Nothing here touches
 * the DOM.
 */
export class NailScene {
  private renderer: WebGLRenderer
  private camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  private scene = new Scene()
  private group = new Group()
  private meshes: Mesh[] = []
  private parts: { material: ReturnType<typeof createLacquerMaterial>['material']; uniforms: LacquerUniforms }[] = []
  private cache = new Map<string, BufferGeometry>()
  private look: (typeof FINISH_LOOK)[Finish]
  private finish: Finish
  private shape: Shape
  private hex: string
  private pointer = { x: 0, y: 0 }
  private hovered = -1
  private pop = 1
  private raycaster = new Raycaster()
  private time = 0
  private size = { w: 1, h: 1 }

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, w: number, h: number, dpr: number, state: NailState) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.debug.checkShaderErrors = false
    this.camera.position.set(0, 0, CAMERA_Z)
    this.scene.environment = buildStudio(this.renderer).texture

    this.finish = state.finish
    this.shape = state.shape
    this.hex = state.hex
    this.look = { ...FINISH_LOOK[state.finish] }

    this.group.position.set(0.25, -0.3, 0)
    FINGERS.forEach((f, i) => {
      const part = createLacquerMaterial(state.hex)
      this.parts.push(part)
      const holder = new Group()
      holder.position.set(f.x, f.y, 0)
      holder.rotation.z = MathUtils.degToRad(f.angle)
      const mesh = new Mesh(this.geometryFor(i, state.shape), part.material)
      mesh.userData.index = i
      holder.add(mesh)
      this.group.add(holder)
      this.meshes.push(mesh)
    })
    this.scene.add(this.group)
    this.resize(w, h, dpr)
  }

  /** Builds every shader the first frame needs, in parallel where the GPU driver allows. */
  compile() {
    return this.renderer.compileAsync(this.scene, this.camera).catch(() => undefined)
  }

  resize(w: number, h: number, dpr: number) {
    this.size = { w: Math.max(1, w), h: Math.max(1, h) }
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(this.size.w, this.size.h, false)
    this.camera.aspect = this.size.w / this.size.h
    this.camera.updateProjectionMatrix()
  }

  /** Pointer across the whole window, -1..1: the set leans towards it and the cat-eye band follows. */
  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

  /** Pointer inside the canvas in normalised device coordinates, for lifting the tip under it. */
  pick(x: number | null, y: number | null) {
    if (x === null || y === null) {
      this.hovered = -1
      return
    }
    this.raycaster.setFromCamera(new Vector2(x, y), this.camera)
    const hit = this.raycaster.intersectObjects(this.meshes, false)[0]
    this.hovered = hit ? (hit.object.userData.index as number) : -1
  }

  setState(next: NailState) {
    if (next.hex !== this.hex) {
      const color = new Color(next.hex)
      for (const { uniforms: u } of this.parts) {
        const current = u.uProgress.value >= 1.1 ? u.uTo.value.clone() : u.uFrom.value.clone()
        u.uFrom.value.copy(current)
        u.uTo.value.copy(color)
        u.uProgress.value = -0.15
      }
      this.hex = next.hex
    }
    if (next.shape !== this.shape) {
      this.shape = next.shape
      this.meshes.forEach((m, i) => (m.geometry = this.geometryFor(i, next.shape)))
      this.pop = 0.9
    }
    this.finish = next.finish
  }

  frame(dt: number) {
    this.time += dt
    const t = this.time
    const g = this.group
    g.rotation.y = MathUtils.damp(g.rotation.y, this.pointer.x * 0.4, 4, dt)
    g.rotation.x = MathUtils.damp(g.rotation.x, -0.32 + this.pointer.y * 0.2, 4, dt)
    g.position.y = -0.3 + Math.sin(t * 0.8) * 0.04

    const viewH = 2 * CAMERA_Z * Math.tan(MathUtils.degToRad(FOV / 2))
    const viewW = viewH * this.camera.aspect
    this.pop = MathUtils.damp(this.pop, 1, 9, dt)
    g.scale.setScalar(this.pop * Math.min(1, viewW / SET_WIDTH, viewH / SET_HEIGHT))

    const goal = FINISH_LOOK[this.finish]
    const l = this.look
    const k = 1 - Math.exp(-dt * 6)
    for (const key of Object.keys(l) as (keyof typeof l)[]) l[key] += (goal[key] - l[key]) * k

    this.parts.forEach(({ material: m, uniforms: u }, i) => {
      m.roughness = l.roughness
      m.metalness = l.metalness
      m.clearcoat = l.clearcoat
      m.iridescence = l.iridescence
      m.color.copy(u.uTo.value).multiplyScalar(l.shade)
      u.uCat.value = l.cat
      u.uBand.value = MathUtils.damp(u.uBand.value, 0.5 + this.pointer.x * 0.6, 6, dt)
      u.uTime.value = t
      if (u.uProgress.value < 1.2) u.uProgress.value = Math.min(1.2, u.uProgress.value + dt * 1.6)
      const mesh = this.meshes[i]
      mesh.position.z = MathUtils.damp(mesh.position.z, this.hovered === i ? 0.3 : 0, 8, dt)
    })

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    for (const g of this.cache.values()) g.dispose()
    for (const p of this.parts) p.material.dispose()
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  private geometryFor(i: number, shape: Shape) {
    const key = `${shape}:${i}`
    let g = this.cache.get(key)
    if (!g) {
      const f = FINGERS[i]
      const length = shape === 'stiletto' ? f.length * 1.18 : shape === 'square' ? f.length * 0.9 : f.length
      g = buildNailGeometry({ shape, width: f.width, length })
      this.cache.set(key, g)
    }
    return g
  }
}
