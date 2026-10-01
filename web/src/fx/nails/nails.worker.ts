/// <reference lib="webworker" />
import { createHost, type FromHost, type ToHost } from './host'

/*
 * Every 3D scene of the page lives here: parsing three.js, linking shaders and
 * drawing frames happen off the main thread, so scrolling and clicks on the
 * page never wait for the GPU work.
 */

const raf: (cb: (t: number) => void) => void =
  typeof self.requestAnimationFrame === 'function' ? (cb) => self.requestAnimationFrame(cb) : (cb) => setTimeout(() => cb(performance.now()), 16)

const handle = createHost((m: FromHost) => (self as DedicatedWorkerGlobalScope).postMessage(m), raf)

self.onmessage = (e: MessageEvent<ToHost>) => handle(e.data)
