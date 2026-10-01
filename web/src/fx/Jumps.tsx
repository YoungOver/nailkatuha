'use client'

import { useEffect } from 'react'
import { installJumps } from './jump'

/** Mounts the same-page anchor handling once for the whole page. */
export function Jumps() {
  useEffect(() => installJumps(), [])
  return null
}
