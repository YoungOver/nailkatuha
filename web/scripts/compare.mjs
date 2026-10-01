import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

/*
 * Loads this build and the original site under the same mobile profile
 * (4x slower CPU, 4G network) and prints what a visitor's phone pays for each:
 * largest contentful paint, layout shift, main-thread blocking and bytes.
 */

const root = fileURLToPath(new URL('../out/', import.meta.url))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' }
const server = createServer((req, res) => {
  let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html')
  if (!existsSync(path)) {
    res.writeHead(404)
    return res.end()
  }
  res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' })
  createReadStream(path).pipe(res)
}).listen(0)

const SITES = [
  ['nailkatuha', `http://127.0.0.1:${server.address().port}/`],
  ['nailtitu.ru', 'https://nailtitu.ru/'],
]
const RUNS = Number(process.env.RUNS ?? 3)

const browser = await chromium.launch({ channel: 'chrome' })

async function measure(url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const bytes = { total: 0, js: 0, requests: 0 }
  const kinds = new Map()
  cdp.on('Network.responseReceived', (e) => kinds.set(e.requestId, e.type))
  cdp.on('Network.loadingFinished', (e) => {
    bytes.total += e.encodedDataLength
    bytes.requests++
    if (kinds.get(e.requestId) === 'Script') bytes.js += e.encodedDataLength
  })

  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, tbt: 0, long: 0 }
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__m.lcp = e.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__m.long++
        window.__m.tbt += Math.max(0, e.duration - 50)
      }
    }).observe({ type: 'longtask', buffered: true })
  })

  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'load', timeout: 120000 })
  const loadMs = Date.now() - t0
  await page.waitForTimeout(8000)
  const m = await page.evaluate(() => window.__m)
  await ctx.close()
  return { ...m, loadMs, ...bytes }
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const kb = (n) => `${Math.round(n / 1024)} KB`

for (const [name, url] of SITES) {
  const runs = []
  for (let i = 0; i < RUNS; i++) runs.push(await measure(url))
  const pick = (k) => median(runs.map((r) => r[k]))
  console.log(
    `${name.padEnd(12)} LCP ${Math.round(pick('lcp'))} ms  load ${pick('loadMs')} ms  CLS ${pick('cls').toFixed(3)}  TBT ${Math.round(pick('tbt'))} ms (${pick('long')} long)  bytes ${kb(pick('total'))} in ${pick('requests')} requests, JS ${kb(pick('js'))}`,
  )
}

await browser.close()
server.close()
