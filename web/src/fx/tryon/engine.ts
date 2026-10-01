import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { OneEuro } from './oneEuro'
import { NailOverlay, type OverlayState } from './overlay'
import { nailPoses3d, showsNails, type Landmark, type NailPose3d } from './pose'

const base = process.env.NEXT_PUBLIC_BASE ?? ''

export type Look = OverlayState

type Hand = { label: string; image: Landmark[]; world: Landmark[]; seen: number }

/* how long a hand that drops out of one or two frames keeps its nails, so they do not blink */
const GRACE = 0.15
const SAMPLE_W = 64
const SAMPLE_H = 48

/** 21 landmarks × 3 coordinates, each with its own One Euro filter. */
class HandFilter {
  private f = Array.from({ length: 63 }, () => new OneEuro(1.2, 8))
  private w = Array.from({ length: 63 }, () => new OneEuro(1.2, 25))
  apply(image: Landmark[], world: Landmark[], t: number) {
    const run = (filters: OneEuro[], pts: Landmark[]) =>
      pts.map((p, i) => ({ x: filters[i * 3].filter(p.x, t), y: filters[i * 3 + 1].filter(p.y, t), z: filters[i * 3 + 2].filter(p.z, t) }))
    return { image: run(this.f, image), world: run(this.w, world) }
  }
}

/**
 * Hand try-on: MediaPipe finds 21 landmarks per hand right in the browser (the
 * model and wasm are served by this site, nothing leaves the device), and 3D
 * nails in the chosen lacquer, finish, shape and length are drawn over the frame.
 */
export class TryOn {
  private video?: HTMLVideoElement
  private stream?: MediaStream
  private raf = 0
  private hands: Hand[] = []
  private filters = new Map<string, HandFilter>()
  private lastVideoTime = -1
  private overlay: NailOverlay | null = null
  private sample = document.createElement('canvas')
  private sampleCtx: CanvasRenderingContext2D
  private queue: Promise<unknown> = Promise.resolve()
  private clock = 0
  found = 0

  private constructor(private landmarker: HandLandmarker) {
    this.sample.width = SAMPLE_W
    this.sample.height = SAMPLE_H
    this.sampleCtx = this.sample.getContext('2d', { willReadFrequently: true })!
  }

  static async load(): Promise<TryOn> {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(`${base}/mediapipe`)
    const make = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${base}/models/hand_landmarker.task`, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    const landmarker = await make('GPU').catch(() => make('CPU'))
    return new TryOn(landmarker)
  }

  /** Front camera, mirrored on screen the way a mirror shows your hand. */
  async startCamera(video: HTMLVideoElement) {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
    video.srcObject = this.stream
    video.muted = true
    video.playsInline = true
    await video.play()
    this.video = video
  }

  /** Draws the live camera and the nails every frame until stop(). */
  run(canvas: HTMLCanvasElement, look: () => Look, onFound: (nails: number) => void) {
    const ctx = canvas.getContext('2d')!
    let last = performance.now()
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      const v = this.video
      if (!v || v.readyState < 2) return
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      this.clock += dt
      fit(canvas, v.videoWidth, v.videoHeight)
      if (v.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = v.currentTime
        this.track(this.landmarker.detectForVideo(v, now), this.clock)
      }
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      const nails = this.paint(ctx, v, canvas.width, canvas.height, look(), dt, false)
      ctx.restore()
      if (nails !== this.found) {
        this.found = nails
        onFound(nails)
      }
    }
    loop()
  }

  /**
   * One photo: finds the hands and paints the nails onto it; returns how many nails were painted.
   * Calls are queued: the model switches between photo and video mode, and a quick lacquer change
   * must not start a second detection in the middle of the first.
   */
  photo(canvas: HTMLCanvasElement, image: ImageBitmap | HTMLImageElement, look: Look): Promise<number> {
    const run = this.queue.then(() => this.photoNow(canvas, image, look))
    this.queue = run.catch(() => 0)
    return run
  }

  private async photoNow(canvas: HTMLCanvasElement, image: ImageBitmap | HTMLImageElement, look: Look) {
    /* a still photo gets a lower bar: close-ups often show only part of the hand */
    await this.landmarker.setOptions({ runningMode: 'IMAGE', minHandDetectionConfidence: 0.3 })
    const w = 'naturalWidth' in image ? image.naturalWidth : image.width
    const h = 'naturalHeight' in image ? image.naturalHeight : image.height
    fit(canvas, w, h, 1600)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const res = this.landmarker.detect(image)
    await this.landmarker.setOptions({ runningMode: 'VIDEO', minHandDetectionConfidence: 0.5 })
    this.hands = []
    this.filters.clear()
    this.track(res, this.clock, true)
    return this.paint(ctx, image, canvas.width, canvas.height, look, 0, true)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = undefined
    if (this.video) this.video.srcObject = null
    this.video = undefined
    this.hands = []
    this.filters.clear()
    this.found = 0
  }

  close() {
    this.stop()
    this.overlay?.dispose()
    this.landmarker.close()
  }

  /* only hands that show their nails are kept; landmarks are smoothed per hand, keyed by left or right */
  private track(res: HandLandmarkerResult, t: number, still = false) {
    const next: Hand[] = []
    res.landmarks.forEach((lm, i) => {
      const label = res.handedness[i]?.[0]?.categoryName ?? 'Right'
      const world = res.worldLandmarks[i]
      if (!world || !showsNails(lm, label)) return
      let f = this.filters.get(label)
      if (!f) this.filters.set(label, (f = new HandFilter()))
      const smooth = still ? { image: lm, world } : f.apply(lm, world, t)
      next.push({ label, ...smooth, seen: t })
    })
    for (const old of this.hands) {
      if (!next.some((h) => h.label === old.label) && t - old.seen < GRACE) next.push(old)
    }
    for (const label of this.filters.keys()) if (!next.some((h) => h.label === label)) this.filters.delete(label)
    this.hands = next.slice(0, 2)
  }

  /* brightness of the skin just behind each cuticle, from a tiny copy of the frame */
  private light(source: CanvasImageSource, poses: NailPose3d[][], w: number, h: number) {
    this.sampleCtx.drawImage(source, 0, 0, SAMPLE_W, SAMPLE_H)
    const data = this.sampleCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data
    const out: number[] = []
    poses.forEach((hand, hi) =>
      hand.forEach((p, fi) => {
        const back = p.width * p.scale * 0.6
        const x = Math.round(((p.cuticle.x - p.dir.x * back) / w) * SAMPLE_W)
        const y = Math.round(((p.cuticle.y + p.dir.y * back) / h) * SAMPLE_H)
        let sum = 0
        let n = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const px = Math.min(SAMPLE_W - 1, Math.max(0, x + dx))
            const py = Math.min(SAMPLE_H - 1, Math.max(0, y + dy))
            const o = (py * SAMPLE_W + px) * 4
            sum += (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255
            n++
          }
        out[hi * 5 + fi] = sum / n
      }),
    )
    return out
  }

  private paint(ctx: CanvasRenderingContext2D, source: CanvasImageSource, w: number, h: number, look: Look, dt: number, still: boolean) {
    if (!this.hands.length) return 0
    this.overlay ??= new NailOverlay(look)
    const poses = this.hands.map((hand) => nailPoses3d(hand.image, hand.world, w, h, look))
    const light = this.light(source, poses, w, h)
    if (this.overlay.canvas.width !== w || this.overlay.canvas.height !== h) this.overlay.setSize(w, h)
    this.overlay.setState(look)
    const shown = this.overlay.render(poses, light, this.clock, dt, still)
    /* the nails cast a soft shadow onto the finger, the way a real coat sits on the plate */
    ctx.save()
    ctx.shadowColor = 'rgba(30, 10, 14, 0.42)'
    ctx.shadowBlur = Math.max(2, w * 0.006)
    ctx.shadowOffsetY = Math.max(1, w * 0.0015)
    ctx.drawImage(this.overlay.canvas, 0, 0, w, h)
    ctx.restore()
    return shown
  }
}

function fit(canvas: HTMLCanvasElement, w: number, h: number, max = 1280) {
  const k = Math.min(1, max / Math.max(w, h))
  const cw = Math.round(w * k)
  const ch = Math.round(h * k)
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw
    canvas.height = ch
  }
}
