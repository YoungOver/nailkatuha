import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox, webkit } from 'playwright-core'

const root = fileURLToPath(new URL('../out/', import.meta.url))
const outDir = fileURLToPath(new URL('../../docs/shots/', import.meta.url))
/* Git Bash on Windows rewrites '/x/' arguments into paths, so a bare 'portfolio' is accepted too. */
const page = '/' + (process.argv[2] ?? '').replace(/^\/+/, '').replace(/([^/])$/, '$1/')
const full = process.env.FULL === '1'
const only = process.env.ONLY?.split(',')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon' }

const VIEWPORTS = [
  [360, 780, true],
  [390, 844, true],
  [844, 390, true],
  [768, 1024, true],
  [1024, 768, true],
  [1440, 900, false],
  [2560, 1440, false],
]

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
const base = `http://127.0.0.1:${server.address().port}`

mkdirSync(outDir, { recursive: true })
/* ENGINE=firefox or ENGINE=webkit runs the same pass in Gecko or in Safari's engine */
const engine = process.env.ENGINE ?? 'chrome'
const browser = engine === 'firefox' ? await firefox.launch() : engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome' })
let problems = 0

for (const [w, h, mobile] of VIEWPORTS) {
  if (only && !only.includes(`${w}x${h}`)) continue
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...(engine === 'firefox' ? {} : { isMobile: mobile }), hasTouch: mobile, reducedMotion: 'no-preference' })
  const tab = await ctx.newPage()
  const errors = []
  tab.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  tab.on('pageerror', (e) => errors.push(String(e)))
  await tab.goto(base + page, { waitUntil: 'networkidle' })
  await tab.waitForTimeout(4000)
  if (full) {
    /* a full-page capture paints beyond the viewport, where content-visibility would skip the sections */
    await tab.addStyleTag({ content: '.section { content-visibility: visible !important; }' })
    const height = await tab.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < height; y += h * 0.8) {
      await tab.evaluate((v) => window.scrollTo(0, v), y)
      await tab.waitForTimeout(250)
    }
    await tab.waitForTimeout(1500)
    await tab.evaluate(() => window.scrollTo(0, 0))
    await tab.waitForTimeout(500)
  }
  const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  const slug = page === '/' ? '' : page.replace(/\//g, '_').replace(/_+$/, '') + '-'
  const name = `${engine === 'chrome' ? '' : engine + '-'}${slug}${w}x${h}${full ? '-full' : ''}.png`
  await tab.screenshot({ path: join(outDir, name), fullPage: full })
  const issues = []
  if (overflow > 0) issues.push(`horizontal overflow ${overflow}px`)
  if (errors.length) issues.push(`console: ${errors.slice(0, 3).join(' | ')}`)
  problems += issues.length
  console.log(`${name.padEnd(14)} ${issues.length ? issues.join('; ') : 'ok'}`)
  await ctx.close()
}

await browser.close()
server.close()
console.log(`${problems} problems`)
process.exit(problems ? 1 : 0)
