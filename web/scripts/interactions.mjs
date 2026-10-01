import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('../out/', import.meta.url))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
  if (!existsSync(p)) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' })
  createReadStream(p).pipe(res)
}).listen(0)
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`)

await page.goto(base + '/', { waitUntil: 'networkidle' })

await page.mouse.move(700, 400)
await page.waitForTimeout(400)
check('nail-file cursor visible on desktop', await page.locator('.nail-file[data-visible]').count() === 1)
check('native cursor hidden', (await page.evaluate(() => getComputedStyle(document.body).cursor)) === 'none')

await page.locator('#works').scrollIntoViewIfNeeded()
await page.locator('.works__open').nth(2).click()
await page.waitForTimeout(800)
check('photo opens in a dialog', await page.evaluate(() => document.querySelector('dialog.lightbox')?.open === true))
const first = await page.locator('.lightbox__count').textContent()
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(300)
check('arrow key moves to the next photo', (await page.locator('.lightbox__count').textContent()) !== first, `${first} → ${await page.locator('.lightbox__count').textContent()}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(700)
check('Esc closes the dialog', await page.evaluate(() => !document.querySelector('dialog.lightbox')?.open))
check('focus returns to the thumbnail', await page.evaluate(() => document.activeElement?.classList.contains('works__open')))

await page.locator('.chip', { hasText: 'Мудборд' }).click()
await page.waitForTimeout(300)
check('moodboard filter shows 8 works', (await page.locator('.works__item').count()) === 8, String(await page.locator('.works__item').count()))

await page.locator('#reasons').scrollIntoViewIfNeeded()
await page.locator('.reasons__item').nth(3).click()
check('reason 4 shows its proof photo', await page.evaluate(() => document.querySelectorAll('.reasons__photo')[3].hasAttribute('data-active')))

await page.locator('.lacquer-cap[aria-label="Лаванда"]').scrollIntoViewIfNeeded()
await page.locator('.lacquer-cap[aria-label="Лаванда"]').click()
await page.waitForTimeout(900)
const lac = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lacquer').trim())
check('lacquer repaints the site', lac === '#9c8cff', lac)
await page.reload({ waitUntil: 'networkidle' })
const kept = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lacquer').trim())
check('lacquer survives a reload without flash', kept === '#9c8cff', kept)

await page.locator('.sound-toggle').click()
check('sound toggle is pressed', (await page.locator('.sound-toggle').getAttribute('aria-pressed')) === 'true')

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await mobile.goto(base + '/', { waitUntil: 'networkidle' })
check('no file cursor on touch', await mobile.locator('.nail-file[data-visible]').count() === 0)
await mobile.locator('.site-header__toggle').click()
check('mobile menu opens', await mobile.locator('#mobile-menu').isVisible())
await mobile.locator('#mobile-menu a', { hasText: 'Цены' }).click()
await mobile.waitForTimeout(600)
check('mobile menu closes after choosing a section', !(await mobile.locator('#mobile-menu').isVisible()))

await page.goto(base + '/portfolio/', { waitUntil: 'networkidle' })
check('portfolio shows all 18 works', (await page.locator('.portfolio__item').count()) === 18)
await page.locator('.chip', { hasText: 'Экстремальная длина' }).click()
check('length filter narrows to extreme nails', (await page.locator('.portfolio__item').count()) === 2)
await page.locator('.chip', { hasText: 'Нюд' }).click()
check('empty combination explains itself', await page.locator('.portfolio__empty').isVisible())
await page.locator('.portfolio__reset').click()
check('reset brings every work back', (await page.locator('.portfolio__item').count()) === 18)

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
console.log(results.join('\n'))
await browser.close()
server.close()
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
