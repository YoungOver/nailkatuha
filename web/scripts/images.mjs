import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const src = new URL('../../_ref/img/', import.meta.url)
const out = new URL('../public/works/', import.meta.url)
const manifest = new URL('../src/content/works.json', import.meta.url)
const WIDTHS = [480, 960, 1600]

mkdirSync(out, { recursive: true })

const works = []
let bytes = 0
for (let id = 1; id <= 18; id++) {
  const input = sharp(fileURLToPath(new URL(`work-${id}.jpg`, src))).rotate()
  const { data: base, info } = await input.clone().toBuffer({ resolveWithObject: true })
  const widths = WIDTHS.filter((w) => w <= info.width)
  if (widths.at(-1) !== Math.min(info.width, 1600)) widths.push(Math.min(info.width, 1600))

  for (const w of widths) {
    const resized = sharp(base).resize({ width: w })
    const avif = await resized.clone().avif({ quality: 55, effort: 5 }).toBuffer()
    const webp = await resized.clone().webp({ quality: 72 }).toBuffer()
    writeFileSync(new URL(`work-${id}-${w}.avif`, out), avif)
    writeFileSync(new URL(`work-${id}-${w}.webp`, out), webp)
    bytes += avif.length + webp.length
  }

  const blur = await sharp(base).resize({ width: 16 }).webp({ quality: 40 }).toBuffer()
  works.push({
    id,
    w: info.width,
    h: info.height,
    widths,
    blur: `data:image/webp;base64,${blur.toString('base64')}`,
  })
}

writeFileSync(manifest, JSON.stringify(works, null, 2) + '\n')
console.log(`works: ${works.length}, ${(bytes / 1048576).toFixed(1)} MB`)
