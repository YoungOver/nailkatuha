import { simSize, type QUALITY } from './quality'
import {
  advectionShader,
  baseVertex,
  copyShader,
  curlShader,
  displayShader,
  divergenceShader,
  gradientSubtractShader,
  pressureShader,
  scaleShader,
  splatShader,
  vorticityShader,
} from './shaders'

type Settings = (typeof QUALITY)[keyof typeof QUALITY]

type Fbo = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; texel: [number, number] }
type DoubleFbo = { read: Fbo; write: Fbo; swap(): void; w: number; h: number; texel: [number, number] }

class Program {
  readonly program: WebGLProgram
  readonly uniforms = new Map<string, WebGLUniformLocation>()

  constructor(
    private gl: WebGL2RenderingContext,
    vertex: WebGLShader,
    fragmentSource: string,
  ) {
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.bindAttribLocation(program, 0, 'aPosition')
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link failed')
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)!.name
      this.uniforms.set(name, gl.getUniformLocation(program, name)!)
    }
    this.program = program
  }

  use() {
    this.gl.useProgram(this.program)
    return this
  }

  u(name: string) {
    return this.uniforms.get(name) ?? null
  }
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'compile failed')
  return shader
}

export type Rgb = [number, number, number]

/*
 * Stable fluids on the GPU: velocity and dye live in half-float ping-pong
 * textures; each step advects both, adds vorticity confinement, projects the
 * velocity to be divergence-free with Jacobi pressure iterations, then renders
 * the dye with a tone curve.
 */
export class FluidSim {
  curl = 7
  velocityDissipation = 0.35
  dyeDissipation = 0.55
  splatRadius = 0.011
  exposure = 2.1
  background: Rgb = [13 / 255, 11 / 255, 16 / 255]
  tint: Rgb = [1, 0.31, 0.55]
  tintAmount = 0

  private gl: WebGL2RenderingContext
  private p: Record<string, Program>
  private velocity!: DoubleFbo
  private dye!: DoubleFbo
  private divergence!: Fbo
  private curlFbo!: Fbo
  private pressure!: DoubleFbo
  private width = 0
  private height = 0

  constructor(
    private canvas: HTMLCanvasElement,
    private settings: Settings,
  ) {
    const gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false })
    if (!gl) throw new Error('no webgl2')
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('no float fbo')
    this.gl = gl

    const vertex = compile(gl, gl.VERTEX_SHADER, baseVertex)
    this.p = {
      copy: new Program(gl, vertex, copyShader),
      splat: new Program(gl, vertex, splatShader),
      advection: new Program(gl, vertex, advectionShader),
      divergence: new Program(gl, vertex, divergenceShader),
      curl: new Program(gl, vertex, curlShader),
      vorticity: new Program(gl, vertex, vorticityShader),
      pressure: new Program(gl, vertex, pressureShader),
      gradient: new Program(gl, vertex, gradientSubtractShader),
      scale: new Program(gl, vertex, scaleShader),
      display: new Program(gl, vertex, displayShader),
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    const index = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
  }

  /** Resizes the drawing buffer and all simulation targets, keeping the current smoke. */
  resize(cssWidth: number, cssHeight: number, dpr: number) {
    const w = Math.max(1, Math.round(cssWidth * dpr))
    const h = Math.max(1, Math.round(cssHeight * dpr))
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h

    const sim = simSize(w, h, this.settings.sim)
    const dye = simSize(w, h, Math.min(this.settings.dye, Math.min(w, h)))
    const gl = this.gl
    const rg = { internal: gl.RG16F, format: gl.RG }
    const rgba = { internal: gl.RGBA16F, format: gl.RGBA }
    const r = { internal: gl.R16F, format: gl.RED }

    this.velocity = this.resizeDouble(this.velocity, sim.w, sim.h, rg, gl.LINEAR)
    this.dye = this.resizeDouble(this.dye, dye.w, dye.h, rgba, gl.LINEAR)
    this.pressure = this.makeDouble(sim.w, sim.h, r, gl.NEAREST)
    this.divergence = this.makeFbo(sim.w, sim.h, r, gl.NEAREST)
    this.curlFbo = this.makeFbo(sim.w, sim.h, r, gl.NEAREST)
  }

  /** x, y in 0..1 from the top-left corner; dx, dy in css pixels. */
  splat(x: number, y: number, dx: number, dy: number, color: Rgb) {
    const gl = this.gl
    const s = this.p.splat.use()
    gl.uniform1i(s.u('uTarget'), this.bind(this.velocity.read, 0))
    gl.uniform1f(s.u('aspectRatio'), this.width / this.height)
    gl.uniform2f(s.u('point'), x, 1 - y)
    gl.uniform3f(s.u('color'), dx * 6, -dy * 6, 0)
    gl.uniform1f(s.u('radius'), this.radius())
    this.blit(this.velocity.write)
    this.velocity.swap()

    gl.uniform1i(s.u('uTarget'), this.bind(this.dye.read, 0))
    gl.uniform3f(s.u('color'), color[0], color[1], color[2])
    this.blit(this.dye.write)
    this.dye.swap()
  }

  step(dt: number) {
    const gl = this.gl
    gl.disable(gl.BLEND)

    const c = this.p.curl.use()
    gl.uniform2f(c.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(c.u('uVelocity'), this.bind(this.velocity.read, 0))
    this.blit(this.curlFbo)

    const v = this.p.vorticity.use()
    gl.uniform2f(v.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(v.u('uVelocity'), this.bind(this.velocity.read, 0))
    gl.uniform1i(v.u('uCurl'), this.bind(this.curlFbo, 1))
    gl.uniform1f(v.u('curl'), this.curl)
    gl.uniform1f(v.u('dt'), dt)
    this.blit(this.velocity.write)
    this.velocity.swap()

    const d = this.p.divergence.use()
    gl.uniform2f(d.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(d.u('uVelocity'), this.bind(this.velocity.read, 0))
    this.blit(this.divergence)

    const sc = this.p.scale.use()
    gl.uniform1i(sc.u('uTexture'), this.bind(this.pressure.read, 0))
    gl.uniform1f(sc.u('value'), 0.8)
    this.blit(this.pressure.write)
    this.pressure.swap()

    const pr = this.p.pressure.use()
    gl.uniform2f(pr.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(pr.u('uDivergence'), this.bind(this.divergence, 0))
    for (let i = 0; i < this.settings.pressureIters; i++) {
      gl.uniform1i(pr.u('uPressure'), this.bind(this.pressure.read, 1))
      this.blit(this.pressure.write)
      this.pressure.swap()
    }

    const g = this.p.gradient.use()
    gl.uniform2f(g.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(g.u('uPressure'), this.bind(this.pressure.read, 0))
    gl.uniform1i(g.u('uVelocity'), this.bind(this.velocity.read, 1))
    this.blit(this.velocity.write)
    this.velocity.swap()

    const a = this.p.advection.use()
    gl.uniform2f(a.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(a.u('uVelocity'), this.bind(this.velocity.read, 0))
    gl.uniform1i(a.u('uSource'), this.bind(this.velocity.read, 0))
    gl.uniform1f(a.u('dt'), dt)
    gl.uniform1f(a.u('dissipation'), this.velocityDissipation)
    this.blit(this.velocity.write)
    this.velocity.swap()

    gl.uniform2f(a.u('texelSize'), ...this.velocity.texel)
    gl.uniform1i(a.u('uVelocity'), this.bind(this.velocity.read, 0))
    gl.uniform1i(a.u('uSource'), this.bind(this.dye.read, 1))
    gl.uniform1f(a.u('dissipation'), this.dyeDissipation)
    this.blit(this.dye.write)
    this.dye.swap()
  }

  render() {
    const gl = this.gl
    const p = this.p.display.use()
    gl.uniform2f(p.u('texelSize'), 1 / this.width, 1 / this.height)
    gl.uniform1i(p.u('uTexture'), this.bind(this.dye.read, 0))
    gl.uniform3f(p.u('background'), ...this.background)
    gl.uniform3f(p.u('tint'), ...this.tint)
    gl.uniform1f(p.u('tintAmount'), this.tintAmount)
    gl.uniform1f(p.u('exposure'), this.exposure)
    this.blit(null)
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  private radius() {
    const aspect = this.width / this.height
    return aspect > 1 ? this.splatRadius * aspect : this.splatRadius
  }

  private bind(target: Fbo, unit: number) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit)
    this.gl.bindTexture(this.gl.TEXTURE_2D, target.tex)
    return unit
  }

  private blit(target: Fbo | null) {
    const gl = this.gl
    if (target) {
      gl.viewport(0, 0, target.w, target.h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    } else {
      gl.viewport(0, 0, this.width, this.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }

  private makeFbo(w: number, h: number, f: { internal: number; format: number }, filter: number): Fbo {
    const gl = this.gl
    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, gl.HALF_FLOAT, null)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fbo, w, h, texel: [1 / w, 1 / h] }
  }

  private makeDouble(w: number, h: number, f: { internal: number; format: number }, filter: number): DoubleFbo {
    const pair = {
      read: this.makeFbo(w, h, f, filter),
      write: this.makeFbo(w, h, f, filter),
      w,
      h,
      texel: [1 / w, 1 / h] as [number, number],
      swap() {
        const t = pair.read
        pair.read = pair.write
        pair.write = t
      },
    }
    return pair
  }

  private resizeDouble(old: DoubleFbo | undefined, w: number, h: number, f: { internal: number; format: number }, filter: number) {
    const next = this.makeDouble(w, h, f, filter)
    if (!old) return next
    const c = this.p.copy.use()
    this.gl.uniform2f(c.u('texelSize'), 1 / w, 1 / h)
    this.gl.uniform1i(c.u('uTexture'), this.bind(old.read, 0))
    this.blit(next.read)
    return next
  }
}
