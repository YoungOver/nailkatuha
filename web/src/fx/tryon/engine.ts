import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { nailPoses, paintNail, showsNails, type Look, type Pt } from './nails2d'

const base = process.env.NEXT_PUBLIC_BASE ?? ''

type Smooth = { lm: Pt[] }

/**
 * Hand try-on: MediaPipe finds 21 landmarks per hand right in the browser (the
 * model and wasm are served by this site, nothing leaves the device), and the
 * nails are painted over the frame in the chosen lacquer and shape.
 */
export class TryOn {
  private video?: HTMLVideoElement
  private stream?: MediaStream
  private raf = 0
  private smooth: Smooth[] = []
  private lastVideoTime = -1
  found = false

  private constructor(private hands: HandLandmarker) {}

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
    const hands = await make('GPU').catch(() => make('CPU'))
    return new TryOn(hands)
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
  run(canvas: HTMLCanvasElement, look: () => Look, onFound: (found: boolean) => void) {
    const ctx = canvas.getContext('2d')!
    const t0 = performance.now()
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      const v = this.video
      if (!v || v.readyState < 2) return
      fit(canvas, v.videoWidth, v.videoHeight)
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
      if (v.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = v.currentTime
        const res = this.hands.detectForVideo(v, performance.now())
        this.track(res)
      }
      const found = this.paint(ctx, canvas.width, canvas.height, look(), (performance.now() - t0) / 1000)
      ctx.restore()
      if (found !== this.found) {
        this.found = found
        onFound(found)
      }
    }
    loop()
  }

  private queue: Promise<unknown> = Promise.resolve()

  /**
   * One photo: finds the hands and paints the nails onto it. Returns how many hands showed their nails.
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
    await this.hands.setOptions({ runningMode: 'IMAGE', minHandDetectionConfidence: 0.3 })
    const w = 'naturalWidth' in image ? image.naturalWidth : image.width
    const h = 'naturalHeight' in image ? image.naturalHeight : image.height
    fit(canvas, w, h, 1600)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const res = this.hands.detect(image)
    await this.hands.setOptions({ runningMode: 'VIDEO', minHandDetectionConfidence: 0.5 })
    this.smooth = []
    this.track(res, 1)
    const painted = this.paint(ctx, canvas.width, canvas.height, look, 0.6)
    return painted ? this.smooth.length : 0
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = undefined
    if (this.video) this.video.srcObject = null
    this.video = undefined
    this.smooth = []
    this.found = false
  }

  close() {
    this.stop()
    this.hands.close()
  }

  /* landmarks are eased between frames so the nails do not shiver */
  private track(res: HandLandmarkerResult, k = 0.55) {
    const next: Smooth[] = []
    res.landmarks.forEach((lm, i) => {
      const label = res.handedness[i]?.[0]?.categoryName ?? 'Right'
      if (!showsNails(lm, label)) return
      const prev = this.smooth[next.length]?.lm
      next.push({ lm: prev ? lm.map((p, j) => ({ x: prev[j].x + (p.x - prev[j].x) * k, y: prev[j].y + (p.y - prev[j].y) * k })) : lm })
    })
    this.smooth = next
  }

  private paint(ctx: CanvasRenderingContext2D, w: number, h: number, look: Look, time: number) {
    for (const hand of this.smooth) for (const pose of nailPoses(hand.lm, w, h)) paintNail(ctx, pose, look, time)
    return this.smooth.length > 0
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
