import { ACESFilmicToneMapping, Color, DirectionalLight, Matrix4, Mesh, OrthographicCamera, PMREMGenerator, Scene, Vector3, WebGLRenderer, type BufferGeometry } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { Finish, Length, Shape } from '../lacquer'
import { buildNailGeometry } from '../nails/geometry'
import { applyLook, createLacquerMaterial, easeLook, FINISH_LOOK, type LacquerUniforms, type Look } from '../nails/material'
import type { NailPose3d } from './pose'

export type OverlayState = { hex: string; finish: Finish; shape: Shape; length: Length }

type Nail = { mesh: Mesh; material: ReturnType<typeof createLacquerMaterial>['material']; uniforms: LacquerUniforms; alpha: number }

const HANDS = 2
const MAX = HANDS * 5

/**
 * The try-on nails: the same physical lacquer as the hero, rendered with an
 * orthographic camera in image pixels onto a transparent canvas that the
 * try-on draws over the frame. Reflections come from the studio environment;
 * brightness follows the skin around each nail, so a nail in shadow is darker.
 */
export class NailOverlay {
  readonly canvas = document.createElement('canvas')
  private renderer: WebGLRenderer
  private camera = new OrthographicCamera(0, 1, 0, -1, -5000, 5000)
  private scene = new Scene()
  private nails: Nail[] = []
  private cache = new Map<string, BufferGeometry>()
  private look: Look
  private state: OverlayState
  private basis = new Matrix4()
  private axes = [new Vector3(), new Vector3(), new Vector3()]

  constructor(state: OverlayState) {
    this.renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, premultipliedAlpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = ACESFilmicToneMapping
    /* a lit room all around, not the dark studio of the hero: a real finger points anywhere,
       and its gloss should catch some lamp whichever way the nail faces */
    const pmrem = new PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    const key = new DirectionalLight(0xffffff, 1.4)
    key.position.set(-0.25, 0.75, 1)
    this.scene.add(key)
    this.state = state
    this.look = { ...FINISH_LOOK[state.finish] }
    for (let i = 0; i < MAX; i++) {
      const part = createLacquerMaterial(state.hex)
      part.material.transparent = true
      part.material.depthWrite = false
      part.uniforms.uFade.value = 1
      const mesh = new Mesh(this.geometry(state.shape, 1.6), part.material)
      mesh.visible = false
      mesh.matrixAutoUpdate = false
      this.scene.add(mesh)
      this.nails.push({ mesh, ...part, alpha: 0 })
    }
  }

  setSize(w: number, h: number) {
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(w, h, false)
    Object.assign(this.camera, { left: 0, right: w, top: 0, bottom: -h })
    this.camera.updateProjectionMatrix()
  }

  /** A new colour runs from the cuticle to the free edge, as in the hero. */
  setState(next: OverlayState) {
    if (next.hex !== this.state.hex) {
      const color = new Color(next.hex)
      for (const { uniforms: u } of this.nails) {
        const current = u.uProgress.value >= 1.1 ? u.uTo.value.clone() : u.uFrom.value.clone()
        u.uFrom.value.copy(current)
        u.uTo.value.copy(color)
        u.uProgress.value = -0.15
      }
    }
    this.state = next
  }

  /**
   * Places the nails for up to two hands and draws them. `light[i]` is the
   * brightness of the skin around nail i, 0..1. Returns how many nails show.
   */
  render(hands: NailPose3d[][], light: number[], time: number, dt: number, still = false) {
    easeLook(this.look, this.state.finish, still ? 1 : 1 - Math.exp(-dt * 6))
    let shown = 0
    for (let i = 0; i < MAX; i++) {
      const nail = this.nails[i]
      const pose = hands[Math.floor(i / 5)]?.[i % 5]
      const target = pose ? pose.visible : 0
      nail.alpha = still ? target : nail.alpha + (target - nail.alpha) * (1 - Math.exp(-dt * 12))
      if (!pose || nail.alpha < 0.02) {
        nail.mesh.visible = false
        continue
      }
      shown++
      const { mesh, material: m, uniforms: u } = nail
      mesh.visible = true
      mesh.geometry = this.geometry(this.state.shape, pose.length / pose.width)
      this.axes[0].set(pose.lateral.x, pose.lateral.y, pose.lateral.z)
      this.axes[1].set(pose.dir.x, pose.dir.y, pose.dir.z)
      this.axes[2].set(pose.normal.x, pose.normal.y, pose.normal.z)
      const s = pose.width * pose.scale
      this.basis.makeBasis(this.axes[0].multiplyScalar(s), this.axes[1].multiplyScalar(s * pose.stretch), this.axes[2].multiplyScalar(s))
      this.basis.setPosition(pose.cuticle.x, -pose.cuticle.y, pose.depth)
      mesh.matrix.copy(this.basis)
      mesh.matrixWorldNeedsUpdate = true
      mesh.renderOrder = pose.depth

      applyLook(m, u, this.look)
      /* skin at 0.55 brightness is "normal light"; the nail follows it, within reason */
      const k = Math.min(1.3, Math.max(0.35, 0.25 + (light[i] ?? 0.55) * 1.35))
      u.uShade.value *= k
      m.envMapIntensity = k
      m.opacity = nail.alpha
      /* the smoother the coat, the brighter its glint: chrome shines, matte barely does */
      u.uGlint.value = (1 - this.look.roughness) ** 2 * (0.75 + 0.5 * this.look.metalness)
      u.uBand.value = 0.5 + Math.sin(time * 0.7 + i * 0.4) * 0.35
      u.uTime.value = time
      if (u.uProgress.value < 1.2) u.uProgress.value = still ? 1.2 : Math.min(1.2, u.uProgress.value + dt * 1.6)
    }
    this.renderer.render(this.scene, this.camera)
    return shown
  }

  dispose() {
    for (const g of this.cache.values()) g.dispose()
    for (const n of this.nails) n.material.dispose()
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  /* one shell per shape and length-to-width ratio, rounded so the cache stays small */
  private geometry(shape: Shape, ratio: number) {
    const r = Math.min(4, Math.max(0.6, Math.round(ratio * 10) / 10))
    const key = `${shape}:${r}`
    let g = this.cache.get(key)
    if (!g) {
      g = buildNailGeometry({ shape, width: 1, length: r })
      this.cache.set(key, g)
    }
    return g
  }
}
