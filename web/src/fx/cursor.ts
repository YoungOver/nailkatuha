/*
 * The cursor is an emery board drawn as a native cursor image, so the system
 * moves it with zero lag (a DOM element chasing the pointer is always at least
 * a frame behind it). The board is painted in the chosen lacquer; over anything
 * clickable it shows a pinch of dust at the tip.
 */

export const CURSOR_SIZE = 44
const HOT = 4

function svg(hex: string, filing: boolean) {
  const dust = filing
    ? `<circle cx="11" cy="3" r="1.6" fill="#f3ede7"/><circle cx="3" cy="11" r="1.3" fill="${hex}"/><circle cx="12.5" cy="9" r="1" fill="${hex}"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="0 0 ${CURSOR_SIZE} ${CURSOR_SIZE}">
<g transform="translate(${HOT} ${HOT}) rotate(-45)">
<rect x="-4.6" y="-0.6" width="9.2" height="48.2" rx="4.6" fill="#0d0b10" opacity="0.55"/>
<rect x="-4" y="0" width="8" height="24" rx="4" fill="${hex}"/>
<rect x="-4" y="20" width="8" height="4" fill="${hex}"/>
<rect x="-4" y="23" width="8" height="24" rx="4" fill="#2b2430"/>
<rect x="-4" y="23" width="8" height="4" fill="#2b2430"/>
<rect x="-4" y="22.6" width="8" height="1.2" fill="#0d0b10" opacity="0.7"/>
<rect x="-2.6" y="2.5" width="1.4" height="42" rx="0.7" fill="#ffffff" opacity="0.35"/>
<rect x="-4" y="0" width="8" height="47" rx="4" fill="none" stroke="#f3ede7" stroke-opacity="0.85" stroke-width="0.8"/>
</g>${dust}</svg>`
}

/** CSS `cursor` value for the board in this lacquer; `filing` is the variant over clickable things. */
export function cursorCss(hex: string, filing: boolean) {
  const uri = encodeURIComponent(svg(hex, filing).replace(/\n/g, ''))
  return `url("data:image/svg+xml,${uri}") ${HOT} ${HOT}, ${filing ? 'pointer' : 'auto'}`
}

/** Applies both cursors for the lacquer; CSS picks them up through custom properties. */
export function applyCursor(hex: string) {
  const root = document.documentElement
  root.style.setProperty('--cursor', cursorCss(hex, false))
  root.style.setProperty('--cursor-file', cursorCss(hex, true))
}
