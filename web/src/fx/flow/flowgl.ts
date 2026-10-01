/*
 * Poured lacquer for the page background: a domain-warped noise field read as
 * the height of a viscous coat, lit by one soft key light so its ridges catch
 * glossy highlights. Pure WebGL2 (no three.js) so it can run in a worker.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uA;
uniform vec3 uB;
uniform float uDim;
uniform vec2 uPointer;
out vec4 outColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(asp, 1.0) * 1.15 + (uPointer - 0.5) * 0.1;
  float t = uTime;
  /* the warp fields are smooth, so they are computed once; only the height is sampled three times for a clean normal */
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.045)), fbm(p + vec2(5.2, 1.3) - t * 0.035));
  vec2 r = vec2(fbm(p + 2.2 * q + vec2(1.7, 9.2) + t * 0.03), fbm(p + 2.2 * q + vec2(8.3, 2.8) - t * 0.025));
  vec2 w = p + 2.6 * r;
  float e = 0.02;
  float h = fbm(w);
  float hx = fbm(w + vec2(e, 0.0));
  float hy = fbm(w + vec2(0.0, e));
  vec3 n = normalize(vec3((h - hx) / e * 0.55, (h - hy) / e * 0.55, 1.0));
  vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);

  vec3 ink = vec3(0.016, 0.012, 0.022);
  vec3 col = mix(ink, uA * 0.5, smoothstep(0.32, 0.82, h));
  col = mix(col, uB * 0.42, smoothstep(0.45, 0.9, r.y) * 0.6);
  col = col * (0.45 + 0.55 * diff) + spec * mix(vec3(1.0), uA, 0.45) * 0.32 * smoothstep(0.35, 0.8, h);

  float vig = smoothstep(1.35, 0.15, length((uv - vec2(0.66, 0.56)) * vec2(asp * 0.75, 1.0)));
  col *= mix(0.25, 1.0, vig);
  col *= uDim;
  outColor = vec4(col, 1.0);
}`

export type FlowState = { a: [number, number, number]; b: [number, number, number]; dim: number; pointer: [number, number] }

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** A second hue for the coat: the lacquer turned 45° back round the colour wheel (pink gets violet, not olive). */
export function partner(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  h = (h * 60 - 45 + 360) % 360
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0.5
  const c = (1 - Math.abs(2 * l - 1)) * Math.max(s, 0.55)
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r1 + m, g1 + m, b1 + m]
}

export class FlowRenderer {
  private gl: WebGL2RenderingContext
  private u: Record<string, WebGLUniformLocation | null> = {}
  private cur: FlowState
  private goal: FlowState

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, state: FlowState) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' }) as WebGL2RenderingContext | null
    if (!gl) throw new Error('webgl2')
    this.gl = gl
    const prog = gl.createProgram()!
    for (const [type, src] of [
      [gl.VERTEX_SHADER, VERT],
      [gl.FRAGMENT_SHADER, FRAG],
    ] as const) {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      gl.attachShader(prog, sh)
    }
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const name of ['uRes', 'uTime', 'uA', 'uB', 'uDim', 'uPointer']) this.u[name] = gl.getUniformLocation(prog, name)
    this.cur = structuredClone(state)
    this.goal = structuredClone(state)
  }

  set(state: Partial<FlowState>) {
    Object.assign(this.goal, state)
  }

  resize(w: number, h: number) {
    const c = this.gl.canvas
    c.width = Math.max(1, Math.round(w))
    c.height = Math.max(1, Math.round(h))
    this.gl.viewport(0, 0, c.width, c.height)
  }

  /** Eases towards the goal colours and draws one frame. */
  draw(time: number, dt: number) {
    const k = 1 - Math.exp(-dt * 2.5)
    for (const key of ['a', 'b', 'pointer'] as const) {
      const c = this.cur[key] as number[]
      const g = this.goal[key] as number[]
      for (let i = 0; i < c.length; i++) c[i] += (g[i] - c[i]) * k
    }
    this.cur.dim += (this.goal.dim - this.cur.dim) * Math.min(1, dt * 6)
    const gl = this.gl
    gl.uniform2f(this.u.uRes, gl.canvas.width, gl.canvas.height)
    gl.uniform1f(this.u.uTime, time)
    gl.uniform3fv(this.u.uA, this.cur.a)
    gl.uniform3fv(this.u.uB, this.cur.b)
    gl.uniform1f(this.u.uDim, this.cur.dim)
    gl.uniform2fv(this.u.uPointer, this.cur.pointer)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
