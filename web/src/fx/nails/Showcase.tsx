'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const NailShowcase = dynamic(() => import('./NailShowcase'), { ssr: false })

/*
 * three.js is the heaviest thing on the page, so it loads only after the
 * headline has finished its entrance and the browser is idle; until then a
 * soft lacquer glow holds the place and the tips fade in over it.
 */
export function Showcase() {
  const [start, setStart] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    /* wait for the headline to finish rising (~1.4 s), then load when the browser is idle */
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const t = window.setTimeout(() => {
      if (w.requestIdleCallback) w.requestIdleCallback(() => setStart(true), { timeout: 1000 })
      else setStart(true)
    }, 1400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="showcase" data-ready={ready || undefined} aria-hidden="true">
      <div className="showcase__glow" />
      {start && <NailShowcase onReady={() => setReady(true)} />}
    </div>
  )
}
