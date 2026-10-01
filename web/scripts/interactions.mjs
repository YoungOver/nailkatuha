import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('../out/', import.meta.url))
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' }
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
const scrollTo = (sel, extra = 0) => page.evaluate(([s, e]) => window.scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + scrollY + e, behavior: 'instant' }), [sel, extra])

await page.goto(base + '/', { waitUntil: 'networkidle' })

await page.keyboard.press('Tab')
check('first Tab shows the skip link', await page.evaluate(() => document.activeElement?.classList.contains('skip-link') && document.activeElement.getBoundingClientRect().top >= 0))
await page.keyboard.press('Enter')
check('skip link moves focus past the header', await page.evaluate(() => document.activeElement?.id === 'main'))

const cursor = await page.evaluate(() => getComputedStyle(document.documentElement).cursor)
check('cursor is a native emery-board image (no lag)', cursor.startsWith('url("data:image/svg+xml'))
check('cursor is painted in the lacquer', decodeURIComponent(cursor).includes('#ff4f8b'))

/* the layers section: scroll position drives the active step */
const layersStep = async (f) => {
  await page.evaluate((f) => {
    const el = document.getElementById('layers')
    const top = el.getBoundingClientRect().top + scrollY
    window.scrollTo({ top: top + (el.offsetHeight - innerHeight) * f, behavior: 'instant' })
  }, f)
  await page.waitForTimeout(400)
  return page.evaluate(() => [...document.querySelectorAll('.layers__step')].findIndex((s) => s.hasAttribute('data-active')))
}
check('layers: start of the scroll shows step 1', (await layersStep(0.05)) === 0)
check('layers: middle of the scroll shows step 3', (await layersStep(0.6)) === 2)
check('layers: end of the scroll shows step 4', (await layersStep(0.98)) === 3)

await scrollTo('#works')
await page.locator('.works__open').nth(2).click()
await page.waitForTimeout(800)
check('photo opens in a dialog', await page.evaluate(() => document.querySelector('dialog.lightbox')?.open === true))
const photo = await page.locator('.lightbox__zoom').boundingBox()
await page.mouse.click(photo.x + photo.width / 2, photo.y + photo.height / 2)
await page.waitForTimeout(300)
check('a click on the photo keeps it open', await page.evaluate(() => document.querySelector('dialog.lightbox')?.open === true))
await page.keyboard.press('+')
await page.waitForTimeout(200)
check('+ zooms the photo in', await page.evaluate(() => document.querySelector('dialog.lightbox')?.hasAttribute('data-zoomed')))
const box = await page.locator('.lightbox__stage').boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.wheel(0, 600)
await page.waitForTimeout(200)
check('wheel zooms back out', await page.evaluate(() => !document.querySelector('dialog.lightbox')?.hasAttribute('data-zoomed')))
await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(200)
check('double click zooms in at the pointer', await page.evaluate(() => document.querySelector('dialog.lightbox')?.hasAttribute('data-zoomed')))
await page.keyboard.press('0')
const first = await page.locator('.lightbox__count').textContent()
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(300)
check('arrow key moves to the next photo', (await page.locator('.lightbox__count').textContent()) !== first, `${first} → ${await page.locator('.lightbox__count').textContent()}`)
await page.keyboard.press('Escape')
await page.waitForTimeout(700)
check('Esc closes the dialog', await page.evaluate(() => !document.querySelector('dialog.lightbox')?.open))
check('focus returns to the thumbnail', await page.evaluate(() => document.activeElement?.classList.contains('works__open')))

check('all 18 works are in one gallery', (await page.locator('.works__item').count()) === 18)
await page.locator('.chip', { hasText: 'Мудборд' }).click()
await page.waitForTimeout(300)
check('moodboard filter shows 8 works', (await page.locator('.works__item').count()) === 8, String(await page.locator('.works__item').count()))
await page.locator('.chip', { hasText: 'Все' }).click()
await page.locator('.chip', { hasText: 'Экстремальная длина' }).click()
await page.waitForTimeout(300)
check('length filter narrows to extreme nails', (await page.locator('.works__item').count()) === 2)
await page.locator('.chip', { hasText: 'Нюд' }).click()
check('empty combination explains itself', await page.locator('.works__empty').isVisible())
await page.locator('.works__reset').click()
check('reset brings every work back', (await page.locator('.works__item').count()) === 18)

await scrollTo('#tryon')
await page.locator('#tryon button', { hasText: 'Пример' }).click()
await page.waitForFunction(() => /Готово|Не вижу|Не получилось|не загрузился/.test(document.querySelector('.tryon__status')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => null)
const tryStatus = await page.locator('.tryon__status').textContent()
check('try-on finds the hand on the example and paints the nails', tryStatus.startsWith('Готово'), tryStatus)

await scrollTo('.hero')
await page.locator('.hero .lacquer-cap[aria-label="Лаванда"]').click()
await page.waitForTimeout(900)
const lac = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lacquer').trim())
check('lacquer repaints the site', lac === '#9c8cff', lac)
check('cursor follows the lacquer', decodeURIComponent(await page.evaluate(() => getComputedStyle(document.documentElement).cursor)).includes('#9c8cff'))
await page.reload({ waitUntil: 'networkidle' })
const kept = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lacquer').trim())
check('lacquer survives a reload without flash', kept === '#9c8cff', kept)

await page.locator('.sound-toggle').click()
check('sound toggle is pressed', (await page.locator('.sound-toggle').getAttribute('aria-pressed')) === 'true')

const old = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await old.addInitScript(() => delete HTMLCanvasElement.prototype.transferControlToOffscreen)
await old.goto(base + '/', { waitUntil: 'networkidle' })
await old.waitForSelector('.showcase[data-ready]', { timeout: 15000 }).catch(() => null)
check('3D falls back to the page thread without OffscreenCanvas', (await old.locator('.showcase[data-ready]').count()) === 1)
await old.close()

/* anchor jumps are checked on a slowed CPU: on a slow phone sections lay out while the smooth scroll is still running */
const slow = async (p) => (await p.context().newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 6 })
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await mobile.goto(base + '/', { waitUntil: 'networkidle' })
await slow(mobile)
check('no image cursor on touch screens', !(await mobile.evaluate(() => getComputedStyle(document.documentElement).cursor)).startsWith('url('))
await mobile.locator('.site-header__toggle').click()
check('mobile menu opens', await mobile.locator('#mobile-menu').isVisible())
await mobile.locator('#mobile-menu a', { hasText: 'Цены' }).click()
await mobile.waitForTimeout(600)
check('mobile menu closes after choosing a section', !(await mobile.locator('#mobile-menu').isVisible()))
/* landed: the section sits under the header and the jump has put the lazy sections back */
const landed = (id) => {
  const top = document.getElementById(id).getBoundingClientRect().top
  return top >= 0 && top <= 96 && !document.querySelector('main > section[style*="content-visibility"]')
}
await mobile.waitForFunction(landed, 'prices', { timeout: 8000 }).catch(() => null)
const pricesTop = await mobile.evaluate(() => Math.round(document.getElementById('prices').getBoundingClientRect().top))
check('menu link lands on its section under the header', pricesTop >= 0 && pricesTop <= 96, `top ${pricesTop}px`)

await page.goto(base + '/', { waitUntil: 'networkidle' })
await slow(page)
await page.locator('.site-header a[href$="#contacts"]').first().click()
await page.waitForFunction(landed, 'contacts', { timeout: 8000 }).catch(() => null)
const contactsTop = await page.evaluate(() => Math.round(document.getElementById('contacts').getBoundingClientRect().top))
check('header link to the last section lands exactly', contactsTop >= 0 && contactsTop <= 96, `top ${contactsTop}px`)
check('focus moves to the section, so Tab continues there', await page.evaluate(() => document.activeElement?.id === 'contacts'))
check('the address bar shows the section', page.url().endsWith('#contacts'), page.url())

await page.goto(base + '/portfolio/')
await page.waitForURL(/#works$/, { timeout: 5000 }).catch(() => null)
check('old /portfolio/ link lands on the gallery', page.url().endsWith('/#works'), page.url())

/* Chrome's synthetic camera shows a test pattern, not a hand: the camera must start and ask for the hand */
const cam = await chromium.launch({ channel: 'chrome', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const camPage = await cam.newPage({ viewport: { width: 1440, height: 900 } })
camPage.on('pageerror', (e) => errors.push(String(e)))
await camPage.goto(base + '/#tryon', { waitUntil: 'networkidle' })
await camPage.locator('#tryon button', { hasText: 'Включить камеру' }).click()
await camPage.locator('#tryon button', { hasText: 'Выключить камеру' }).waitFor({ timeout: 60000 }).catch(() => null)
const camStatus = await camPage.locator('.tryon__status').textContent()
check('camera starts and asks for the back of the hand', camStatus.includes('тыльную сторону'), camStatus)
const painted = await camPage.evaluate(() => {
  const c = document.querySelector('.tryon__canvas')
  return c.width > 0 && getComputedStyle(c).display !== 'none'
})
check('camera frames are drawn on the canvas', painted)
await camPage.locator('#tryon button', { hasText: 'Выключить камеру' }).click()
check('camera turns off', (await camPage.locator('#tryon button', { hasText: 'Включить камеру' }).count()) === 1)
await cam.close()

check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
console.log(results.join('\n'))
await browser.close()
server.close()
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
