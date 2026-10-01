import { createReadStream, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

/* axe-core over both pages, desktop and phone; any violation fails the run */

const root = fileURLToPath(new URL('../out/', import.meta.url))
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
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

const browser = await chromium.launch({ channel: 'chrome' })
let total = 0
for (const path of ['/', '/portfolio/']) {
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })
    await page.goto(base + path, { waitUntil: 'networkidle' })
    /* sections are laid out as they come near, so the page grows while it is scrolled: read the height every step */
    for (let y = 0; y < (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)); y += h) {
      await page.evaluate((v) => scrollTo(0, v), y)
      await page.waitForTimeout(120)
    }
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(1500)
    await page.addScriptTag({ path: axePath })
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] })
      return r.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.length}x ${v.nodes[0].target.join(' ')} ${v.nodes[0].failureSummary?.split('\n')[1] ?? ''}`)
    })
    total += violations.length
    console.log(`${path} ${w}x${h}: ${violations.length ? '\n  ' + violations.join('\n  ') : 'no violations'}`)
    await page.close()
  }
}
await browser.close()
server.close()
process.exit(total ? 1 : 0)
