/*
 * Same-page anchor links. Sections below the pinned layers are laid out lazily
 * (content-visibility), so until they render the browser only knows a placeholder
 * height for them, and a smooth scroll aimed at a section further down stops short
 * on a slow phone. Before scrolling, the sections between here and the target are
 * laid out for real; once the scroll ends the position is checked and corrected.
 */

const LAZY = '.works, .tryon, .reasons, .services, .prices, .booking, .contacts'

function reduced() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* a menu that was just closed releases its scroll lock in an effect, a frame or two later */
function whenScrollable(run: () => void, frames = 30) {
  const locked = getComputedStyle(document.documentElement).overflowY === 'hidden'
  if (!locked || frames <= 0) run()
  else requestAnimationFrame(() => whenScrollable(run, frames - 1))
}

export function jumpTo(target: HTMLElement, smooth: boolean) {
  const root = document.documentElement
  const targetTop = target.getBoundingClientRect().top + scrollY
  const opened = [...document.querySelectorAll<HTMLElement>(LAZY)].filter((s) => s !== target && s.getBoundingClientRect().top + scrollY < targetTop)
  for (const s of opened) s.style.contentVisibility = 'visible'

  if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })

  whenScrollable(() => {
    const behavior: ScrollBehavior = smooth && !reduced() ? 'smooth' : 'instant'
    /* if the reader takes over the scroll, the jump must not pull the page back afterwards */
    let interrupted = false
    const interrupt = () => (interrupted = true)
    const inputs = ['wheel', 'touchstart', 'keydown'] as const
    for (const type of inputs) addEventListener(type, interrupt, { passive: true })
    target.scrollIntoView({ block: 'start', behavior })

    /* the scroll is over once the position holds for a few frames: a slow phone may need seconds for a long way */
    const start = scrollY
    let last = start
    let still = 0
    let frames = 0
    const watch = () => {
      frames++
      if (scrollY === last) still++
      else still = 0
      last = scrollY
      /* a smooth scroll can take a few frames to start, so stillness counts only after it has moved */
      const settled = still >= 6 && (scrollY !== start || frames > 30)
      if (!settled) return void requestAnimationFrame(watch)
      for (const type of inputs) removeEventListener(type, interrupt)
      const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
      if (!interrupted && Math.abs(target.getBoundingClientRect().top - pad) > 2) target.scrollIntoView({ block: 'start', behavior: 'instant' })
      for (const s of opened) s.style.contentVisibility = ''
    }
    requestAnimationFrame(watch)
  })
}

/** Takes over clicks on links to a section of this page; returns the cleanup. */
export function installJumps() {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href*="#"]')
    if (!link || link.target) return
    const url = new URL(link.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || url.hash.length < 2) return
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)))
    /* the skip link keeps the browser's own jump: it lands above every lazy section anyway */
    if (!target || target.id === 'main') return
    e.preventDefault()
    if (location.hash !== url.hash) history.pushState(null, '', url.hash)
    jumpTo(target, true)
  }
  document.addEventListener('click', onClick)

  /* a link from elsewhere, like the old /portfolio/ address, arrives with the section in the hash */
  const initial = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null
  if (initial && initial.id !== 'main') requestAnimationFrame(() => jumpTo(initial, false))

  return () => document.removeEventListener('click', onClick)
}
