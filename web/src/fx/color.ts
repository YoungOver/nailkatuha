/* Colour helpers for the lacquer picker: hex, the HSV wheel and WCAG contrast. */

export const PAGE = '#000000'

export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(s)) s = s.replace(/./g, (c) => c + c)
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : null
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')
}

/** Hue in degrees, saturation and value 0..1. */
export function hexToHsv(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

export function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return rgbToHex(f(5) * 255, f(3) * 255, f(1) * 255)
}

function channel(v: number) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The page uses the lacquer for links, prices and buttons. A shade too dark to
 * read on the near-black page is mixed with white just enough to reach 4.5:1
 * (and to pass `ok`, a check the caller adds); the nails keep the exact colour.
 */
export function accentFor(hex: string, page = PAGE, min = 4.5, ok: (c: string) => boolean = () => true) {
  if (contrast(hex, page) >= min && ok(hex)) return hex
  const [r, g, b] = hexToRgb(hex)
  for (let t = 0.02; t <= 1; t += 0.02) {
    const mixed = rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
    if (contrast(mixed, page) >= min && ok(mixed)) return mixed
  }
  return '#ffffff'
}
