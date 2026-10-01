import {
  ACESFilmicToneMapping,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from 'three'
import type { Shape } from '../lacquer'
import { buildNailGeometry } from './geometry'
import { applyLook, createLacquerMaterial, FINISH_LOOK } from './material'
import type { NailState } from './scene'
import { LAYER_AT, LAYER_FADE } from './steps'
import { buildStudio } from './studio'

const WIDTH = 1.25
const LENGTH = 2.05
const CAMERA_Z = 7.6
const FOV = 28

type Layer = { mesh: Mesh; appear: number; opacity: number }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * One nail taken apart by scrolling, the way a product page shows what is
 * inside: the natural plate, then the base, two coats of colour and the top
 * arrive one by one, spread out so each can be seen, and close back into a
 * finished glossy nail. Progress 0..1 comes from the page scroll.
 */
export class LayersScene {
  private renderer: WebGLRenderer
  private camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  private scene = new Scene()
  private group = new Group()
  private layers: Layer[] = []
  private colour: ReturnType<typeof createLacquerMaterial>
  private cache = new Map<Shape, BufferGeometry>()
  private target = 0
  private shown = 0
  private pointer = { x: 0, y: 0 }
  private shape: Shape

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, w: number, h: number, dpr: number, state: NailState) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.debug.checkShaderErrors = false
    this.scene.environment = buildStudio(this.renderer).texture
    this.camera.position.set(0, 0, CAMERA_Z)
    this.shape = state.shape

    const plate = new MeshPhysicalMaterial({ color: '#e7a596', roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.5 })
    const base = new MeshPhysicalMaterial({ color: '#fff4ee', roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.6 })
    this.colour = createLacquerMaterial(state.hex)
    this.colour.material.transparent = true
    const top = new MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.04,
      transparent: true,
      opacity: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 0.35,
      iridescenceIOR: 1.3,
    })
    const geo = this.geometry(state.shape)
    const specs: [Material, number, number][] = [
      [plate, -1, 1],
      [base, LAYER_AT[0], 0.6],
      [this.colour.material, LAYER_AT[1], 1],
      [top, LAYER_AT[2], 0.22],
    ]
    specs.forEach(([material, appear, opacity], i) => {
      const mesh = new Mesh(geo, material)
      mesh.renderOrder = i
      this.group.add(mesh)
      this.layers.push({ mesh, appear, opacity })
    })
    this.applyFinish(state)
    this.scene.add(this.group)
    this.resize(w, h, dpr)
  }

  compile() {
    return this.renderer.compileAsync(this.scene, this.camera).catch(() => undefined)
  }

  resize(w: number, h: number, dpr: number) {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(Math.max(1, w), Math.max(1, h), false)
    this.camera.aspect = Math.max(1, w) / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

  pick(_x?: number | null, _y?: number | null) {}

  setProgress(p: number) {
    this.target = Math.min(1, Math.max(0, p))
  }

  setState(next: NailState) {
    const c = new Color(next.hex)
    const u = this.colour.uniforms
    u.uFrom.value.copy(c)
    u.uTo.value.copy(c)
    if (next.shape !== this.shape) {
      this.shape = next.shape
      const geo = this.geometry(next.shape)
      for (const l of this.layers) l.mesh.geometry = geo
    }
    this.applyFinish(next)
  }

  frame(dt: number) {
    /* the scene trails the scroll a little, so a jumpy wheel still reads as one smooth movement */
    this.shown = MathUtils.damp(this.shown, this.target, 9, dt)
    const p = this.shown
    const g = this.group
    /* side-on while the layers are apart so each one is visible, face-on again once they close */
    const side = smooth(0.02, 0.2, p) * (1 - smooth(0.8, 0.98, p))
    g.rotation.y = MathUtils.lerp(-0.35, -1.05, side) + smooth(0.85, 1, p) * 0.75 + this.pointer.x * 0.12
    g.rotation.x = MathUtils.lerp(-0.25, -0.62, side) + this.pointer.y * 0.08
    g.rotation.z = MathUtils.lerp(0.18, 0.42, side)

    const spread = smooth(0.1, 0.3, p) * (1 - smooth(0.84, 0.96, p))
    this.layers.forEach((l, i) => {
      const a = l.appear < 0 ? 1 : smooth(l.appear, l.appear + LAYER_FADE, p)
      l.mesh.visible = a > 0.002
      l.mesh.position.z = i * spread * 0.5 + (1 - a) * 0.6
      l.mesh.position.y = (1 - a) * 0.7
      l.mesh.scale.setScalar(0.94 + 0.06 * a)
      ;(l.mesh.material as Material).opacity = l.opacity * a
    })
    this.colour.uniforms.uTime.value += dt

    const viewH = 2 * CAMERA_Z * Math.tan(MathUtils.degToRad(FOV / 2))
    const viewW = viewH * this.camera.aspect
    g.scale.setScalar(Math.min(0.9, viewW / 2.8, viewH / 3.4))
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    for (const g of this.cache.values()) g.dispose()
    for (const l of this.layers) (l.mesh.material as Material).dispose()
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  private applyFinish(state: NailState) {
    const u = this.colour.uniforms
    u.uTo.value.set(state.hex)
    u.uFrom.value.set(state.hex)
    applyLook(this.colour.material, u, { ...FINISH_LOOK[state.finish] })
  }


  private geometry(shape: Shape) {
    let g = this.cache.get(shape)
    if (!g) {
      g = buildNailGeometry({ shape, width: WIDTH, length: LENGTH })
      g.translate(0, -LENGTH / 2, 0)
      this.cache.set(shape, g)
    }
    return g
  }
}
