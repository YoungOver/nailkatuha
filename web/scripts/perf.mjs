/*
 * Frame-time profiler on the real GPU (no SwiftShader), for our build and any URL.
 * node scripts/perf.mjs [url] [--hide=selector,...] [--width=1905 --height=1001]
 * Scenarios: idle, pointer sweeping over the hero, scrolling the page.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const target = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const width = +arg('width', 1905)
const height = +arg('height', 1001)
const hide = arg('hide', '')
const inject = arg('css', '')

let server
let url = target
if (!url) {
  const root = fileURLToPath(new URL('../out/', import.meta.url))
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
  server = createServer((req, res) => {
    let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
    if (!existsSync(p)) return res.writeHead(404).end()
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' })
    createReadStream(p).pipe(res)
  }).listen(0)
  url = `http://127.0.0.1:${server.address().port}/`
}

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: +arg('dpr', 1) })
/* Waits for the GPU after every animation frame, so WebGL cost shows up as time, not hidden in the compositor. */
await page.addInitScript(() => {
  const contexts = []
  const orig = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = orig.call(this, type, ...rest)
    if (ctx && /webgl/.test(type) && !contexts.includes(ctx)) contexts.push(ctx)
    return ctx
  }
  const raf = window.requestAnimationFrame.bind(window)
  const perFrame = new Map()
  window.__gpu = perFrame
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      const s = performance.now()
      cb(t)
      for (const c of contexts) c.finish()
      perFrame.set(t, (perFrame.get(t) ?? 0) + performance.now() - s)
    })
})
const cdp = await page.context().newCDPSession(page)
await cdp.send('Performance.enable')
await page.goto(url, { waitUntil: 'load', timeout: 90000 })
if (hide) await page.addStyleTag({ content: `${hide} { display: none !important; }` })
if (inject) await page.addStyleTag({ content: decodeURIComponent(inject) })
await page.waitForTimeout(2500)

await page.evaluate(() => {
  window.__frames = []
  window.__long = []
  let last = performance.now()
  const tick = (t) => {
    window.__frames.push(t - last)
    last = t
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: false })
})

const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))

async function scenario(name, run) {
  await page.evaluate(() => {
    window.__frames.length = 0
    window.__long.length = 0
    window.__gpu.clear()
  })
  const a = await metrics()
  await run()
  const b = await metrics()
  const { frames, long, gpu } = await page.evaluate(() => ({ frames: window.__frames.slice(1), long: window.__long.slice(), gpu: [...window.__gpu.values()] }))
  const g = [...gpu].sort((x, y) => x - y)
  const sorted = [...frames].sort((x, y) => x - y)
  const avg = frames.reduce((s, f) => s + f, 0) / frames.length
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
  const d = (k) => b[k] - a[k]
  console.log(
    `${name.padEnd(8)} fps ${(1000 / avg).toFixed(0).padStart(3)}  p95 ${p95.toFixed(1).padStart(5)}ms  >33ms ${String(frames.filter((f) => f > 33.4).length).padStart(3)}/${frames.length}` +
      `  frame work p50 ${(g[Math.floor(g.length / 2)] ?? 0).toFixed(1)} p95 ${(g[Math.floor(g.length * 0.95)] ?? 0).toFixed(1)}ms` +
      `  long ${long.length} (${long.reduce((s, x) => s + x, 0).toFixed(0)}ms)` +
      `  layouts ${d('LayoutCount')} ${(d('LayoutDuration') * 1000).toFixed(0)}ms  styles ${d('RecalcStyleCount')} ${(d('RecalcStyleDuration') * 1000).toFixed(0)}ms  script ${(d('ScriptDuration') * 1000).toFixed(0)}ms  task ${(d('TaskDuration') * 1000).toFixed(0)}ms`,
  )
}

await scenario('idle', () => page.waitForTimeout(3000))
await scenario('pointer', async () => {
  for (let i = 0; i < 180; i++) {
    const t = i / 180
    await page.mouse.move(width * (0.1 + 0.8 * t), height * (0.3 + 0.35 * Math.sin(t * Math.PI * 4)))
    await page.waitForTimeout(16)
  }
})
await scenario('scroll', async () => {
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, 60)
    await page.waitForTimeout(40)
  }
})

await browser.close()
server?.close()
