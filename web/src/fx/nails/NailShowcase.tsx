'use client'

import { useEffect } from 'react'
import { useScene } from './useScene'

/* The hero set of five tips; the scene itself lives in the shared 3D host (worker). */
export default function NailShowcase({ onReady }: { onReady?: () => void }) {
  const { canvasRef, ready } = useScene('set')

  useEffect(() => {
    if (ready) onReady?.()
  }, [ready, onReady])

  return <canvas ref={canvasRef} className="showcase__canvas" />
}
