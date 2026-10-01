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
    target.scrollIntoView({ block: 'start', behavior })
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      removeEventListener('scrollend', finish)
      const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
      if (Math.abs(target.getBoundingClientRect().top - pad) > 2) target.scrollIntoView({ block: 'start', behavior: 'instant' })
      for (const s of opened) s.style.contentVisibility = ''
    }
    if (behavior === 'smooth' && 'onscrollend' in window) {
      addEventListener('scrollend', finish)
      setTimeout(finish, 4000)
    } else requestAnimationFrame(() => requestAnimationFrame(finish))
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
